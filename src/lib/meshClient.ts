import { ChatMessage, Peer, WSClientMessage, WSServerMessage, MeshStats } from '../types';

/**
 * Meshnet WebSocket + BroadcastChannel real-time client controller
 */

type MessageCallback = (msg: ChatMessage) => void;
type PeersCallback = (peers: Peer[]) => void;
type StatsCallback = (stats: MeshStats) => void;
type MessageBurnedCallback = (messageId: string, roomId: string) => void;
type StatusCallback = (connected: boolean) => void;
type TypingCallback = (roomId: string, peerId: string, nick: string, isTyping: boolean) => void;

export class MeshClient {
  private ws: WebSocket | null = null;
  private peerId: string;
  private nick: string;
  private currentRoom: string;
  private isConnected = false;
  private reconnectTimer: number | null = null;
  private pingIntervalTimer: number | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  private onMessageListeners: Set<MessageCallback> = new Set();
  private onPeersListeners: Set<PeersCallback> = new Set();
  private onStatsListeners: Set<StatsCallback> = new Set();
  private onMessageBurnedListeners: Set<MessageBurnedCallback> = new Set();
  private onStatusListeners: Set<StatusCallback> = new Set();
  private onTypingListeners: Set<TypingCallback> = new Set();

  constructor(peerId: string, nick: string, initialRoom = '#disaster-relief') {
    this.peerId = peerId;
    this.nick = nick;
    this.currentRoom = initialRoom;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('meshnet_local_channel');
      this.broadcastChannel.onmessage = (event) => {
        this.handleBroadcastEvent(event.data);
      };
    }
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyStatus(true);

        // Join active room
        this.send({
          type: 'join',
          peerId: this.peerId,
          nick: this.nick,
          roomId: this.currentRoom,
        });

        // Start ping ping loop for real latency stats
        this.startPingLoop();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WSServerMessage = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (e) {
          console.error('Failed to parse WS server message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyStatus(false);
        this.stopPingLoop();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('Mesh WebSocket error:', err);
      };
    } catch (e) {
      console.error('WebSocket creation error:', e);
      this.scheduleReconnect();
    }
  }

  private startPingLoop() {
    this.stopPingLoop();
    this.pingIntervalTimer = window.setInterval(async () => {
      if (this.isConnected) {
        const latency = await this.pingServer();
        if (latency >= 0) {
          this.send({
            type: 'update_latency',
            peerId: this.peerId,
            latencyMs: latency,
          });
        }
      }
    }, 10000);
  }

  private stopPingLoop() {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  private notifyStatus(connected: boolean) {
    this.onStatusListeners.forEach((fn) => fn(connected));
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private send(msg: WSClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public setNick(newNick: string, publicKey?: string) {
    this.nick = newNick;
    this.send({
      type: 'announce_nick',
      peerId: this.peerId,
      nick: newNick,
      publicKey,
    });
  }

  public joinRoom(roomId: string) {
    this.currentRoom = roomId;
    this.send({
      type: 'join',
      peerId: this.peerId,
      nick: this.nick,
      roomId: roomId,
    });
  }

  public sendChatMessage(msg: ChatMessage) {
    this.send({
      type: 'chat',
      message: msg,
    });

    // Also broadcast locally across browser tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'local_chat',
        message: msg,
      });
    }
  }

  public sendTyping(roomId: string, isTyping: boolean) {
    this.send({
      type: 'typing',
      roomId,
      peerId: this.peerId,
      nick: this.nick,
      isTyping,
    });
  }

  public requestHistory(roomId: string) {
    this.send({
      type: 'get_history',
      roomId,
    });
  }

  public requestPeersRefresh() {
    this.send({
      type: 'get_peers',
    });
  }

  public pingServer(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      const onPong = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong' && data.timestamp === start) {
            if (this.ws) {
              this.ws.removeEventListener('message', onPong);
            }
            resolve(Date.now() - start);
          }
        } catch (e) {
          // ignore
        }
      };

      if (this.ws) {
        this.ws.addEventListener('message', onPong);
        this.send({ type: 'ping', peerId: this.peerId, timestamp: start });
      } else {
        resolve(-1);
      }
    });
  }

  private handleServerMessage(data: WSServerMessage) {
    switch (data.type) {
      case 'chat': {
        this.onMessageListeners.forEach((fn) => fn(data.message));
        break;
      }
      case 'history': {
        data.messages.forEach((msg) => {
          this.onMessageListeners.forEach((fn) => fn(msg));
        });
        break;
      }
      case 'peers_update': {
        this.onPeersListeners.forEach((fn) => fn(data.peers));
        break;
      }
      case 'init': {
        this.onPeersListeners.forEach((fn) => fn(data.peers));
        this.onStatsListeners.forEach((fn) => fn(data.stats));
        break;
      }
      case 'message_burned': {
        this.onMessageBurnedListeners.forEach((fn) => fn(data.messageId, data.roomId));
        break;
      }
      case 'user_typing': {
        this.onTypingListeners.forEach((fn) => fn(data.roomId, data.peerId, data.nick, data.isTyping));
        break;
      }
      case 'peer_nick_changed': {
        // Handled via peers_update
        break;
      }
    }
  }

  private handleBroadcastEvent(data: { type: string; message?: ChatMessage }) {
    if (data && data.type === 'local_chat' && data.message) {
      // Sync chat message to local client listeners
      this.onMessageListeners.forEach((fn) => fn(data.message!));
    }
  }

  public onMessage(callback: MessageCallback) {
    this.onMessageListeners.add(callback);
    return () => this.onMessageListeners.delete(callback);
  }

  public onPeers(callback: PeersCallback) {
    this.onPeersListeners.add(callback);
    return () => this.onPeersListeners.delete(callback);
  }

  public onStats(callback: StatsCallback) {
    this.onStatsListeners.add(callback);
    return () => this.onStatsListeners.delete(callback);
  }

  public onMessageBurned(callback: MessageBurnedCallback) {
    this.onMessageBurnedListeners.add(callback);
    return () => this.onMessageBurnedListeners.delete(callback);
  }

  public onStatus(callback: StatusCallback) {
    this.onStatusListeners.add(callback);
    return () => this.onStatusListeners.delete(callback);
  }

  public onTyping(callback: TypingCallback) {
    this.onTypingListeners.add(callback);
    return () => this.onTypingListeners.delete(callback);
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }
}
