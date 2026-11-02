import React, { useEffect, useState } from 'react';
import { IncomingPairRequest } from '../lib/p2pMesh';
import { UIMode, ThemeMode } from '../types';
import { Smartphone, Check, X, Shield, Radio, Clock } from 'lucide-react';
import { playReceiveSound } from '../lib/sound';

interface PairingConfirmationModalProps {
  request: IncomingPairRequest | null;
  onAccept: (fromPeerId: string, fromNick: string) => void;
  onDecline: (fromPeerId: string) => void;
  uiMode: UIMode;
  themeMode?: ThemeMode;
}

export const PairingConfirmationModal: React.FC<PairingConfirmationModalProps> = ({
  request,
  onAccept,
  onDecline,
  uiMode,
  themeMode = 'dark',
}) => {
  const [timeLeft, setTimeLeft] = useState(45);
  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';

  useEffect(() => {
    if (!request) return;

    // Play chime on incoming request
    playReceiveSound();
    setTimeLeft(45);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDecline(request.fromPeerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-2xl border p-5 sm:p-6 shadow-2xl font-mono relative overflow-hidden ${
          isTerminal
            ? isLight
              ? 'bg-white border-emerald-500 text-slate-800'
              : 'bg-zinc-950 border-emerald-500 text-emerald-300 shadow-emerald-950/60'
            : isLight
            ? 'bg-white border-emerald-400 text-slate-900'
            : 'bg-zinc-900 border-emerald-500/80 text-zinc-100 shadow-black'
        }`}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 animate-pulse" />

        {/* Header Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 relative">
              <Smartphone className="w-5 h-5 animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide flex items-center gap-1.5 uppercase text-emerald-500">
                <span>Incoming Direct P2P Request</span>
              </div>
              <div className={`text-[11px] font-sans ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Phone-to-Phone Mesh Connection
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Content Box */}
        <div
          className={`p-4 rounded-xl border mb-5 space-y-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950/80 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Device / Handle:</span>
            <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
              @{request.fromNick}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Peer ID:</span>
            <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              {request.fromPeerId}
            </span>
          </div>

          {request.fromPin && (
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Pairing PIN:</span>
              <span className="text-base font-bold font-mono tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                {request.fromPin}
              </span>
            </div>
          )}

          <div className={`text-[11px] leading-relaxed pt-2 border-t ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-zinc-800/80 text-zinc-400'
          }`}>
            <Shield className="w-3.5 h-3.5 inline mr-1 text-emerald-500" />
            Accepting will establish an encrypted, zero-hop direct WebRTC channel between both phones for offline and local chatting.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onDecline(request.fromPeerId)}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800'
                : 'bg-rose-950/60 hover:bg-rose-900 border-rose-500/40 text-rose-300'
            }`}
          >
            <X className="w-4 h-4" />
            <span>Decline</span>
          </button>

          <button
            onClick={() => onAccept(request.fromPeerId, request.fromNick)}
            autoFocus
            className="py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition cursor-pointer active:scale-98"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Accept & Connect</span>
          </button>
        </div>
      </div>
    </div>
  );
};
