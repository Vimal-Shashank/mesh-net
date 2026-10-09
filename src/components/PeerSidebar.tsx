import React, { useState } from 'react';
import { Peer, UIMode, ThemeMode } from '../types';
import { getNickColor } from '../lib/crypto';
import { Users, MessageSquare, Copy, Check, Radio, ShieldCheck, RefreshCw, X } from 'lucide-react';

interface PeerSidebarProps {
  peers: Peer[];
  currentPeerId: string;
  uiMode: UIMode;
  themeMode?: ThemeMode;
  onSelectDM?: (nick: string) => void;
  onRefreshPeers?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const SignalBars: React.FC<{ latencyMs?: number }> = ({ latencyMs = 14 }) => {
  let bars = 4;
  let color = 'bg-emerald-400';
  let textColor = 'text-emerald-400';
  if (latencyMs > 150) {
    bars = 1;
    color = 'bg-rose-500';
    textColor = 'text-rose-400';
  } else if (latencyMs > 80) {
    bars = 2;
    color = 'bg-amber-400';
    textColor = 'text-amber-400';
  } else if (latencyMs > 40) {
    bars = 3;
    color = 'bg-emerald-400';
    textColor = 'text-emerald-400';
  } else {
    bars = 4;
    color = 'bg-emerald-400';
    textColor = 'text-emerald-400';
  }

  return (
    <div
      className="flex items-center gap-1.5 px-1 py-0.5 rounded group/sig relative"
      title={`Hop Latency: ${latencyMs}ms (${bars}/4 Signal Strength)`}
    >
      <span className={`text-[10px] font-mono opacity-60 ${textColor}`}>{latencyMs}ms</span>
      <div className="flex items-end gap-[2px] h-3">
        <span className={`w-[2.5px] h-1 rounded-2xs ${bars >= 1 ? color : 'bg-zinc-700/60'}`} />
        <span className={`w-[2.5px] h-1.5 rounded-2xs ${bars >= 2 ? color : 'bg-zinc-700/60'}`} />
        <span className={`w-[2.5px] h-2 rounded-2xs ${bars >= 3 ? color : 'bg-zinc-700/60'}`} />
        <span className={`w-[2.5px] h-2.5 rounded-2xs ${bars >= 4 ? color : 'bg-zinc-700/60'}`} />
      </div>
    </div>
  );
};

function formatLastSeen(ts: number): string {
  if (!ts) return 'Offline';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export const PeerSidebar: React.FC<PeerSidebarProps> = ({
  peers,
  currentPeerId,
  uiMode,
  themeMode = 'dark',
  onSelectDM,
  onRefreshPeers,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefreshPeers) {
      onRefreshPeers();
    }
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';
  const onlinePeers = peers.filter((p) => p.isOnline);
  const offlinePeers = peers.filter((p) => !p.isOnline);

  const renderPeerItem = (peer: Peer, isOnline: boolean) => {
    const isSelf = peer.id === currentPeerId;
    const nickColor = isOnline ? getNickColor(peer.nick) : (isLight ? '#94a3b8' : '#71717a');

    return (
      <div
        key={peer.id}
        onClick={() => !isSelf && isOnline && onSelectDM && onSelectDM(peer.nick)}
        className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md transition text-xs font-mono ${
          !isOnline ? 'opacity-60 cursor-default' : 'cursor-pointer'
        } ${
          isTerminal
            ? isLight
              ? 'hover:bg-slate-200 text-slate-900'
              : 'hover:bg-emerald-950/40 text-emerald-300'
            : isLight
            ? 'hover:bg-slate-100 text-slate-800 border border-transparent hover:border-slate-200'
            : 'hover:bg-zinc-800/80 text-zinc-200 border border-transparent hover:border-zinc-700/50'
        }`}
      >
        {/* Peer Nick & Status */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
              isOnline ? 'bg-emerald-500' : isLight ? 'bg-slate-400' : 'bg-zinc-600'
            }`}
          />
          <span className="font-semibold truncate" style={{ color: nickColor }}>
            {peer.nick}
          </span>
          {isSelf && <span className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>(you)</span>}
          {!isOnline && (
            <span className={`text-[10px] font-mono italic ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
              ({formatLastSeen(peer.lastSeen)})
            </span>
          )}
        </div>

        {/* Actions & Details */}
        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
          {isOnline ? (
            <SignalBars latencyMs={peer.latencyMs || (isSelf ? 2 : 18)} />
          ) : (
            <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-600'}`}>Offline</span>
          )}

          {peer.publicKey && isOnline && (
            <ShieldCheck className="w-3 h-3 text-emerald-500" title="E2E DM Key Ready" />
          )}

          <button
            onClick={(e) => handleCopyId(peer.id, e)}
            className={`p-1 rounded transition ${
              isLight
                ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                : 'hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200'
            }`}
            title={`Copy Peer ID (${peer.id})`}
          >
            {copiedId === peer.id ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>

          {!isSelf && isOnline && onSelectDM && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectDM(peer.nick);
              }}
              className={`p-1 rounded transition ${
                isLight
                  ? 'hover:bg-emerald-100 text-emerald-700'
                  : 'hover:bg-emerald-900/50 text-emerald-400'
              }`}
              title={`Send Private DM (/msg ${peer.nick})`}
            >
              <MessageSquare className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const peerListContent = (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div
        className={`px-3 py-2 border-b flex items-center justify-between select-none ${
          isTerminal
            ? isLight
              ? 'bg-slate-100 border-slate-300 text-slate-800 font-mono text-xs'
              : 'bg-zinc-950 border-emerald-500/30 text-emerald-400 font-mono text-xs'
            : isLight
            ? 'bg-slate-50 border-slate-200 text-slate-800 font-sans text-xs font-semibold'
            : 'bg-zinc-900 border-zinc-800 text-zinc-300 font-sans text-xs font-semibold'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Users className={`w-3.5 h-3.5 flex-shrink-0 ${isLight ? 'text-emerald-600' : isTerminal ? 'text-emerald-400' : 'text-cyan-400'}`} />
          <span className="tracking-wider uppercase truncate">
            PEERS ({onlinePeers.length} online)
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleRefreshClick}
            className={`p-1.5 rounded-md active:scale-95 transition ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
            }`}
            title="Refresh discovery & peer list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          {isOpenMobile && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className={`lg:hidden p-1.5 rounded-lg active:scale-95 transition ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-300'
                  : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
              }`}
              aria-label="Close peers sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Peer List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {peers.length === 0 ? (
          <div className={`p-4 text-center text-xs font-mono space-y-2 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
            <p>Searching mesh... No external peers discovered yet.</p>
            <button
              onClick={handleRefreshClick}
              className={`px-2.5 py-1 text-[11px] rounded transition ${
                isLight
                  ? 'bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white'
              }`}
            >
              Scan local network
            </button>
          </div>
        ) : (
          <>
            {/* ONLINE PEERS SECTION */}
            <div className="space-y-1">
              <div className={`px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase font-bold flex items-center justify-between ${
                isLight ? 'text-emerald-700' : 'text-emerald-400/90'
              }`}>
                <span>ONLINE PEERS ({onlinePeers.length})</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              {onlinePeers.length === 0 ? (
                <div className={`px-2 py-1 text-[11px] font-mono italic ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                  No peers currently active online
                </div>
              ) : (
                onlinePeers.map((peer) => renderPeerItem(peer, true))
              )}
            </div>

            {/* OFFLINE PEERS SECTION */}
            {offlinePeers.length > 0 && (
              <div className={`space-y-1 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800/60'}`}>
                <div className={`px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase font-bold flex items-center justify-between ${
                  isLight ? 'text-slate-500' : 'text-zinc-500'
                }`}>
                  <span>OFFLINE PEERS ({offlinePeers.length})</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-slate-400' : 'bg-zinc-600'}`} />
                </div>
                {offlinePeers.map((peer) => renderPeerItem(peer, false))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Mesh Signal Footer */}
      <div
        className={`p-2.5 border-t text-[11px] font-mono flex items-center justify-between ${
          isTerminal
            ? isLight
              ? 'bg-slate-100 border-slate-300 text-slate-600'
              : 'bg-zinc-950 border-emerald-500/30 text-emerald-600'
            : isLight
            ? 'bg-slate-50 border-slate-200 text-slate-500'
            : 'bg-zinc-900/80 border-zinc-800 text-zinc-500'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-emerald-500" />
          <span>mDNS LAN Mesh</span>
        </span>
        <button
          onClick={handleRefreshClick}
          className={`text-[10px] underline cursor-pointer ${
            isLight ? 'text-slate-500 hover:text-emerald-700' : 'text-zinc-500 hover:text-emerald-400'
          }`}
        >
          Auto-Refreshing
        </button>
      </div>
    </div>
  );

  // Desktop sidebar container
  return (
    <>
      <aside
        className={`hidden lg:block w-64 border-l flex-shrink-0 transition-colors ${
          isTerminal
            ? isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-zinc-950 border-emerald-500/30'
            : isLight
            ? 'bg-white border-slate-200'
            : 'bg-zinc-900/50 border-zinc-800/80'
        }`}
      >
        {peerListContent}
      </aside>

      {/* Mobile drawer backdrop */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden" onClick={onCloseMobile}>
          <div
            className={`absolute right-0 top-0 bottom-0 w-72 z-50 transition-colors ${
              isTerminal
                ? isLight
                  ? 'bg-slate-50 border-l border-slate-300'
                  : 'bg-zinc-950 border-l border-emerald-500/40'
                : isLight
                ? 'bg-white border-l border-slate-200'
                : 'bg-zinc-900 border-l border-zinc-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {peerListContent}
          </div>
        </div>
      )}
    </>
  );
};
