import React from 'react';
import { UIMode, ThemeMode } from '../types';
import { HelpCircle, Terminal, Shield, Flame, Radio, Cpu, MessageSquare, Zap } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiMode: UIMode;
  themeMode?: ThemeMode;
  onSelectCommand?: (cmdSyntax: string) => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  uiMode,
  themeMode = 'dark',
  onSelectCommand,
}) => {
  if (!isOpen) return null;

  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';

  const commands = [
    { syntax: '/join #disaster-relief [password]', desc: 'Switch to a channel or join an encrypted channel using a shared password.' },
    { syntax: '/msg <nick> <text>', desc: 'Send a private direct message to a peer.' },
    { syntax: '/nick <new_name>', desc: 'Change display nickname live on the mesh.' },
    { syntax: '/timer <seconds|off>', desc: 'Set disappearing self-destruct timer for messages (5, 10, 30, 60, 300).' },
    { syntax: '/who', desc: 'List all known mesh peers, Peer IDs, and reachability status.' },
    { syntax: '/clear', desc: 'Clear local chat transcript.' },
    { syntax: '/keys', desc: 'View cryptographic identity fingerprints and AES-256 room keys.' },
    { syntax: '/qr', desc: 'Open QR code room invite generator & live camera scanner.' },
    { syntax: '/ble', desc: 'Open Web Bluetooth BLE Mesh Transceiver Manager.' },
    { syntax: '/help', desc: 'Show this interactive help guide.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-2xl rounded-t-2xl sm:rounded-xl border p-5 shadow-2xl font-mono max-h-[90vh] flex flex-col ${
          isTerminal
            ? isLight
              ? 'bg-white border-slate-300 text-slate-800 shadow-xl'
              : 'bg-zinc-950 border-emerald-500/50 text-emerald-300'
            : isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-xl'
            : 'bg-zinc-900 border-zinc-700 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isLight ? 'border-slate-200' : 'border-emerald-500/30'
        }`}>
          <div className="flex items-center gap-2">
            <HelpCircle className={`w-5 h-5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            <span className="font-bold text-base tracking-wide">meshnet Command Reference & Architecture</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded text-sm font-bold ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          {/* Key Features Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3 rounded border ${
              isLight ? 'border-emerald-200 bg-emerald-50/70' : 'border-emerald-500/20 bg-emerald-950/20'
            }`}>
              <div className={`flex items-center gap-1.5 font-bold mb-1 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                <Radio className="w-4 h-4" />
                <span>Zero-Server Mesh</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Nodes auto-discover peers via mDNS on local Wi-Fi / hotspot. Messages are gossiped peer-to-peer.
              </p>
            </div>

            <div className={`p-3 rounded border ${
              isLight ? 'border-emerald-200 bg-emerald-50/70' : 'border-emerald-500/20 bg-emerald-950/20'
            }`}>
              <div className={`flex items-center gap-1.5 font-bold mb-1 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                <Shield className="w-4 h-4" />
                <span>AES-256-GCM E2EE</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Password-protected rooms encrypt content completely client-side. The network relay only sees ciphertext.
              </p>
            </div>

            <div className={`p-3 rounded border ${
              isLight ? 'border-amber-200 bg-amber-50/70' : 'border-amber-500/20 bg-amber-950/20'
            }`}>
              <div className={`flex items-center gap-1.5 font-bold mb-1 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                <Flame className="w-4 h-4" />
                <span>Disappearing Messages</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Set self-destruct timers (`/timer 30`). Expired messages burn permanently with visual countdown timers.
              </p>
            </div>

            <div className={`p-3 rounded border ${
              isLight ? 'border-purple-200 bg-purple-50/70' : 'border-purple-500/20 bg-purple-950/20'
            }`}>
              <div className={`flex items-center gap-1.5 font-bold mb-1 ${isLight ? 'text-purple-800' : 'text-purple-400'}`}>
                <MessageSquare className="w-4 h-4" />
                <span>Private DMs & Log Backup</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                <code className={isLight ? 'text-amber-700' : 'text-amber-400'}>/msg &lt;nick&gt;</code> opens private channels. Offline history backfills backlog lines on startup.
              </p>
            </div>
          </div>

          {/* Slash Command Table */}
          <div>
            <h4 className={`font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${
              isLight ? 'text-emerald-800' : 'text-emerald-400'
            }`}>
              <Zap className="w-4 h-4" />
              <span>Slash Commands (Click to use)</span>
            </h4>
            <div className="space-y-1.5">
              {commands.map((cmd) => (
                <div
                  key={cmd.syntax}
                  onClick={() => {
                    if (onSelectCommand) {
                      onSelectCommand(cmd.syntax.split(' ')[0]);
                      onClose();
                    }
                  }}
                  className={`p-2 rounded border cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-1 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-emerald-500/40'
                  }`}
                >
                  <span className={`font-bold text-xs ${isLight ? 'text-emerald-700' : 'text-amber-400'}`}>{cmd.syntax}</span>
                  <span className={`text-[11px] sm:text-right ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>{cmd.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`pt-3 border-t flex justify-end ${
          isLight ? 'border-slate-200' : 'border-emerald-500/30'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded text-xs font-bold transition cursor-pointer border ${
              isLight
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
