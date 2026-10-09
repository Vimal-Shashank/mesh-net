import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

interface PeerNode {
  id: string;
  nick: string;
  ws: WebSocket;
  ip: string;
  lastSeen: number;
  currentRoom: string;
  publicKey?: string;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderNick: string;
  content: string;
  isEncrypted: boolean;
  encryptedPayload?: {
    ciphertext: string;
    iv: string;
    salt: string;
    algo: string;
  };
  timestamp: number;
  expiresAt?: number;
  timerSeconds: number;
  isDirectMessage?: boolean;
  recipientId?: string;
  recipientNick?: string;
  isSystemMessage?: boolean;
  systemType?: string;
}

const PORT = 3000;
const LOG_FILE_PATH = path.join(process.cwd(), 'logs.json');

const peersMap = new Map<string, PeerNode>();
const roomMessagesMap = new Map<string, ChatMessage[]>();
const activeRooms = new Set<string>(['#disaster-relief', '#emergency', '#general', '#dev-mesh']);

let totalMessagesProcessed = 0;
const serverStartTime = Date.now();

// Rate Limiter implementation for AI requests & app protection
class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private hits: Map<string, number[]>;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();
  }

  public check(key: string): { allowed: boolean; remaining: number; retryAfterSec: number } {
    const now = Date.now();
    const timestamps = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const retryAfterSec = Math.ceil((this.windowMs - (now - oldest)) / 1000);
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    timestamps.push(now);
    this.hits.set(key, timestamps);
    return { allowed: true, remaining: this.maxRequests - timestamps.length, retryAfterSec: 0 };
  }
}

// Global Limiter Instances
const aiRateLimiter = new RateLimiter(60000, 6); // Max 6 AI calls per minute
const appRateLimiter = new RateLimiter(60000, 100); // Max 100 HTTP requests per minute
const wsRateLimiter = new RateLimiter(5000, 15); // Max 15 WS actions per 5 seconds

// Lazy Gemini AI initialization
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAiClient && process.env.GEMINI_API_KEY) {
    genAiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

// Load offline logs from disk if available
function loadOfflineLogs() {
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      const data = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.keys(parsed).forEach((roomId) => {
          roomMessagesMap.set(roomId, parsed[roomId] || []);
        });
      }
    }
  } catch (err) {
    console.warn('Could not load offline logs:', err);
  }
}

// Append message to offline disk log
function saveMessageToLog(msg: ChatMessage) {
  try {
    if (msg.isSystemMessage) return; // don't persist transient system alerts
    const roomList = roomMessagesMap.get(msg.roomId) || [];
    roomList.push(msg);
    // Keep max 200 recent messages per room
    if (roomList.length > 200) {
      roomList.shift();
    }
    roomMessagesMap.set(msg.roomId, roomList);

    // Save snapshot to disk asynchronously
    const logObj: Record<string, ChatMessage[]> = {};
    roomMessagesMap.forEach((msgs, roomId) => {
      // Filter out expired messages before saving
      logObj[roomId] = msgs.filter((m) => !m.expiresAt || m.expiresAt > Date.now());
    });
    fs.writeFile(LOG_FILE_PATH, JSON.stringify(logObj, null, 2), () => {});
  } catch (err) {
    console.warn('Failed to save log to disk:', err);
  }
}

async function startServer() {
  loadOfflineLogs();

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // App Protection: Global API Rate Limiter
  app.use('/api', (req, res, next) => {
    const clientKey = req.ip || req.socket.remoteAddress || 'global-client';
    const check = appRateLimiter.check(clientKey);
    if (!check.allowed) {
      res.setHeader('Retry-After', check.retryAfterSec);
      res.status(429).json({
        error: `Rate limit exceeded. App protection active. Please try again in ${check.retryAfterSec} seconds.`,
      });
      return;
    }
    next();
  });

  // Health and stats API
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/mesh/stats', (_req, res) => {
    res.json({
      totalPeers: peersMap.size,
      onlinePeers: Array.from(peersMap.values()).filter((p) => p.ws.readyState === WebSocket.OPEN).length,
      activeRooms: activeRooms.size,
      messagesProcessed: totalMessagesProcessed,
      uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    });
  });

  // AI Assistance Endpoints
  app.post('/api/ai/ask', async (req, res) => {
    try {
      const { prompt, context, room } = req.body || {};
      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      // Check AI Rate Limit
      const clientKey = (req.body?.peerId || req.ip || req.socket.remoteAddress || 'ai-caller').toString();
      const aiCheck = aiRateLimiter.check(clientKey);
      if (!aiCheck.allowed) {
        res.setHeader('Retry-After', aiCheck.retryAfterSec);
        res.status(429).json({
          error: `AI Rate limit reached (Max 6 requests/min). Please wait ${aiCheck.retryAfterSec}s before asking AI again.`,
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({ error: 'Gemini AI key not configured on server.' });
        return;
      }

      const roomMsgs = roomMessagesMap.get(room || '#general') || [];
      const recentHistory = roomMsgs
        .slice(-10)
        .map((m) => `${m.senderNick}: ${m.content}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `You are an AI assistant built into an emergency decentralized mesh chat application named MeshNet.
Keep your answers brief, helpful, concise, and formatted clearly.

Current Room History:
${recentHistory || 'No prior messages.'}

User Question: ${prompt}`,
      });

      res.json({ text: response.text || 'No response generated.' });
    } catch (err: any) {
      console.error('AI ask error:', err);
      res.status(500).json({ error: err?.message || 'AI processing failed.' });
    }
  });

  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { roomId } = req.body || {};
      const msgs = roomMessagesMap.get(roomId || '#general') || [];
      if (msgs.length === 0) {
        res.json({ summary: 'No messages found in this channel to summarize.' });
        return;
      }

      // Check AI Rate Limit
      const clientKey = (req.body?.peerId || req.ip || req.socket.remoteAddress || 'ai-caller').toString();
      const aiCheck = aiRateLimiter.check(clientKey);
      if (!aiCheck.allowed) {
        res.setHeader('Retry-After', aiCheck.retryAfterSec);
        res.status(429).json({
          error: `AI Rate limit reached (Max 6 requests/min). Please wait ${aiCheck.retryAfterSec}s.`,
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({ error: 'Gemini AI key not configured on server.' });
        return;
      }

      const conversationText = msgs
        .slice(-30)
        .map((m) => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.senderNick}: ${m.content}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Summarize this mesh chat transcript in 2 to 3 concise bullet points:\n\n${conversationText}`,
      });

      res.json({ summary: response.text || 'Unable to generate summary.' });
    } catch (err: any) {
      console.error('AI summarize error:', err);
      res.status(500).json({ error: err?.message || 'Summarization failed.' });
    }
  });

  app.post('/api/ai/translate', async (req, res) => {
    try {
      const { text, targetLang = 'English' } = req.body || {};
      if (!text) {
        res.status(400).json({ error: 'Text required' });
        return;
      }

      // Check AI Rate Limit
      const clientKey = (req.body?.peerId || req.ip || req.socket.remoteAddress || 'ai-caller').toString();
      const aiCheck = aiRateLimiter.check(clientKey);
      if (!aiCheck.allowed) {
        res.setHeader('Retry-After', aiCheck.retryAfterSec);
        res.status(429).json({
          error: `AI Rate limit reached (Max 6 requests/min). Please wait ${aiCheck.retryAfterSec}s.`,
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({ error: 'Gemini AI key not configured on server.' });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Translate the following text into ${targetLang}. Return ONLY the translated text without extra comments or quotes:\n\n${text}`,
      });

      res.json({ translation: response.text?.trim() || text });
    } catch (err: any) {
      console.error('AI translate error:', err);
      res.status(500).json({ error: err?.message || 'Translation failed.' });
    }
  });

  // Periodically check and burn expired disappearing messages, and broadcast peer state updates
  setInterval(() => {
    const now = Date.now();
    roomMessagesMap.forEach((messages, roomId) => {
      const expiredMsgs = messages.filter((m) => m.expiresAt && m.expiresAt <= now);
      if (expiredMsgs.length > 0) {
        // Remove expired from server memory
        roomMessagesMap.set(
          roomId,
          messages.filter((m) => !m.expiresAt || m.expiresAt > now)
        );

        // Broadcast burn event to all connected peers
        expiredMsgs.forEach((expired) => {
          broadcastToAll({
            type: 'message_burned',
            messageId: expired.id,
            roomId: expired.roomId,
          });
        });
      }
    });

    // Regular periodic broadcast of peer statuses (online vs offline)
    broadcastPeersUpdate();
  }, 3000);

  // Send message helper to a single peer
  function sendToPeer(ws: WebSocket, payload: unknown) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  // Broadcast to all active connected peers
  function broadcastToAll(payload: unknown) {
    const data = JSON.stringify(payload);
    peersMap.forEach((peer) => {
      if (peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(data);
      }
    });
  }

  // Broadcast peer list update
  function broadcastPeersUpdate() {
    const peerList = Array.from(peersMap.values()).map((p) => ({
      id: p.id,
      nick: p.nick,
      ip: p.ip,
      lastSeen: p.lastSeen,
      isOnline: p.ws.readyState === WebSocket.OPEN,
      latencyMs: (p as any).latencyMs || 15,
      publicKey: p.publicKey,
    }));

    broadcastToAll({
      type: 'peers_update',
      peers: peerList,
    });
  }

  // WebSocket Connection Handler
  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    let currentPeerId = '';

    ws.on('message', (rawData) => {
      try {
        const data = JSON.parse(rawData.toString());

        // App Protection: WebSocket Rate Limiting (exclude ping/pong)
        if (data.type !== 'ping') {
          const clientKey = currentPeerId || clientIp;
          const wsCheck = wsRateLimiter.check(clientKey);
          if (!wsCheck.allowed) {
            const systemLimitMsg: ChatMessage = {
              id: 'sys-ratelimit-' + Date.now(),
              roomId: data.roomId || data.message?.roomId || '#general',
              senderId: 'system-gateway',
              senderNick: 'System Security',
              content: `⚠️ Rate limit exceeded (15 actions / 5s). Action throttled. Please wait ${wsCheck.retryAfterSec}s.`,
              isEncrypted: false,
              timestamp: Date.now(),
              timerSeconds: 0,
              isSystemMessage: true,
              systemType: 'security',
            };
            sendToPeer(ws, { type: 'chat', message: systemLimitMsg });
            return;
          }
        }

        switch (data.type) {
          case 'join': {
            const { peerId, nick, roomId } = data;
            currentPeerId = peerId;

            let peerNode = peersMap.get(peerId);
            if (!peerNode) {
              peerNode = {
                id: peerId,
                nick: nick || peerId,
                ws,
                ip: clientIp,
                lastSeen: Date.now(),
                currentRoom: roomId || '#disaster-relief',
              };
              peersMap.set(peerId, peerNode);
            } else {
              peerNode.ws = ws;
              peerNode.nick = nick || peerNode.nick;
              peerNode.currentRoom = roomId || peerNode.currentRoom;
              peerNode.lastSeen = Date.now();
            }

            if (roomId) {
              activeRooms.add(roomId);
            }

            // Send init packet back to joining peer
            const peerList = Array.from(peersMap.values()).map((p) => ({
              id: p.id,
              nick: p.nick,
              ip: p.ip,
              lastSeen: p.lastSeen,
              isOnline: p.ws.readyState === WebSocket.OPEN,
              publicKey: p.publicKey,
            }));

            sendToPeer(ws, {
              type: 'init',
              peerId,
              peers: peerList,
              rooms: Array.from(activeRooms),
              stats: {
                totalPeers: peersMap.size,
                onlinePeers: peerList.filter((p) => p.isOnline).length,
                activeRooms: activeRooms.size,
                messagesProcessed: totalMessagesProcessed,
                nodePeerId: 'meshnet-gateway-node',
                uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
              },
            });

            // Send room history
            const history = (roomMessagesMap.get(roomId) || []).filter(
              (m) => !m.expiresAt || m.expiresAt > Date.now()
            );
            sendToPeer(ws, {
              type: 'history',
              roomId,
              messages: history,
            });

            // Broadcast peer update to everyone
            broadcastPeersUpdate();
            break;
          }

          case 'typing': {
            const { roomId, peerId, nick, isTyping } = data;
            broadcastToAll({
              type: 'user_typing',
              roomId,
              peerId,
              nick,
              isTyping,
            });
            break;
          }

          case 'update_latency': {
            const { peerId, latencyMs } = data;
            const peerNode = peersMap.get(peerId);
            if (peerNode) {
              (peerNode as any).latencyMs = latencyMs;
              broadcastPeersUpdate();
            }
            break;
          }

          case 'announce_nick': {
            const { peerId, nick, publicKey } = data;
            const peerNode = peersMap.get(peerId);
            if (peerNode) {
              const oldNick = peerNode.nick;
              peerNode.nick = nick;
              if (publicKey) peerNode.publicKey = publicKey;
              peerNode.lastSeen = Date.now();

              broadcastToAll({
                type: 'peer_nick_changed',
                peerId,
                oldNick,
                newNick: nick,
              });
              broadcastPeersUpdate();
            }
            break;
          }

          case 'chat': {
            const { message } = data as { message: ChatMessage };
            if (!message || !message.roomId) return;

            totalMessagesProcessed++;

            // Handle disappearing message expiration calculation
            if (message.timerSeconds && message.timerSeconds > 0) {
              message.expiresAt = Date.now() + message.timerSeconds * 1000;
            }

            // Save to persistent offline log buffer
            saveMessageToLog(message);

            // Broadcast to destination
            if (message.isDirectMessage && message.recipientId) {
              // Direct message: send to sender & recipient
              peersMap.forEach((peer) => {
                if (peer.id === message.senderId || peer.id === message.recipientId) {
                  sendToPeer(peer.ws, {
                    type: 'chat',
                    message,
                  });
                }
              });
            } else {
              // Room broadcast
              broadcastToAll({
                type: 'chat',
                message,
              });
            }

            // Check if user is asking AI (@ai or /ai)
            const textContent = message.content || '';
            const isAiMention = textContent.toLowerCase().includes('@ai') || textContent.toLowerCase().startsWith('/ai ');
            if (isAiMention && !message.isEncrypted) {
              const query = textContent.replace(/\/ai/i, '').replace(/@ai/i, '').trim();
              if (query) {
                // Check AI Rate Limiter for WebSocket triggers
                const aiCheck = aiRateLimiter.check(message.senderId || clientIp);
                if (!aiCheck.allowed) {
                  const aiRateLimitMsg: ChatMessage = {
                    id: 'ai-ratelimit-' + Date.now(),
                    roomId: message.roomId,
                    senderId: 'gemini-ai-assistant',
                    senderNick: 'AI Assistant',
                    content: `⚠️ AI Rate limit reached for @${message.senderNick} (Max 6 AI requests/min). Please wait ${aiCheck.retryAfterSec}s.`,
                    isEncrypted: false,
                    timestamp: Date.now(),
                    timerSeconds: 0,
                    isSystemMessage: true,
                    systemType: 'security',
                  };
                  saveMessageToLog(aiRateLimitMsg);
                  broadcastToAll({
                    type: 'chat',
                    message: aiRateLimitMsg,
                  });
                  return;
                }

                setTimeout(async () => {
                  try {
                    const ai = getGeminiClient();
                    let aiReplyText = 'AI Assistant is listening. How can I assist with your mesh communications?';
                    if (ai) {
                      const response = await ai.models.generateContent({
                        model: 'gemini-3.6-flash',
                        contents: `You are Gemini AI Assistant inside a peer-to-peer mesh chat application.
Answer succinctly, clearly, and concisely in 1 to 3 sentences:
User Question: ${query}`,
                      });
                      aiReplyText = response.text || aiReplyText;
                    }

                    const aiMsg: ChatMessage = {
                      id: 'ai-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                      roomId: message.roomId,
                      senderId: 'gemini-ai-assistant',
                      senderNick: 'AI Assistant',
                      content: aiReplyText,
                      isEncrypted: false,
                      timestamp: Date.now(),
                      timerSeconds: 0,
                    };

                    saveMessageToLog(aiMsg);
                    broadcastToAll({
                      type: 'chat',
                      message: aiMsg,
                    });
                  } catch (err) {
                    console.error('Error generating AI chat reply:', err);
                  }
                }, 400);
              }
            }
            break;
          }

          case 'get_history': {
            const { roomId } = data;
            const history = (roomMessagesMap.get(roomId) || []).filter(
              (m) => !m.expiresAt || m.expiresAt > Date.now()
            );
            sendToPeer(ws, {
              type: 'history',
              roomId,
              messages: history,
            });
            break;
          }

          case 'get_peers': {
            broadcastPeersUpdate();
            break;
          }

          case 'ping': {
            sendToPeer(ws, {
              type: 'pong',
              timestamp: data.timestamp,
              serverTime: Date.now(),
            });
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    });

    ws.on('close', () => {
      if (currentPeerId) {
        const peer = peersMap.get(currentPeerId);
        if (peer) {
          peer.lastSeen = Date.now();
        }
        broadcastPeersUpdate();
      }
    });
  });

  // Vite development middleware OR static production server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`meshnet p2p chat server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
