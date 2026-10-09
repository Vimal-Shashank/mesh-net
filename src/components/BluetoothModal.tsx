import React, { useState, useEffect } from 'react';
import { UIMode, ThemeMode, Peer } from '../types';
import {
  BluetoothMeshManager,
  BluetoothDeviceInfo,
  BluetoothDiagnostics,
} from '../lib/bluetooth';
import {
  Bluetooth,
  Radio,
  Cpu,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  X,
  ExternalLink,
  Send,
  Zap,
  Smartphone,
  Laptop,
  Activity,
  Wifi,
  Copy,
  Check,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface BluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiMode: UIMode;
  themeMode?: ThemeMode;
  currentRoom?: string;
  nick?: string;
  peerId?: string;
  peers?: Peer[];
  onSendBluetoothMessage?: (text: string) => void;
  onOpenQR?: () => void;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({
  isOpen,
  onClose,
  uiMode,
  themeMode = 'dark',
  currentRoom = '#disaster-relief',
  nick = 'User',
  peerId = '',
  peers = [],
  onOpenQR,
}) => {
  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';
  const manager = BluetoothMeshManager.getInstance();

  const [activeTab, setActiveTab] = useState<'hardware' | 'p2p' | 'virtual'>('hardware');
  const [diagnostics, setDiagnostics] = useState<BluetoothDiagnostics>(() => manager.getDiagnostics());
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDeviceInfo | null>(() => manager.getConnectedDevice());
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [testPacketText, setTestPacketText] = useState('PING: MeshNet Beacon 01');
  const [isSendingPacket, setIsSendingPacket] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [directCode, setDirectCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [inputCode, setInputCode] = useState('');

  // Sync state and listen for logs / status
  useEffect(() => {
    if (!isOpen) return;

    // Refresh diagnostics
    const diag = manager.getDiagnostics();
    setDiagnostics(diag);
    setConnectedDevice(manager.getConnectedDevice());

    const unsubStatus = manager.onStatusChange((info) => {
      setConnectedDevice(info);
    });

    const unsubLog = manager.onLog((logLine) => {
      setLogs((prev) => [...prev.slice(-25), logLine]);
    });

    // Add initial guidance log
    if (diag.isIframe) {
      manager.addLog('Detected embedded iframe environment. Web Bluetooth hardware access requires full top-level tab.');
    } else if (diag.isSupported) {
      manager.addLog('Web Bluetooth API ready for scanning BLE hardware.');
    }

    return () => {
      unsubStatus();
      unsubLog();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Open App in Full Tab (Pop Out) to bypass iframe restriction
  const handleOpenFullTab = () => {
    if (typeof window !== 'undefined') {
      const fullUrl = window.location.href;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Scan & Pair Real Web Bluetooth Hardware
  const handleScanHardware = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsScanning(true);

    try {
      const dev = await manager.connectHardwareDevice();
      setSuccessMessage(`Connected to ${dev.name}! GATT radio transceiver active.`);
    } catch (err: any) {
      const msg = err?.message || 'Bluetooth connection failed.';
      if (msg.includes('IFRAME_RESTRICTED')) {
        setErrorMessage('Web Bluetooth is blocked inside iframes by browser security policies. Please use "Open in Full Tab" above to pair physical Bluetooth devices.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Disconnect active device
  const handleDisconnect = () => {
    manager.disconnect();
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // Send packet / ping test
  const handleSendTestPacket = async () => {
    if (!testPacketText.trim() || isSendingPacket) return;
    setIsSendingPacket(true);
    setErrorMessage(null);

    try {
      await manager.sendPacket(testPacketText.trim());
      setSuccessMessage('Packet transmitted successfully over BLE transceiver link!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to transmit BLE packet.');
    } finally {
      setIsSendingPacket(false);
    }
  };

  // Launch Virtual BLE Node
  const handleLaunchVirtualNode = () => {
    setErrorMessage(null);
    const node = manager.connectVirtualNode('ESP32-Mesh-Relay-01');
    setSuccessMessage(`Virtual BLE Relay "${node.name}" initialized and broadcasting!`);
  };

  // Connect Direct P2P with another peer
  const handleConnectDirectPeer = (peer: Peer) => {
    setErrorMessage(null);
    const info = manager.connectDirectP2P(peer.nick, peer.id);
    setSuccessMessage(`Direct P2P wireless link established with ${peer.nick}!`);
  };

  // Copy Device Join Link
  const handleCopyInviteLink = () => {
    if (typeof window !== 'undefined') {
      const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(currentRoom)}&peer=${peerId}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Pair using 6-Digit Sync Code
  const handlePairDirectCode = () => {
    if (inputCode.trim().length !== 6) {
      setErrorMessage('Please enter a valid 6-digit sync PIN from the other device.');
      return;
    }
    setErrorMessage(null);
    const info = manager.connectDirectP2P(`Peer-PIN-${inputCode}`, `pin-${inputCode}`);
    setSuccessMessage(`Connected to peer via direct PIN sync #${inputCode}!`);
    setInputCode('');
  };

  const isConnected = Boolean(connectedDevice && connectedDevice.connected);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-xl rounded-t-2xl sm:rounded-2xl border p-4 sm:p-6 shadow-2xl font-mono max-h-[92vh] overflow-y-auto flex flex-col ${
          isTerminal
            ? isLight
              ? 'bg-white border-slate-300 text-slate-800 shadow-xl'
              : 'bg-zinc-950 border-emerald-500/50 text-emerald-300 shadow-emerald-950/40'
            : isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-xl'
            : 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-black'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 mb-3 ${
          isLight ? 'border-slate-200' : 'border-zinc-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              isLight
                ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
            }`}>
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base tracking-wider uppercase flex items-center gap-2">
                <span>Mesh Transceiver & Bluetooth</span>
                {isConnected && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] border animate-pulse ${
                    isLight
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-500/60'
                  }`}>
                    LINK ACTIVE
                  </span>
                )}
              </div>
              <div className={`text-[11px] font-sans ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Pair BLE hardware radios or connect 2 phones wirelessly
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isLight
                ? 'text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border-slate-200'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border mb-4 text-xs ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-950/80 border-zinc-800'
        }`}>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`py-2 px-1 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'hardware'
                ? isLight
                  ? 'bg-white text-cyan-900 border border-cyan-300 shadow-xs'
                  : 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">BLE Hardware</span>
          </button>
          <button
            onClick={() => setActiveTab('p2p')}
            className={`py-2 px-1 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'p2p'
                ? isLight
                  ? 'bg-white text-emerald-900 border border-emerald-300 shadow-xs'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Phone-to-Phone</span>
          </button>
          <button
            onClick={() => setActiveTab('virtual')}
            className={`py-2 px-1 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'virtual'
                ? isLight
                  ? 'bg-white text-amber-900 border border-amber-300 shadow-xs'
                  : 'bg-amber-950 text-amber-300 border border-amber-500/50 shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Virtual Node</span>
          </button>
        </div>

        {/* Iframe Restriction Alert Banner (Very common reason Bluetooth fails in preview) */}
        {diagnostics.isIframe && activeTab === 'hardware' && (
          <div className={`p-3.5 rounded-xl mb-4 text-xs space-y-2 border ${
            isLight
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-amber-950/50 border-amber-500/50 text-amber-300'
          }`}>
            <div className="flex items-start gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
              <div>
                <span className={isLight ? 'text-amber-900 font-bold' : 'text-amber-300 font-bold'}>Browser Security Restriction (Iframe Preview)</span>
                <p className={`font-normal text-[11px] mt-0.5 leading-relaxed ${isLight ? 'text-amber-800' : 'text-zinc-300'}`}>
                  Web browsers (Chrome & Edge) block native Bluetooth hardware inside embedded iframe previews. To connect real Bluetooth accessories, open MeshNet directly in a full browser tab!
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenFullTab}
              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg flex items-center justify-center gap-2 text-xs transition shadow-md active:scale-98 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Full Tab to Enable Native Bluetooth</span>
            </button>
          </div>
        )}

        {/* Active Connected Device Card */}
        {connectedDevice && (
          <div className={`p-3.5 rounded-xl mb-4 space-y-2.5 border ${
            isLight
              ? 'bg-emerald-50/80 border-emerald-300 text-slate-800'
              : 'bg-zinc-900 border-emerald-500/40 text-zinc-100'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />
                <div>
                  <div className={`font-bold text-sm ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>{connectedDevice.name}</div>
                  <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    {connectedDevice.serviceUuid || 'Active Transceiver Link'} • RSSI {connectedDevice.rssi || -55} dBm
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className={`px-2.5 py-1 border rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isLight
                    ? 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-800'
                    : 'bg-rose-950 hover:bg-rose-900 border-rose-500/50 text-rose-300'
                }`}
              >
                Disconnect
              </button>
            </div>

            {/* Packet Statistics */}
            <div className={`grid grid-cols-2 gap-2 pt-1 border-t text-[11px] ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300'}`}>
                <span className={isLight ? 'text-slate-500' : 'text-zinc-400'}>TX Packets Sent:</span>
                <span className={`ml-1.5 font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>{connectedDevice.packetsSent}</span>
              </div>
              <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300'}`}>
                <span className={isLight ? 'text-slate-500' : 'text-zinc-400'}>RX Packets Recv:</span>
                <span className={`ml-1.5 font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>{connectedDevice.packetsReceived}</span>
              </div>
            </div>

            {/* Test Packet Transmitter */}
            <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
              <div className={`text-[10px] font-bold uppercase mb-1.5 flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                <span>Send Test Packet Over Radio Link</span>
                <span className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>Bi-directional</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testPacketText}
                  onChange={(e) => setTestPacketText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendTestPacket()}
                  placeholder="Type message packet..."
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                      : 'bg-zinc-950 border-zinc-700 text-zinc-100'
                  }`}
                />
                <button
                  onClick={handleSendTestPacket}
                  disabled={isSendingPacket || !testPacketText.trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: BLE HARDWARE (Nordic UART, ESP32, micro:bit, BLE Serial) */}
        {activeTab === 'hardware' && !connectedDevice && (
          <div className="space-y-4">
            {/* Info Banner */}
            <div className={`p-3 rounded-xl text-xs space-y-1.5 border ${
              isLight
                ? 'bg-cyan-50/80 border-cyan-200 text-cyan-950'
                : 'bg-cyan-950/40 border-cyan-500/30 text-zinc-300'
            }`}>
              <div className={`flex items-center gap-2 font-bold ${isLight ? 'text-cyan-900' : 'text-cyan-300'}`}>
                <Radio className="w-4 h-4 text-cyan-500" />
                <span>Web Bluetooth BLE Hardware Mode</span>
              </div>
              <p className={`leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Connects directly to nearby <strong>ESP32, BBC micro:bit, nRF52, Arduino, or BLE UART</strong> serial nodes over Bluetooth Low Energy.
              </p>
              <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Supported GATT: Nordic UART (NUS <code>6E400001</code>), HM-10 Serial (<code>FFE0</code>), and custom Mesh transceivers.
              </div>
            </div>

            {/* Scan Button */}
            <button
              onClick={handleScanHardware}
              disabled={isScanning || !diagnostics.isSupported}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ${
                isScanning
                  ? isLight
                    ? 'bg-cyan-100 border border-cyan-400 text-cyan-900 cursor-wait'
                    : 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 cursor-wait'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>Searching for Nearby BLE Hardware Nodes...</span>
                </>
              ) : (
                <>
                  <Bluetooth className="w-4 h-4" />
                  <span>Pair Nearby BLE Hardware Device</span>
                </>
              )}
            </button>

            {/* Why Web Bluetooth between 2 phones doesn't work */}
            <div className={`p-3 rounded-xl text-[11px] space-y-1.5 border ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
            }`}>
              <div className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                <Info className="w-3.5 h-3.5 text-cyan-500" />
                <span>Trying to connect 2 phones or laptops together?</span>
              </div>
              <p className="leading-relaxed">
                Web browsers do not allow phones to advertise as BLE peripherals. To connect two phones directly, switch to the{' '}
                <button
                  onClick={() => setActiveTab('p2p')}
                  className="text-emerald-600 underline font-semibold hover:text-emerald-700 cursor-pointer"
                >
                  Phone-to-Phone Mesh tab
                </button>{' '}
                to connect wirelessly without servers!
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: DIRECT DEVICE-TO-DEVICE WIRELESS MESH (Phone to Phone / PC to Phone) */}
        {activeTab === 'p2p' && !connectedDevice && (
          <div className="space-y-4">
            <div className={`p-3 rounded-xl text-xs space-y-1.5 border ${
              isLight
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-emerald-950/40 border-emerald-500/30 text-zinc-300'
            }`}>
              <div className={`flex items-center gap-2 font-bold ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span>Direct Wireless Mesh (Device-to-Device)</span>
              </div>
              <p className={`leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Connect two phones, tablets, or computers together wirelessly using direct mesh signaling. No cell towers or cloud accounts required.
              </p>
            </div>

            {/* 1. Share Invite Link / QR */}
            <div className={`p-3.5 rounded-xl space-y-2 border ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-zinc-900 border-zinc-800'
            }`}>
              <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>1. Share Direct Connection Link:</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(currentRoom)}`
                      : ''
                  }
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-mono select-all truncate border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-700'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {onOpenQR && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenQR();
                  }}
                  className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-emerald-800 border-slate-300 shadow-xs'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border-zinc-700'
                  }`}
                >
                  <span>Or Scan QR Code with Phone Camera</span>
                </button>
              )}
            </div>

            {/* 2. 6-Digit Device Sync PIN */}
            <div className={`p-3.5 rounded-xl space-y-2.5 border ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-zinc-900 border-zinc-800'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>2. Pair with 6-Digit Sync PIN:</span>
                <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Your PIN:</span>
              </div>

              <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-zinc-950 border-zinc-800'
              }`}>
                <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Your Device PIN:</div>
                <div className={`font-mono text-lg font-bold tracking-widest ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{directCode}</div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter other phone's 6-digit PIN"
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono tracking-wider focus:outline-none focus:border-emerald-500 border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-100'
                  }`}
                />
                <button
                  onClick={handlePairDirectCode}
                  disabled={inputCode.trim().length !== 6}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  Pair PIN
                </button>
              </div>
            </div>

            {/* 3. Discovered Network Peers */}
            {peers.filter((p) => p.isOnline).length > 0 && (
              <div className={`p-3 rounded-xl space-y-2 border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-zinc-900 border-zinc-800'
              }`}>
                <div className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  3. Nearby Mesh Peers on Local Network ({peers.filter((p) => p.isOnline).length}):
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {peers
                    .filter((p) => p.isOnline)
                    .map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                          isLight
                            ? 'bg-white border-slate-200'
                            : 'bg-zinc-950 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{p.nick}</span>
                          <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{p.id}</span>
                        </div>
                        <button
                          onClick={() => handleConnectDirectPeer(p)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition border cursor-pointer ${
                            isLight
                              ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800'
                              : 'bg-cyan-950 hover:bg-cyan-900 border-cyan-500/40 text-cyan-300'
                          }`}
                        >
                          Connect Direct
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VIRTUAL BLE MESH NODE */}
        {activeTab === 'virtual' && !connectedDevice && (
          <div className="space-y-4">
            <div className={`p-3 rounded-xl text-xs space-y-1.5 border ${
              isLight
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : 'bg-amber-950/40 border-amber-500/30 text-zinc-300'
            }`}>
              <div className={`flex items-center gap-2 font-bold ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
                <Cpu className="w-4 h-4 text-amber-500" />
                <span>Virtual BLE Mesh Node Simulator</span>
              </div>
              <p className={`leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Don't have physical BLE hardware nearby? Emulate an <strong>ESP32-BLE-Mesh</strong> radio transceiver on this device to test radio packet transmission, packet looping, and mesh telemetry!
              </p>
            </div>

            <button
              onClick={handleLaunchVirtualNode}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2 transition active:scale-98 shadow-lg cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Initialize Virtual BLE Node (ESP32-Mesh-Relay)</span>
            </button>
          </div>
        )}

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 border ${
            isLight
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
          }`}>
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            isLight
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
          }`}>
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Live Bluetooth & Radio Logs Console */}
        <div className={`mt-4 p-3 rounded-xl space-y-1 border ${
          isLight
            ? 'bg-slate-100 border-slate-200 text-slate-800'
            : 'bg-black/95 border-zinc-800 text-zinc-100'
        }`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center justify-between border-b pb-1.5 mb-1.5 ${
            isLight ? 'text-slate-500 border-slate-200' : 'text-zinc-500 border-zinc-800/80'
          }`}>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-500" />
              <span>Transceiver Diagnostics & Radio Logs</span>
            </div>
            <span className={`text-[9px] ${isLight ? 'text-cyan-700 font-bold' : 'text-cyan-400'}`}>GATT / P2P ENGINE</span>
          </div>
          <div className={`text-[11px] font-mono space-y-1 max-h-28 overflow-y-auto ${
            isLight ? 'text-slate-600' : 'text-zinc-400'
          }`}>
            {logs.length === 0 ? (
              <div className={`italic ${isLight ? 'text-slate-400' : 'text-zinc-600'}`}>No radio logs recorded yet.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="leading-tight break-all">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
