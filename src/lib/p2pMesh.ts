import { ChatMessage } from '../types';
import { MeshClient } from './meshClient';
import { BluetoothMeshManager } from './bluetooth';

export interface P2PPeerStatus {
  connected: boolean;
  peerId?: string;
  peerNick?: string;
  pin?: string;
  rttMs?: number;
  packetsSent: number;
  packetsReceived: number;
  lastActivity: number;
}

export interface IncomingPairRequest {
  fromPeerId: string;
  fromNick: string;
  fromPin: string;
  timestamp: number;
}

export class P2PMeshManager {
  private static instance: P2PMeshManager | null = null;

  private peerId = '';
  private nick = '';
  private pin = '';
  private meshClient: MeshClient | null = null;

  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;

  private activePeer: { peerId: string; peerNick: string; pin?: string } | null = null;
  private isConnecting = false;
  private packetsSent = 0;
  private packetsReceived = 0;
  private lastActivity = 0;

  private incomingRequestListeners: Set<(req: IncomingPairRequest | null) => void> = new Set();
  private statusListeners: Set<(status: P2PPeerStatus) => void> = new Set();
  private messageListeners: Set<(msg: ChatMessage) => void> = new Set();
  private errorListeners: Set<(err: string) => void> = new Set();
  private logListeners: Set<(log: string) => void> = new Set();

  private pendingIncomingRequest: IncomingPairRequest | null = null;

  private constructor() {}

  public static getInstance(): P2PMeshManager {
    if (!P2PMeshManager.instance) {
      P2PMeshManager.instance = new P2PMeshManager();
    }
    return P2PMeshManager.instance;
  }

  public init(peerId: string, nick: string, pin: string, meshClient: MeshClient) {
    this.peerId = peerId;
    this.nick = nick;
    this.pin = pin;
    this.meshClient = meshClient;

    // Attach listeners to MeshClient
    meshClient.onPairRequest((req) => {
      this.handleIncomingPairRequest(req);
    });

    meshClient.onPairResponse((res) => {
      this.handleIncomingPairResponse(res);
    });

    meshClient.onPairError((err) => {
      this.isConnecting = false;
      this.addLog(`[P2P Error] ${err}`);
      this.notifyError(err);
    });

    meshClient.onWebRTCSignal((fromPeerId, signal) => {
      this.handleIncomingWebRTCSignal(fromPeerId, signal);
    });
  }

  public updateIdentity(nick: string, pin: string) {
    this.nick = nick;
    this.pin = pin;
  }

  public addLog(msg: string) {
    const logLine = `[${new Date().toLocaleTimeString()}] ${msg}`;
    this.logListeners.forEach((fn) => fn(logLine));
  }

  public onLog(cb: (log: string) => void) {
    this.logListeners.add(cb);
    return () => this.logListeners.delete(cb);
  }

  public onIncomingRequest(cb: (req: IncomingPairRequest | null) => void) {
    this.incomingRequestListeners.add(cb);
    cb(this.pendingIncomingRequest);
    return () => this.incomingRequestListeners.delete(cb);
  }

  public onStatusChange(cb: (status: P2PPeerStatus) => void) {
    this.statusListeners.add(cb);
    cb(this.getStatus());
    return () => this.statusListeners.delete(cb);
  }

  public onMessage(cb: (msg: ChatMessage) => void) {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  public onError(cb: (err: string) => void) {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  public getStatus(): P2PPeerStatus {
    const isConnected = Boolean(
      this.dataChannel && this.dataChannel.readyState === 'open' && this.activePeer
    );

    return {
      connected: isConnected,
      peerId: this.activePeer?.peerId,
      peerNick: this.activePeer?.peerNick,
      pin: this.activePeer?.pin,
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      lastActivity: this.lastActivity || Date.now(),
    };
  }

  public getPendingRequest(): IncomingPairRequest | null {
    return this.pendingIncomingRequest;
  }

  /**
   * Request pairing using target phone's 6-digit PIN
   */
  public requestPairByPin(targetPin: string) {
    if (!this.meshClient) return;
    this.isConnecting = true;
    this.addLog(`[P2P Pairing] Sending pairing request to phone with PIN #${targetPin}...`);
    this.meshClient.sendPairRequest({ targetPin });
  }

  /**
   * Request pairing using target phone's Peer ID directly
   */
  public requestPairByPeerId(targetPeerId: string, targetNick = 'Peer') {
    if (!this.meshClient) return;
    this.isConnecting = true;
    this.addLog(`[P2P Pairing] Sending direct connection request to ${targetNick} (${targetPeerId})...`);
    this.meshClient.sendPairRequest({ targetPeerId });
  }

  /**
   * Incoming pairing request received on this device
   */
  private handleIncomingPairRequest(req: { fromPeerId: string; fromNick: string; fromPin: string }) {
    this.addLog(`[P2P Request] Incoming pairing request from ${req.fromNick} (PIN #${req.fromPin})`);
    
    // Trigger mobile vibration if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (e) {}
    }

    const incoming: IncomingPairRequest = {
      fromPeerId: req.fromPeerId,
      fromNick: req.fromNick,
      fromPin: req.fromPin,
      timestamp: Date.now(),
    };

    this.pendingIncomingRequest = incoming;
    this.incomingRequestListeners.forEach((fn) => fn(incoming));
  }

  /**
   * Simulate incoming pairing request for interactive testing & verification
   */
  public simulateIncomingRequest(fromPeerId = 'demo-rescue-node', fromNick = 'RescueUnit-01', fromPin = '849201') {
    this.handleIncomingPairRequest({ fromPeerId, fromNick, fromPin });
  }

  /**
   * User accepts the incoming pairing request
   */
  public async acceptPairRequest(fromPeerId: string, fromNick: string) {
    if (!this.meshClient) return;
    this.addLog(`[P2P] Accepted pairing request from ${fromNick}. Establishing WebRTC tunnel...`);
    
    this.activePeer = {
      peerId: fromPeerId,
      peerNick: fromNick,
      pin: this.pendingIncomingRequest?.fromPin,
    };

    this.pendingIncomingRequest = null;
    this.incomingRequestListeners.forEach((fn) => fn(null));

    // Send positive response to caller
    this.meshClient.sendPairResponse(fromPeerId, true, this.pin);

    // Initialize callee WebRTC PeerConnection
    await this.setupPeerConnection(fromPeerId, false);
  }

  /**
   * User declines incoming pairing request
   */
  public declinePairRequest(fromPeerId: string, reason = 'Declined by user') {
    if (!this.meshClient) return;
    this.addLog(`[P2P] Declined pairing request from ${fromPeerId}.`);
    this.pendingIncomingRequest = null;
    this.incomingRequestListeners.forEach((fn) => fn(null));
    this.meshClient.sendPairResponse(fromPeerId, false, this.pin, reason);
  }

  /**
   * Target device responded to our pairing request
   */
  private async handleIncomingPairResponse(res: {
    fromPeerId: string;
    accepted: boolean;
    pin?: string;
    reason?: string;
  }) {
    this.isConnecting = false;

    if (!res.accepted) {
      const reason = res.reason || 'Device declined the connection request.';
      this.addLog(`[P2P Pairing] Request rejected: ${reason}`);
      this.notifyError(reason);
      return;
    }

    this.addLog(`[P2P Pairing] Device accepted! Initializing WebRTC DataChannel offer...`);
    this.activePeer = {
      peerId: res.fromPeerId,
      peerNick: `Peer-${res.pin || res.fromPeerId.substring(0, 5)}`,
      pin: res.pin,
    };

    // Initialize caller WebRTC PeerConnection and create offer
    await this.setupPeerConnection(res.fromPeerId, true);
  }

  /**
   * WebRTC PeerConnection & DataChannel Setup
   */
  private async setupPeerConnection(remotePeerId: string, isInitiator: boolean) {
    this.cleanupPeerConnection();

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      });

      this.peerConnection = pc;

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && this.meshClient) {
          this.meshClient.sendWebRTCSignal(remotePeerId, {
            type: 'ice_candidate',
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        this.addLog(`[WebRTC State] Connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          this.handleDisconnected();
        }
      };

      if (isInitiator) {
        // Caller creates the DataChannel
        this.addLog('[WebRTC] Creating bidirectional RTCDataChannel "meshnet-p2p"...');
        const dc = pc.createDataChannel('meshnet-p2p', { ordered: true });
        this.bindDataChannelEvents(dc);

        // Create Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.addLog('[WebRTC] Local SDP offer created, transmitting via mesh signaling...');

        this.meshClient?.sendWebRTCSignal(remotePeerId, {
          type: 'sdp_offer',
          sdp: offer,
        });
      } else {
        // Callee listens for incoming DataChannel
        pc.ondatachannel = (event) => {
          this.addLog('[WebRTC] Incoming RTCDataChannel received!');
          this.bindDataChannelEvents(event.channel);
        };
      }
    } catch (err: any) {
      this.addLog(`[WebRTC Error] ${err.message || err}`);
      this.notifyError(`WebRTC setup failed: ${err.message}`);
    }
  }

  /**
   * Bind event handlers on the WebRTC DataChannel
   */
  private bindDataChannelEvents(dc: RTCDataChannel) {
    this.dataChannel = dc;

    dc.onopen = () => {
      this.addLog(`[Direct P2P Link Active] WebRTC DataChannel opened! 0-hop link established.`);
      this.notifyStatusChange();
    };

    dc.onclose = () => {
      this.addLog('[Direct P2P Link Closed] DataChannel closed.');
      this.handleDisconnected();
    };

    dc.onerror = (err) => {
      this.addLog(`[DataChannel Error] ${err}`);
    };

    dc.onmessage = (event) => {
      this.packetsReceived++;
      this.lastActivity = Date.now();
      this.notifyStatusChange();

      try {
        const parsed = JSON.parse(event.data);
        if (parsed && (parsed.content || parsed.id)) {
          this.addLog(`[Direct P2P RX] Received message packet from ${parsed.senderNick || 'Peer'}`);
          BluetoothMeshManager.getInstance().recordMessagePackets(
            parsed.content || JSON.stringify(parsed),
            'rx',
            parsed.senderNick || this.activePeer?.peerNick,
            -44
          );
          this.messageListeners.forEach((fn) => fn(parsed));
          return;
        }
      } catch (e) {}

      // Fallback text packet
      const text = typeof event.data === 'string' ? event.data : 'Binary data';
      BluetoothMeshManager.getInstance().recordMessagePackets(
        text,
        'rx',
        this.activePeer?.peerNick,
        -44
      );
      const fallbackMsg: ChatMessage = {
        id: `p2p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        roomId: '#disaster-relief',
        senderId: this.activePeer?.peerId || 'direct-peer',
        senderNick: this.activePeer?.peerNick || 'Direct Peer',
        content: text,
        isEncrypted: false,
        timestamp: Date.now(),
        timerSeconds: 0,
        viaTransport: 'webrtc_p2p',
      };
      this.messageListeners.forEach((fn) => fn(fallbackMsg));
    };
  }

  /**
   * Handle incoming WebRTC signaling packets (Offer, Answer, ICE)
   */
  private async handleIncomingWebRTCSignal(fromPeerId: string, signal: any) {
    if (!signal) return;

    if (signal.type === 'sdp_offer') {
      this.addLog(`[WebRTC Signal] Received SDP offer from ${fromPeerId}`);
      if (!this.peerConnection) {
        await this.setupPeerConnection(fromPeerId, false);
      }
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.addLog('[WebRTC Signal] Transmitting SDP answer back to peer...');
        this.meshClient?.sendWebRTCSignal(fromPeerId, {
          type: 'sdp_answer',
          sdp: answer,
        });
      }
    } else if (signal.type === 'sdp_answer') {
      this.addLog(`[WebRTC Signal] Received SDP answer from ${fromPeerId}`);
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      }
    } else if (signal.type === 'ice_candidate') {
      if (this.peerConnection && signal.candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {}
      }
    }
  }

  /**
   * Send chat message directly over WebRTC P2P DataChannel
   */
  public sendChatMessage(msg: ChatMessage): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return false;
    }

    try {
      const payload = JSON.stringify({ ...msg, viaTransport: 'webrtc_p2p' });
      this.dataChannel.send(payload);
      this.packetsSent++;
      this.lastActivity = Date.now();
      this.notifyStatusChange();
      this.addLog(`[Direct P2P TX] Sent message directly to ${this.activePeer?.peerNick || 'Peer'}`);
      
      // Frame and log into Bluetooth BLE packet stream
      BluetoothMeshManager.getInstance().recordMessagePackets(
        msg.content,
        'tx',
        this.activePeer?.peerNick,
        -44
      );
      return true;
    } catch (err: any) {
      this.addLog(`[Direct P2P Error] Send failed: ${err.message}`);
      return false;
    }
  }

  public disconnect() {
    this.addLog('[P2P] Disconnecting direct peer link...');
    this.cleanupPeerConnection();
    this.handleDisconnected();
  }

  private handleDisconnected() {
    this.activePeer = null;
    this.dataChannel = null;
    this.notifyStatusChange();
  }

  private cleanupPeerConnection() {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch (e) {}
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }
  }

  private notifyStatusChange() {
    const status = this.getStatus();
    this.statusListeners.forEach((fn) => fn(status));
  }

  private notifyError(err: string) {
    this.errorListeners.forEach((fn) => fn(err));
  }
}
