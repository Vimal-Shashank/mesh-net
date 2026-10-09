import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ChatMessage,
  Peer,
  UIMode,
  DisappearingTimer,
  MeshStats,
  TerminalPalette,
  ThemeMode,
} from './types';
import { PALETTES, getPaletteTheme } from './lib/theme';
import {
  generatePeerId,
  encryptText,
  decryptText,
  generateECDHKeyPair,
  exportPublicKey,
  getFingerprint,
} from './lib/crypto';
import { playReceiveSound, playErrorSound, playBurnSound, toggleSound } from './lib/sound';
import { MeshClient } from './lib/meshClient';
import { HeaderBar } from './components/HeaderBar';
import { PeerSidebar } from './components/PeerSidebar';
import { ChatPane } from './components/ChatPane';
import { InputBar } from './components/InputBar';
import { HelpModal } from './components/HelpModal';
import { KeysModal } from './components/KeysModal';
import { RoomModal } from './components/RoomModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { BluetoothModal } from './components/BluetoothModal';
import { BluetoothMeshManager, BluetoothDeviceInfo } from './lib/bluetooth';
import { QRCodeModal } from './components/QRCodeModal';
import { MobileBottomNav } from './components/MobileBottomNav';

export default function App() {
  // Core Node Identity State
  const [peerId] = useState<string>(() => {
    const saved = localStorage.getItem('meshnet_peer_id');
    if (saved) return saved;
    const newId = generatePeerId();
    localStorage.setItem('meshnet_peer_id', newId);
    return newId;
  });

  const [nick, setNick] = useState<string>(() => {
    const saved = localStorage.getItem('meshnet_nick');
    if (saved) return saved;
    const defaultNicks = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace'];
    const randomNick = defaultNicks[Math.floor(Math.random() * defaultNicks.length)];
    localStorage.setItem('meshnet_nick', randomNick);
    return randomNick;
  });

  // Crypto Identity
  const [fingerprint, setFingerprint] = useState<string>('');
  const [publicKeyBase64, setPublicKeyBase64] = useState<string>('');

  // Active Navigation & Rooms
  const [currentRoom, setCurrentRoom] = useState<string>('#disaster-relief');
  const [activeRooms, setActiveRooms] = useState<string[]>([
    '#disaster-relief',
    '#emergency',
    '#general',
    '#dev-mesh',
  ]);

  // Encryption Passwords Map per Room
  const [roomPasswords, setRoomPasswords] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('meshnet_room_passwords');
    return saved ? JSON.parse(saved) : {};
  });

  // Disappearing Message Timers Map per Room
  const [roomTimers, setRoomTimers] = useState<Record<string, DisappearingTimer>>(() => {
    const saved = localStorage.getItem('meshnet_room_timers');
    return saved ? JSON.parse(saved) : { '#disaster-relief': 30 };
  });

  // Chat Messages State per Room
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});

  // Peers & Mesh Network State
  const [peers, setPeers] = useState<Peer[]>([]);
  const [stats, setStats] = useState<MeshStats | null>(null);

  // Real-time Typing State: { roomId: { peerId: nick } }
  const [typingMap, setTypingMap] = useState<Record<string, Record<string, string>>>({});

  // UI Modes & Terminal Color Palette
  const [uiMode, setUiMode] = useState<UIMode>('terminal');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('meshnet_theme_mode');
    return (saved as ThemeMode) || 'dark';
  });
  const [palette, setPalette] = useState<TerminalPalette>(() => {
    const saved = localStorage.getItem('meshnet_palette');
    return (saved as TerminalPalette) || 'emerald';
  });
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);

  // Fullscreen state and handler
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false;
  });

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem('meshnet_theme_mode', mode);
  };

  // Sync body theme class
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (themeMode === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    }
  }, [themeMode]);

  // Modals
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isKeysOpen, setIsKeysOpen] = useState(false);
  const [keysModalTab, setKeysModalTab] = useState<'key' | 'qr' | 'profile'>('key');
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);
  const [isBluetoothOpen, setIsBluetoothOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [bleDevice, setBleDevice] = useState<BluetoothDeviceInfo | null>(null);

  const openKeysModal = (tab: 'key' | 'qr' | 'profile' = 'key') => {
    setKeysModalTab(tab);
    setIsKeysOpen(true);
  };

  // Mesh Client Controller Reference
  const clientRef = useRef<MeshClient | null>(null);

  const handleSetPalette = (p: TerminalPalette) => {
    setPalette(p);
    localStorage.setItem('meshnet_palette', p);
  };

  // Initialize Web Crypto Keys
  useEffect(() => {
    async function initKeys() {
      try {
        const keyPair = await generateECDHKeyPair();
        const pubKeyStr = await exportPublicKey(keyPair.publicKey);
        const fp = await getFingerprint(pubKeyStr);
        setPublicKeyBase64(pubKeyStr);
        setFingerprint(fp);
      } catch (err) {
        console.warn('Failed to generate crypto keypair:', err);
      }
    }
    initKeys();

    // Check for QR Code URL invite parameter e.g. ?room=%23emergency
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteRoom = urlParams.get('room');
      if (inviteRoom) {
        const targetRoom = inviteRoom.startsWith('#') || inviteRoom.startsWith('dm:') ? inviteRoom : `#${inviteRoom}`;
        setCurrentRoom(targetRoom);
        setActiveRooms((prev) => (prev.includes(targetRoom) ? prev : [...prev, targetRoom]));
      }
    }
  }, []);

  // Update nickname handler
  const handleUpdateNick = (newNick: string) => {
    const oldNick = nick;
    setNick(newNick);
    localStorage.setItem('meshnet_nick', newNick);
    if (clientRef.current) {
      clientRef.current.setNick(newNick, publicKeyBase64);
    }
    appendSystemMessage(currentRoom, `Handle updated from @${oldNick} to @${newNick}.`);
  };

  // Save room passwords to localStorage
  const setRoomPassword = (roomId: string, pass: string) => {
    const updated = { ...roomPasswords, [roomId]: pass };
    setRoomPasswords(updated);
    localStorage.setItem('meshnet_room_passwords', JSON.stringify(updated));

    // Append system message
    appendSystemMessage(roomId, `Room ${roomId} is now AES-256 encrypted with your key.`);
  };

  const clearRoomPassword = (roomId: string) => {
    const updated = { ...roomPasswords };
    delete updated[roomId];
    setRoomPasswords(updated);
    localStorage.setItem('meshnet_room_passwords', JSON.stringify(updated));

    appendSystemMessage(roomId, `Key cleared for room ${roomId}. Room is now unencrypted.`);
  };

  // Save room timers to localStorage
  const setRoomTimer = (roomId: string, seconds: DisappearingTimer) => {
    const updated = { ...roomTimers, [roomId]: seconds };
    setRoomTimers(updated);
    localStorage.setItem('meshnet_room_timers', JSON.stringify(updated));

    appendSystemMessage(
      roomId,
      seconds > 0
        ? `Disappearing message timer set to ${seconds}s for ${roomId}.`
        : `Disappearing message timer disabled for ${roomId}.`
    );
  };

  // Append a local system message
  const appendSystemMessage = useCallback((roomId: string, text: string) => {
    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      roomId,
      senderId: 'system',
      senderNick: 'system',
      content: text,
      isEncrypted: false,
      timestamp: Date.now(),
      timerSeconds: 0,
      isSystemMessage: true,
    };

    setMessagesMap((prev) => {
      const existing = prev[roomId] || [];
      return { ...prev, [roomId]: [...existing, sysMsg] };
    });
  }, []);

  // Handle incoming or sent Chat Messages (decrypting if password present)
  const processChatMessage = useCallback(
    async (msg: ChatMessage) => {
      let displayContent = msg.content;

      // Decrypt if message is encrypted and we have password for room
      if (msg.isEncrypted && msg.encryptedPayload) {
        const pass = roomPasswords[msg.roomId];
        if (pass) {
          try {
            displayContent = await decryptText(msg.encryptedPayload, pass);
          } catch (e) {
            displayContent = ''; // Left blank to show Encrypted Payload card
          }
        } else {
          displayContent = ''; // No password entered yet
        }
      }

      const processed: ChatMessage = {
        ...msg,
        content: displayContent,
      };

      setMessagesMap((prev) => {
        const existing = prev[msg.roomId] || [];
        // Deduplicate
        if (existing.some((m) => m.id === processed.id)) {
          return prev;
        }
        return {
          ...prev,
          [msg.roomId]: [...existing, processed],
        };
      });

      if (msg.senderId !== peerId) {
        playReceiveSound();
      }
    },
    [peerId, roomPasswords]
  );

  // Sync Bluetooth Mesh Transceiver state & incoming BLE/P2P packets
  useEffect(() => {
    const bleManager = BluetoothMeshManager.getInstance();
    const unsubStatus = bleManager.onStatusChange((info) => {
      setBleDevice(info);
    });

    const unsubMsg = bleManager.onMessage((msg) => {
      processChatMessage(msg);
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [processChatMessage]);

  // Initialize Mesh Client
  useEffect(() => {
    const client = new MeshClient(peerId, nick, currentRoom);
    clientRef.current = client;

    client.onMessage((msg) => {
      processChatMessage(msg);
    });

    client.onPeers((updatedPeers) => {
      setPeers(updatedPeers);
    });

    client.onStats((updatedStats) => {
      setStats(updatedStats);
    });

    client.onMessageBurned((messageId, roomId) => {
      playBurnSound();
      setMessagesMap((prev) => {
        const roomMsgs = prev[roomId] || [];
        return {
          ...prev,
          [roomId]: roomMsgs.filter((m) => m.id !== messageId),
        };
      });
    });

    client.onTyping((rId, pId, pNick, isTyping) => {
      if (pId === peerId) return;
      setTypingMap((prev) => {
        const roomObj = { ...(prev[rId] || {}) };
        if (isTyping) {
          roomObj[pId] = pNick;
        } else {
          delete roomObj[pId];
        }
        return { ...prev, [rId]: roomObj };
      });
    });

    client.connect();

    // Auto-refresh peers periodically every 4 seconds to maintain fresh online/offline status
    const autoRefreshTimer = setInterval(() => {
      client.requestPeersRefresh();
    }, 4000);

    return () => {
      clearInterval(autoRefreshTimer);
      client.disconnect();
    };
  }, [peerId]); // Run once on load

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+L, Ctrl+J, Ctrl+B, Ctrl+T, Ctrl+M, Ctrl+?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'k') {
          e.preventDefault();
          setIsKeysOpen((prev) => !prev);
        } else if (key === 'l') {
          e.preventDefault();
          setMessagesMap((prev) => ({ ...prev, [currentRoom]: [] }));
        } else if (key === 'j') {
          e.preventDefault();
          setIsRoomsOpen((prev) => !prev);
        } else if (key === 'b') {
          e.preventDefault();
          const nextTimers: DisappearingTimer[] = [0, 10, 30, 60, 300];
          const currentTimer = roomTimers[currentRoom] || 0;
          const currentIdx = nextTimers.indexOf(currentTimer);
          const nextTimer = nextTimers[(currentIdx + 1) % nextTimers.length];
          setRoomTimer(currentRoom, nextTimer);
        } else if (key === 't') {
          e.preventDefault();
          const palettesList: TerminalPalette[] = ['emerald', 'amber', 'cyberpunk', 'monochrome', 'solarized'];
          const curIdx = palettesList.indexOf(palette);
          const nextP = palettesList[(curIdx + 1) % palettesList.length];
          handleSetPalette(nextP);
        } else if (key === 'm') {
          e.preventDefault();
          setUiMode((prev) => (prev === 'terminal' ? 'modern' : 'terminal'));
        } else if (key === 'd') {
          e.preventDefault();
          handleSetThemeMode(themeMode === 'dark' ? 'light' : 'dark');
        }
      } else if (e.key === '?' && !isInputFocused) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRoom, palette, roomTimers, themeMode]);

  // Re-attempt decryption when room passwords change
  useEffect(() => {
    Object.keys(roomPasswords).forEach((roomId) => {
      const pass = roomPasswords[roomId];
      if (!pass) return;

      setMessagesMap((prev) => {
        const msgs = prev[roomId] || [];
        let updated = false;

        const newMsgs = msgs.map((msg) => {
          if (msg.isEncrypted && msg.encryptedPayload && !msg.content) {
            decryptText(msg.encryptedPayload, pass)
              .then((decrypted) => {
                setMessagesMap((currentMap) => {
                  const currentRoomMsgs = currentMap[roomId] || [];
                  return {
                    ...currentMap,
                    [roomId]: currentRoomMsgs.map((m) =>
                      m.id === msg.id ? { ...m, content: decrypted } : m
                    ),
                  };
                });
              })
              .catch(() => {});
          }
          return msg;
        });

        return updated ? { ...prev, [roomId]: newMsgs } : prev;
      });
    });
  }, [roomPasswords]);

  // Handle Slash Commands or Plain Text sending
  const handleSendMessage = async (rawInput: string) => {
    if (!rawInput) return;

    // Handle Slash Commands
    if (rawInput.startsWith('/')) {
      const parts = rawInput.trim().split(' ');
      const cmd = parts[0].toLowerCase();

      switch (cmd) {
        case '/join': {
          let roomName = parts[1];
          if (!roomName) {
            appendSystemMessage(currentRoom, 'Usage: /join <room> [password]');
            playErrorSound();
            return;
          }
          if (!roomName.startsWith('#')) {
            roomName = `#${roomName}`;
          }
          const pass = parts[2];
          if (pass) {
            setRoomPassword(roomName, pass);
          }

          setCurrentRoom(roomName);
          setActiveRooms((prev) => (prev.includes(roomName) ? prev : [...prev, roomName]));
          if (clientRef.current) {
            clientRef.current.joinRoom(roomName);
          }
          appendSystemMessage(roomName, `Joined room ${roomName}.`);
          return;
        }

        case '/nick': {
          const newNick = parts[1];
          if (!newNick) {
            appendSystemMessage(currentRoom, 'Usage: /nick <new_name>');
            playErrorSound();
            return;
          }
          const oldNick = nick;
          setNick(newNick);
          localStorage.setItem('meshnet_nick', newNick);
          if (clientRef.current) {
            clientRef.current.setNick(newNick, publicKeyBase64);
          }
          appendSystemMessage(currentRoom, `Nickname changed from ${oldNick} to ${newNick}.`);
          return;
        }

        case '/msg': {
          const targetNick = parts[1];
          const dmText = parts.slice(2).join(' ');
          if (!targetNick || !dmText) {
            appendSystemMessage(currentRoom, 'Usage: /msg <nick> <text>');
            playErrorSound();
            return;
          }

          const targetPeer = peers.find(
            (p) => p.nick.toLowerCase() === targetNick.toLowerCase()
          );

          const dmRoomId = `dm:${[peerId, targetPeer?.id || targetNick].sort().join('-')}`;
          setCurrentRoom(dmRoomId);

          const newMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            roomId: dmRoomId,
            senderId: peerId,
            senderNick: nick,
            content: dmText,
            isEncrypted: false,
            timestamp: Date.now(),
            timerSeconds: roomTimers[currentRoom] || 0,
            isDirectMessage: true,
            recipientId: targetPeer?.id,
            recipientNick: targetNick,
          };

          if (clientRef.current) {
            clientRef.current.sendChatMessage(newMsg);
          }
          processChatMessage(newMsg);
          return;
        }

        case '/timer': {
          const secArg = parts[1];
          if (!secArg) {
            appendSystemMessage(currentRoom, 'Usage: /timer <seconds|off> (e.g. /timer 30)');
            playErrorSound();
            return;
          }
          const num = secArg.toLowerCase() === 'off' ? 0 : parseInt(secArg, 10);
          if (isNaN(num)) {
            appendSystemMessage(currentRoom, 'Invalid timer value. Use /timer 30 or /timer off');
            playErrorSound();
            return;
          }
          setRoomTimer(currentRoom, num as DisappearingTimer);
          return;
        }

        case '/who': {
          const onlineList = peers.map((p) => `• ${p.nick} (${p.id})`).join('\n');
          appendSystemMessage(
            currentRoom,
            `Known Mesh Peers (${peers.length}):\n${onlineList || 'No other peers discovered.'}`
          );
          return;
        }

        case '/clear': {
          setMessagesMap((prev) => ({ ...prev, [currentRoom]: [] }));
          return;
        }

        case '/key': {
          const pass = parts.slice(1).join(' ');
          if (!pass) {
            appendSystemMessage(currentRoom, 'Usage: /key <passphrase> (or /key clear)');
            playErrorSound();
            return;
          }
          if (pass.toLowerCase() === 'clear') {
            clearRoomPassword(currentRoom);
            appendSystemMessage(currentRoom, `Cleared encryption key for ${currentRoom}.`);
          } else {
            setRoomPassword(currentRoom, pass);
            appendSystemMessage(currentRoom, `AES-256 room encryption key active for ${currentRoom}.`);
          }
          return;
        }

        case '/keys': {
          openKeysModal('key');
          return;
        }

        case '/ble':
        case '/bluetooth': {
          setIsBluetoothOpen(true);
          return;
        }

        case '/qr':
        case '/scan':
        case '/invite':
        case '/link': {
          setIsQROpen(true);
          return;
        }

        case '/ai': {
          const aiQuery = parts.slice(1).join(' ');
          if (!aiQuery) {
            appendSystemMessage(currentRoom, 'Usage: /ai <your question>');
            return;
          }
          appendSystemMessage(currentRoom, `Asking Gemini AI: "${aiQuery}"...`);
          try {
            const res = await fetch('/api/ai/ask', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: aiQuery, room: currentRoom }),
            });
            const data = await res.json();
            if (data.text) {
              const aiMsg: ChatMessage = {
                id: 'ai-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                roomId: currentRoom,
                senderId: 'gemini-ai-assistant',
                senderNick: 'AI Assistant',
                content: data.text,
                isEncrypted: false,
                timestamp: Date.now(),
                timerSeconds: 0,
              };
              processChatMessage(aiMsg);
            } else if (data.error) {
              appendSystemMessage(currentRoom, `AI Error: ${data.error}`);
            }
          } catch (err: any) {
            appendSystemMessage(currentRoom, `AI request failed: ${err.message || 'Network error'}`);
          }
          return;
        }

        case '/summarize': {
          appendSystemMessage(currentRoom, 'Generating AI channel summary...');
          try {
            const res = await fetch('/api/ai/summarize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId: currentRoom }),
            });
            const data = await res.json();
            if (data.summary) {
              appendSystemMessage(currentRoom, `AI Channel Summary:\n${data.summary}`);
            } else if (data.error) {
              appendSystemMessage(currentRoom, `Summary Error: ${data.error}`);
            }
          } catch (err: any) {
            appendSystemMessage(currentRoom, `Failed to summarize channel: ${err.message || 'Error'}`);
          }
          return;
        }

        default: {
          appendSystemMessage(currentRoom, `Unknown command '${cmd}'. Type /help for assistance.`);
          playErrorSound();
          return;
        }
      }
    }

    // Handle Regular Message
    const timerSec = roomTimers[currentRoom] || 0;
    const roomPass = roomPasswords[currentRoom];
    const isEncrypted = Boolean(roomPass);

    let encryptedPayload;
    if (isEncrypted && roomPass) {
      encryptedPayload = await encryptText(rawInput, roomPass);
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      roomId: currentRoom,
      senderId: peerId,
      senderNick: nick,
      content: rawInput,
      isEncrypted,
      encryptedPayload,
      timestamp: Date.now(),
      timerSeconds: timerSec,
      expiresAt: timerSec > 0 ? Date.now() + timerSec * 1000 : undefined,
    };

    if (clientRef.current) {
      clientRef.current.sendChatMessage(newMsg);
    }
    // Also broadcast over Bluetooth BLE / P2P transceiver if active
    if (BluetoothMeshManager.getInstance().getConnectedDevice()?.connected) {
      BluetoothMeshManager.getInstance().sendPacket(newMsg.content).catch(() => {});
    }
    processChatMessage(newMsg);
  };

  const handleBurnMessage = (messageId: string) => {
    playBurnSound();
    setMessagesMap((prev) => {
      const roomMsgs = prev[currentRoom] || [];
      return {
        ...prev,
        [currentRoom]: roomMsgs.filter((m) => m.id !== messageId),
      };
    });
  };

  const currentMessages = messagesMap[currentRoom] || [];
  const isEncryptedRoom = Boolean(roomPasswords[currentRoom]);
  const activeTimer = roomTimers[currentRoom] || 0;
  const activePaletteTheme = getPaletteTheme(palette, themeMode);
  const currentRoomTypingNicks = Object.values(typingMap[currentRoom] || {});

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${
        uiMode === 'terminal'
          ? `${activePaletteTheme.bgClass} ${activePaletteTheme.textClass}`
          : themeMode === 'light'
          ? 'bg-slate-50 text-slate-900'
          : 'bg-zinc-950 text-zinc-100'
      }`}
    >
      {/* Header */}
      <HeaderBar
        uiMode={uiMode}
        setUiMode={setUiMode}
        themeMode={themeMode}
        setThemeMode={handleSetThemeMode}
        palette={palette}
        setPalette={handleSetPalette}
        currentRoom={currentRoom}
        nick={nick}
        peerId={peerId}
        peersCount={peers.length}
        isEncrypted={isEncryptedRoom}
        timerSeconds={activeTimer}
        typingPeers={currentRoomTypingNicks}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabledState(toggleSound())}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenKeys={() => openKeysModal('key')}
        onOpenRooms={() => setIsRoomsOpen(true)}
        onOpenBluetooth={() => setIsBluetoothOpen(true)}
        bleConnected={Boolean(bleDevice?.connected)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenQR={() => setIsQROpen(true)}
        onTogglePeerSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
        isSidebarOpen={isSidebarOpenMobile}
        isMobileSheetOpen={isMobileSheetOpen}
        setIsMobileSheetOpen={setIsMobileSheetOpen}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Body */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Chat Transcript Area */}
        <ChatPane
          messages={currentMessages}
          currentPeerId={peerId}
          currentRoom={currentRoom}
          uiMode={uiMode}
          themeMode={themeMode}
          palette={palette}
          isEncryptedRoom={isEncryptedRoom}
          hasRoomPassword={isEncryptedRoom}
          onOpenKeys={() => openKeysModal('key')}
          onBurnMessage={handleBurnMessage}
        />

        {/* Live Peers Sidebar */}
        <PeerSidebar
          peers={peers}
          currentPeerId={peerId}
          uiMode={uiMode}
          themeMode={themeMode}
          onSelectDM={(targetNick) => {
            handleSendMessage(`/msg ${targetNick} hello`);
          }}
          onRefreshPeers={() => {
            clientRef.current?.requestPeersRefresh();
          }}
          isOpenMobile={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
        />
      </div>

      {/* Input Bar */}
      <InputBar
        onSendMessage={handleSendMessage}
        uiMode={uiMode}
        themeMode={themeMode}
        palette={palette}
        currentRoom={currentRoom}
        timerSeconds={activeTimer}
        onSetTimer={(sec) => setRoomTimer(currentRoom, sec)}
        isEncrypted={isEncryptedRoom}
        onOpenKeys={() => openKeysModal('key')}
        onOpenHelp={() => setIsHelpOpen(true)}
        onTypingStatus={(isTyping) => clientRef.current?.sendTyping(currentRoom, isTyping)}
      />

      {/* MeshNet Navigation Bar (Visible in Desktop Full Screen, Tablet, and Mobile) */}
      <MobileBottomNav
        uiMode={uiMode}
        themeMode={themeMode}
        currentRoom={currentRoom}
        peersCount={peers.length}
        isEncrypted={isEncryptedRoom}
        timerSeconds={activeTimer}
        isSidebarOpen={isSidebarOpenMobile}
        onTogglePeerSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
        onOpenRooms={() => setIsRoomsOpen(true)}
        onOpenBluetooth={() => setIsBluetoothOpen(true)}
        bleConnected={Boolean(bleDevice?.connected)}
        onOpenKeys={() => openKeysModal('key')}
        onOpenQR={() => setIsQROpen(true)}
        onOpenMobileSheet={() => setIsMobileSheetOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onFocusInput={() => {
          const el = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (el) el.focus();
        }}
      />

      {/* Modals */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        uiMode={uiMode}
        themeMode={themeMode}
        onSelectCommand={(cmd) => {
          setIsHelpOpen(false);
        }}
      />

      <KeysModal
        isOpen={isKeysOpen}
        onClose={() => setIsKeysOpen(false)}
        uiMode={uiMode}
        themeMode={themeMode}
        peerId={peerId}
        fingerprint={fingerprint}
        publicKeyBase64={publicKeyBase64}
        currentRoom={currentRoom}
        isEncrypted={isEncryptedRoom}
        nick={nick}
        initialTab={keysModalTab}
        onUpdateNick={handleUpdateNick}
        onSetRoomPassword={(r, p) => setRoomPassword(r, p)}
        onClearRoomPassword={(r) => clearRoomPassword(r)}
      />

      <RoomModal
        isOpen={isRoomsOpen}
        onClose={() => setIsRoomsOpen(false)}
        uiMode={uiMode}
        themeMode={themeMode}
        currentRoom={currentRoom}
        activeRooms={activeRooms}
        onJoinRoom={(room, pass) => {
          handleSendMessage(`/join ${room} ${pass || ''}`);
        }}
        onOpenQR={() => setIsQROpen(true)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        uiMode={uiMode}
        themeMode={themeMode}
      />

      <BluetoothModal
        isOpen={isBluetoothOpen}
        onClose={() => setIsBluetoothOpen(false)}
        uiMode={uiMode}
        themeMode={themeMode}
        currentRoom={currentRoom}
        nick={nick}
        peerId={peerId}
        peers={peers}
        onOpenQR={() => setIsQROpen(true)}
      />

      <QRCodeModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        uiMode={uiMode}
        themeMode={themeMode}
        currentRoom={currentRoom}
        onJoinRoom={(room, pass) => {
          handleSendMessage(`/join ${room} ${pass || ''}`);
        }}
      />
    </div>
  );
}
