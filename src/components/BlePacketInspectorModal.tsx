import React, { useState, useEffect } from 'react';
import { UIMode, ThemeMode } from '../types';
import {
  BluetoothMeshManager,
  BleAttPacket,
  BluetoothDeviceInfo,
} from '../lib/bluetooth';
import {
  Bluetooth,
  Activity,
  X,
  Copy,
  Check,
  Send,
  Zap,
  Radio,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Filter,
} from 'lucide-react';

interface BlePacketInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiMode: UIMode;
  themeMode?: ThemeMode;
}

export const BlePacketInspectorModal: React.FC<BlePacketInspectorModalProps> = ({
  isOpen,
  onClose,
  uiMode,
  themeMode = 'dark',
}) => {
  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';
  const manager = BluetoothMeshManager.getInstance();

  const [packets, setPackets] = useState<BleAttPacket[]>(() => manager.getRecentPackets());
  const [deviceInfo, setDeviceInfo] = useState<BluetoothDeviceInfo | null>(() => manager.getConnectedDevice());
  const [filterDirection, setFilterDirection] = useState<'all' | 'tx' | 'rx'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('ATT_PING: BLE Mesh Link Test');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setPackets(manager.getRecentPackets());
    setDeviceInfo(manager.getConnectedDevice());

    const unsubPacket = manager.onPacket((pkt) => {
      setPackets((prev) => [pkt, ...prev.slice(0, 99)]);
    });

    const unsubStatus = manager.onStatusChange((info) => {
      setDeviceInfo(info);
    });

    return () => {
      unsubPacket();
      unsubStatus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPackets = packets.filter((p) => {
    if (filterDirection === 'tx') return p.direction === 'tx';
    if (filterDirection === 'rx') return p.direction === 'rx';
    return true;
  });

  const handleCopyHex = (id: string, hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendTest = async () => {
    if (!testInput.trim() || isSending) return;
    setIsSending(true);
    try {
      if (deviceInfo && deviceInfo.connected) {
        await manager.sendPacket(testInput.trim());
      } else {
        // Record packet anyway so inspector shows it
        manager.recordMessagePackets(testInput.trim(), 'tx', 'Local Device', -45);
      }
    } catch (e) {
      manager.recordMessagePackets(testInput.trim(), 'tx', 'Local Device', -45);
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = () => {
    setPackets([]);
  };

  const totalTx = packets.filter((p) => p.direction === 'tx').length;
  const totalRx = packets.filter((p) => p.direction === 'rx').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border p-4 sm:p-6 shadow-2xl font-mono max-h-[92vh] overflow-y-auto flex flex-col ${
          isTerminal
            ? isLight
              ? 'bg-white border-slate-300 text-slate-800'
              : 'bg-zinc-950 border-cyan-500/50 text-cyan-300'
            : isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-zinc-900 border-zinc-700 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b pb-3 mb-3 ${
            isLight ? 'border-slate-200' : 'border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg border ${
                isLight
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                  : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
              }`}
            >
              <Bluetooth className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base tracking-wider uppercase flex items-center gap-2">
                <span>Bluetooth BLE Packet Inspector</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] border font-bold ${
                    isLight
                      ? 'bg-cyan-100 text-cyan-900 border-cyan-300'
                      : 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                  }`}
                >
                  LIVE TELEMETRY
                </span>
              </div>
              <div className={`text-[11px] font-sans ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Raw ATT OpCodes, 20-byte MTU chunking, Hex payload dumps, and RSSI
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

        {/* Radio Link Status Overview */}
        <div
          className={`p-3 rounded-xl border mb-3 flex flex-wrap items-center justify-between gap-2 text-xs ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : 'bg-zinc-950/70 border-zinc-800 text-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-500" />
            <div>
              <span className="font-bold">
                {deviceInfo?.connected ? deviceInfo.name : 'Bluetooth Radio Transceiver'}
              </span>
              <span className={`ml-2 text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {deviceInfo?.serviceUuid || 'Nordic NUS / BLE ATT'} • RSSI {deviceInfo?.rssi || -52} dBm
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className={`px-2 py-0.5 rounded border ${isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-800' : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300'}`}>
              TX: {totalTx} packets
            </span>
            <span className={`px-2 py-0.5 rounded border ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'}`}>
              RX: {totalRx} packets
            </span>
          </div>
        </div>

        {/* Filter and Clear Bar */}
        <div className="flex items-center justify-between gap-2 mb-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`} />
            <span className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Filter:
            </span>
            <button
              onClick={() => setFilterDirection('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition cursor-pointer ${
                filterDirection === 'all'
                  ? isLight
                    ? 'bg-slate-200 border-slate-300 text-slate-900'
                    : 'bg-zinc-800 border-zinc-700 text-white'
                  : isLight
                  ? 'border-transparent text-slate-500 hover:bg-slate-100'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              All ({packets.length})
            </button>
            <button
              onClick={() => setFilterDirection('tx')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition cursor-pointer ${
                filterDirection === 'tx'
                  ? isLight
                    ? 'bg-cyan-100 border-cyan-300 text-cyan-900'
                    : 'bg-cyan-950 border-cyan-500/50 text-cyan-300'
                  : isLight
                  ? 'border-transparent text-slate-500 hover:bg-slate-100'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              TX Outbound ({totalTx})
            </button>
            <button
              onClick={() => setFilterDirection('rx')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition cursor-pointer ${
                filterDirection === 'rx'
                  ? isLight
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                    : 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                  : isLight
                  ? 'border-transparent text-slate-500 hover:bg-slate-100'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              RX Inbound ({totalRx})
            </button>
          </div>

          <button
            onClick={handleClear}
            className={`px-2 py-1 rounded-md text-[11px] flex items-center gap-1 border transition cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
            }`}
            title="Clear inspector log"
          >
            <Trash2 className="w-3 h-3 text-rose-500" />
            <span>Clear</span>
          </button>
        </div>

        {/* Packet Stream List */}
        <div className="flex-1 space-y-2 max-h-[48vh] overflow-y-auto pr-1">
          {filteredPackets.length === 0 ? (
            <div
              className={`p-6 text-center rounded-xl border text-xs italic ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-black/60 border-zinc-800 text-zinc-500'
              }`}
            >
              No BLE ATT packets recorded yet. Transmit a chat message or send a test packet below!
            </div>
          ) : (
            filteredPackets.map((pkt) => {
              const isTx = pkt.direction === 'tx';
              return (
                <div
                  key={pkt.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isTx
                      ? isLight
                        ? 'bg-cyan-50/50 border-cyan-200 text-slate-900'
                        : 'bg-cyan-950/20 border-cyan-500/30 text-cyan-200'
                      : isLight
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                      : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  }`}
                >
                  {/* Packet Header */}
                  <div className="flex items-center justify-between text-[11px] mb-1.5 pb-1 border-b border-inherit">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 text-[10px] ${
                          isTx
                            ? isLight
                              ? 'bg-cyan-200 text-cyan-950 font-bold'
                              : 'bg-cyan-900/80 text-cyan-200 border border-cyan-500/50 font-bold'
                            : isLight
                            ? 'bg-emerald-200 text-emerald-950 font-bold'
                            : 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/50 font-bold'
                        }`}
                      >
                        {isTx ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        <span>{isTx ? 'TX (BLE-OUT)' : 'RX (BLE-IN)'}</span>
                      </span>

                      <span className="font-bold">{pkt.opcode}</span>
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        Handle: <code>{pkt.handle}</code>
                      </span>
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        Chunk: <strong>{pkt.chunkIndex}/{pkt.totalChunks}</strong> ({pkt.mtu}B MTU)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={isLight ? 'text-slate-500' : 'text-zinc-400'}>
                        Ch {pkt.channel} • {pkt.rssi} dBm
                      </span>
                      <span className={isLight ? 'text-slate-400' : 'text-zinc-500'}>
                        {new Date(pkt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Hex Payload & ASCII */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                          Raw Hex Bytes:
                        </div>
                        <div
                          className={`p-2 rounded-lg text-[11px] font-mono break-all border select-all ${
                            isLight
                              ? 'bg-white border-slate-200 text-slate-800'
                              : 'bg-black/90 border-zinc-800 text-emerald-300'
                          }`}
                        >
                          {pkt.hexDump}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopyHex(pkt.id, pkt.hexDump)}
                        className={`p-1.5 mt-4 rounded border transition cursor-pointer flex-shrink-0 ${
                          isLight
                            ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                            : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                        }`}
                        title="Copy Hex Dump"
                      >
                        {copiedId === pkt.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="text-[11px]">
                      <span className={`font-bold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        ASCII Payload:{' '}
                      </span>
                      <span className={`font-mono ${isLight ? 'text-slate-800' : 'text-zinc-100'}`}>
                        "{pkt.ascii}"
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Test Transmitter */}
        <div
          className={`mt-4 pt-3 border-t space-y-2 ${
            isLight ? 'border-slate-200' : 'border-zinc-800'
          }`}
        >
          <div
            className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
              isLight ? 'text-slate-600' : 'text-zinc-400'
            }`}
          >
            <span>Transmit Custom BLE Frame</span>
            <span className={isLight ? 'text-cyan-700 font-bold' : 'text-cyan-400'}>
              2.4 GHz ISM PHY
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
              placeholder="Enter text to frame as BLE ATT chunks..."
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border focus:outline-none focus:border-cyan-500 ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                  : 'bg-zinc-950 border-zinc-700 text-zinc-100'
              }`}
            />
            <button
              onClick={handleSendTest}
              disabled={isSending || !testInput.trim()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Inject BLE Frame</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
