export type UIMode = 'terminal' | 'modern';
export type ThemeMode = 'dark' | 'light';

export type TerminalPalette = 'emerald' | 'amber' | 'cyberpunk' | 'monochrome' | 'solarized';

export type DisappearingTimer = 0 | 5 | 10 | 30 | 60 | 300 | 3600 | 86400; // 0 = off, seconds

export interface Peer {
  id: string;
  nick: string;
  ip?: string;
  port?: number;
  lastSeen: number; // timestamp
  isOnline: boolean;
  latencyMs?: number;
  publicKey?: string; // base64 exported public key for DMs
  pin?: string; // 6-digit sync PIN for direct phone-to-phone pairing
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
  algo: 'AES-256-GCM';
}

export interface ChatMessage {
  id: string;
  roomId: string; // e.g. '#disaster-relief' or 'dm:peerId1-peerId2'
  senderId: string;
  senderNick: string;
  content: string; // decrypted text OR plaintext
  isEncrypted: boolean;
  encryptedPayload?: EncryptedPayload;
  timestamp: number; // ms
  expiresAt?: number; // ms timestamp when message should burn/expire
  timerSeconds: number; // 0 if no timer
  isDirectMessage?: boolean;
  recipientId?: string;
  recipientNick?: string;
  isSystemMessage?: boolean;
  systemType?: 'join' | 'leave' | 'nick' | 'timer' | 'info' | 'error' | 'security' | 'pairing';
  viaTransport?: 'websocket' | 'bluetooth_ble' | 'webrtc_p2p' | 'broadcast_channel';
}

export interface RoomInfo {
  id: string; // e.g. '#disaster-relief'
  name: string;
  isEncrypted: boolean;
  hasKeySet: boolean; // whether current user has entered the room password
  timerSeconds: DisappearingTimer;
  unreadCount: number;
}

export interface SlashCommand {
  name: string;
  syntax: string;
  description: string;
  example: string;
}

export interface MeshStats {
  totalPeers: number;
  onlinePeers: number;
  activeRooms: number;
  messagesProcessed: number;
  nodePeerId: string;
  uptimeSeconds: number;
}

export interface PairRequest {
  fromPeerId: string;
  fromNick: string;
  fromPin: string;
  timestamp: number;
}

export type WSClientMessage =
  | { type: 'join'; roomId: string; nick: string; peerId: string; pin?: string }
  | { type: 'leave'; roomId: string; peerId: string }
  | { type: 'announce_nick'; nick: string; peerId: string; publicKey?: string; pin?: string }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'ping'; peerId: string; timestamp: number }
  | { type: 'typing'; roomId: string; peerId: string; nick: string; isTyping: boolean }
  | { type: 'update_latency'; peerId: string; latencyMs: number }
  | { type: 'get_peers' }
  | { type: 'get_history'; roomId: string }
  | { type: 'pair_register_pin'; peerId: string; pin: string }
  | { type: 'pair_request'; fromPeerId: string; fromNick: string; fromPin: string; targetPin?: string; targetPeerId?: string }
  | { type: 'pair_response'; fromPeerId: string; toPeerId: string; accepted: boolean; pin?: string; reason?: string }
  | { type: 'webrtc_signal'; fromPeerId: string; toPeerId: string; signal: any };

export type WSServerMessage =
  | { type: 'init'; peerId: string; peers: Peer[]; rooms: string[]; stats: MeshStats }
  | { type: 'peer_joined'; peer: Peer; roomId: string }
  | { type: 'peer_left'; peerId: string; roomId: string }
  | { type: 'peer_nick_changed'; peerId: string; oldNick: string; newNick: string }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'pong'; timestamp: number; serverTime: number }
  | { type: 'user_typing'; roomId: string; peerId: string; nick: string; isTyping: boolean }
  | { type: 'history'; roomId: string; messages: ChatMessage[] }
  | { type: 'peers_update'; peers: Peer[] }
  | { type: 'message_burned'; messageId: string; roomId: string }
  | { type: 'pair_request'; fromPeerId: string; fromNick: string; fromPin: string }
  | { type: 'pair_response'; fromPeerId: string; accepted: boolean; pin?: string; reason?: string }
  | { type: 'pair_error'; error: string }
  | { type: 'webrtc_signal'; fromPeerId: string; signal: any };
