import React, { useState } from 'react';
import { UIMode, ThemeMode } from '../types';
import { Radio, Hash, Plus, Link as LinkIcon, QrCode, Check, ClipboardPaste, ArrowRight } from 'lucide-react';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiMode: UIMode;
  themeMode?: ThemeMode;
  currentRoom: string;
  activeRooms: string[];
  onJoinRoom: (roomName: string, password?: string) => void;
  onOpenQR?: () => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  uiMode,
  themeMode = 'dark',
  currentRoom,
  activeRooms,
  onJoinRoom,
  onOpenQR,
}) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [pastedLinkInput, setPastedLinkInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const currentInviteUrl = `${baseUrl}?room=${encodeURIComponent(currentRoom)}`;

  const parseRoomFromLink = (input: string): string | null => {
    let clean = input.trim();
    if (!clean) return null;
    if (clean.includes('?room=')) {
      try {
        const urlObj = new URL(clean);
        const param = urlObj.searchParams.get('room');
        if (param) clean = param;
      } catch {
        const match = clean.match(/\?room=([^&]+)/);
        if (match && match[1]) {
          clean = decodeURIComponent(match[1]);
        }
      }
    } else if (clean.includes('?invite=')) {
      try {
        const urlObj = new URL(clean);
        const param = urlObj.searchParams.get('invite');
        if (param) clean = param;
      } catch {
        const match = clean.match(/\?invite=([^&]+)/);
        if (match && match[1]) {
          clean = decodeURIComponent(match[1]);
        }
      }
    }

    if (!clean.startsWith('#')) {
      clean = `#${clean.replace(/^#+/, '')}`;
    }
    return clean;
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    let name = newRoomName.trim();
    if (!name) return;
    if (!name.startsWith('#')) {
      name = `#${name}`;
    }
    onJoinRoom(name, roomPassword.trim() || undefined);
    setNewRoomName('');
    setRoomPassword('');
    onClose();
  };

  const handleJoinViaLink = (e: React.FormEvent) => {
    e.preventDefault();
    const extracted = parseRoomFromLink(pastedLinkInput);
    if (extracted) {
      onJoinRoom(extracted);
      setPastedLinkInput('');
      onClose();
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedLinkInput(text);
        const extracted = parseRoomFromLink(text);
        if (extracted) {
          onJoinRoom(extracted);
          setPastedLinkInput('');
          onClose();
        }
      }
    } catch {
      // Ignore if clipboard access disabled
    }
  };

  const handleCopyCurrentLink = () => {
    navigator.clipboard.writeText(currentInviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-md rounded-t-2xl sm:rounded-xl border p-5 shadow-2xl font-mono max-h-[90vh] overflow-y-auto ${
          isTerminal
            ? isLight
              ? 'bg-white border-slate-300 text-slate-800'
              : 'bg-zinc-950 border-emerald-500/50 text-emerald-300'
            : isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-zinc-900 border-zinc-700 text-zinc-100'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b ${
          isLight ? 'border-slate-200' : 'border-emerald-500/30'
        }`}>
          <div className="flex items-center gap-2">
            <Radio className={`w-5 h-5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            <span className="font-bold text-base">Mesh Channels & Room Invites</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded text-sm font-bold cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            ✕
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {/* Quick Actions: Share / QR */}
          <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${
            isLight
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-emerald-950/40 border-emerald-500/30'
          }`}>
            <button
              onClick={handleCopyCurrentLink}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition border cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <LinkIcon className="w-3.5 h-3.5 text-emerald-500" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Room Link'}</span>
            </button>

            {onOpenQR && (
              <button
                onClick={() => {
                  onClose();
                  onOpenQR();
                }}
                className={`py-1.5 px-3 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isLight
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code & Scan</span>
              </button>
            )}
          </div>

          {/* PASTE ROOM INVITE LINK / CODE */}
          <form
            onSubmit={handleJoinViaLink}
            className={`p-3 rounded-xl border space-y-2 ${
              isLight
                ? 'border-slate-200 bg-slate-50/80'
                : 'border-zinc-800 bg-zinc-900/80'
            }`}
          >
            <div className="text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ClipboardPaste className={`w-4 h-4 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
                <span className={isLight ? 'text-slate-800' : 'text-zinc-200'}>Paste Room Invite Link or Code</span>
              </span>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className={`text-[10px] hover:underline cursor-pointer ${
                  isLight ? 'text-cyan-700' : 'text-cyan-400'
                }`}
              >
                Paste Clipboard
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={pastedLinkInput}
                onChange={(e) => setPastedLinkInput(e.target.value)}
                placeholder="Paste link (e.g. https://...?room=%23rescue or #rescue)..."
                className={`flex-1 border outline-none px-3 py-1.5 rounded-lg text-xs ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-cyan-500'
                    : 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-400'
                }`}
              />
              <button
                type="submit"
                disabled={!pastedLinkInput.trim()}
                className="py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>Join</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Active Rooms List */}
          <div>
            <div className={`text-[11px] uppercase tracking-wider font-bold mb-2 ${
              isLight ? 'text-slate-500' : 'text-zinc-400'
            }`}>
              Active Mesh Channels
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {activeRooms.map((room) => (
                <button
                  key={room}
                  onClick={() => {
                    onJoinRoom(room);
                    onClose();
                  }}
                  className={`w-full p-2 rounded-lg text-left flex items-center justify-between transition cursor-pointer ${
                    currentRoom === room
                      ? isLight
                        ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                        : 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/50'
                      : isLight
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Hash className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                    <span>{room}</span>
                  </span>
                  {currentRoom === room && <span className={`text-[10px] font-bold ${isLight ? 'text-emerald-800' : 'text-amber-400'}`}>ACTIVE</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Join / Create Custom Room */}
          <form
            onSubmit={handleJoin}
            className={`p-3 rounded-xl border space-y-2 ${
              isLight
                ? 'border-slate-200 bg-slate-50/70'
                : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className={`text-xs font-bold flex items-center gap-1 ${
              isLight ? 'text-slate-800' : 'text-zinc-200'
            }`}>
              <Plus className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              <span>Create Channel (/join)</span>
            </div>

            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name (e.g. #disaster-relief)..."
              className={`w-full border outline-none px-3 py-1.5 rounded-lg text-xs ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                  : 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:border-emerald-400'
              }`}
            />

            <input
              type="password"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="Optional encryption password..."
              className={`w-full border outline-none px-3 py-1.5 rounded-lg text-xs ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                  : 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:border-emerald-400'
              }`}
            />

            <button
              type="submit"
              disabled={!newRoomName.trim()}
              className={`w-full py-1.5 font-bold rounded-lg text-xs transition cursor-pointer ${
                isLight
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50'
              }`}
            >
              Switch Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
