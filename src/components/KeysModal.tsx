import React, { useState } from 'react';
import { UIMode, ThemeMode } from '../types';
import { Key, Lock, Copy, Check, Eye, EyeOff, QrCode, UserCheck, Share2, Sparkles, Unlock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export type KeysModalTab = 'key' | 'qr' | 'profile';

interface KeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiMode: UIMode;
  themeMode?: ThemeMode;
  peerId: string;
  fingerprint: string;
  publicKeyBase64?: string;
  currentRoom: string;
  isEncrypted: boolean;
  nick: string;
  initialTab?: KeysModalTab;
  onUpdateNick: (newNick: string) => void;
  onSetRoomPassword: (roomId: string, password: string) => void;
  onClearRoomPassword: (roomId: string) => void;
}

export const KeysModal: React.FC<KeysModalProps> = ({
  isOpen,
  onClose,
  uiMode,
  themeMode = 'dark',
  peerId,
  fingerprint,
  publicKeyBase64,
  currentRoom,
  isEncrypted,
  nick,
  initialTab = 'key',
  onUpdateNick,
  onSetRoomPassword,
  onClearRoomPassword,
}) => {
  const [activeTab, setActiveTab] = useState<KeysModalTab>(initialTab);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [keySavedNotice, setKeySavedNotice] = useState(false);

  // Handle customization state
  const [customNick, setCustomNick] = useState(nick);
  const [nickSaved, setNickSaved] = useState(false);

  if (!isOpen) return null;

  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveNick = (e: React.FormEvent) => {
    e.preventDefault();
    if (customNick.trim() && customNick.trim() !== nick) {
      onUpdateNick(customNick.trim());
      setNickSaved(true);
      setTimeout(() => setNickSaved(false), 2000);
    }
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSetRoomPassword(currentRoom, password.trim());
      setPassword('');
      setKeySavedNotice(true);
      setTimeout(() => {
        setKeySavedNotice(false);
        onClose();
      }, 1000);
    }
  };

  // Generate shareable URL for QR Code
  const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const roomInviteUrl = `${origin}?room=${encodeURIComponent(currentRoom)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-lg rounded-t-2xl sm:rounded-xl border p-5 shadow-2xl font-mono max-h-[90vh] overflow-y-auto ${
          isTerminal
            ? isLight
              ? 'bg-white border-slate-300 text-slate-800'
              : 'bg-zinc-950 border-emerald-500/50 text-emerald-300'
            : isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-zinc-900 border-zinc-700 text-zinc-100'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isLight ? 'border-slate-200' : 'border-emerald-500/30'
        }`}>
          <div className="flex items-center gap-2">
            <Key className={`w-5 h-5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            <span className="font-bold text-base">Key Manager & Room Settings</span>
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

        {/* Navigation Tabs */}
        <div className={`flex items-center gap-1.5 mt-3 border-b pb-2 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
          <button
            onClick={() => setActiveTab('key')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'key'
                ? isLight
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow'
                : isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Lock className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            <span>Room Key</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'qr'
                ? isLight
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow'
                : isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <QrCode className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            <span>QR Room Invite</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'profile'
                ? isLight
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300 shadow-xs'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow'
                : isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <UserCheck className={`w-3.5 h-3.5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
            <span>Identity & Handle</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-4 space-y-4 text-xs">
          {/* TAB 1: DEDICATED ROOM AES-256 KEY ENTRY */}
          {activeTab === 'key' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-3 ${
                isLight ? 'border-emerald-200 bg-emerald-50/70' : 'border-emerald-500/40 bg-emerald-950/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                    <span className={`font-bold text-sm ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                      Message Encryption Key ({currentRoom})
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded font-bold ${
                      isEncrypted
                        ? isLight
                          ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                          : 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50'
                        : isLight
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {isEncrypted ? 'ENCRYPTED' : 'UNENCRYPTED'}
                  </span>
                </div>

                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Enter the shared passphrase for <strong className={isLight ? 'text-emerald-800' : 'text-emerald-300'}>{currentRoom}</strong>. Messages in this channel will be client-side encrypted with AES-256-GCM.
                </p>

                {keySavedNotice && (
                  <div className="p-2.5 bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-2 animate-bounce">
                    <Check className="w-4 h-4" />
                    <span>Encryption key active! Returning to chat...</span>
                  </div>
                )}

                <form onSubmit={handleSavePassword} className="space-y-3">
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Type room encryption key / passphrase..."
                      autoFocus
                      className={`w-full border outline-none px-3.5 py-2.5 rounded-lg text-xs pr-10 font-mono ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                          : 'bg-zinc-950 border-zinc-700 focus:border-emerald-400 text-white placeholder-zinc-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 cursor-pointer ${
                        isLight ? 'text-slate-400 hover:text-slate-800' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {isEncrypted ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClearRoomPassword(currentRoom);
                        }}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                          isLight
                            ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                            : 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-500/40'
                        }`}
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Clear Key</span>
                      </button>
                    ) : (
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                        Tip: You can also use <code className={isLight ? 'text-amber-700' : 'text-amber-400'}>/key passphrase</code> directly in chat.
                      </span>
                    )}

                    <button
                      type="submit"
                      disabled={!password.trim()}
                      className="ml-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Set Key & Apply</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: QR ROOM INVITATION */}
          {activeTab === 'qr' && (
            <div className={`p-3.5 rounded-xl border space-y-3 ${
              isLight ? 'border-emerald-200 bg-emerald-50/70' : 'border-emerald-500/30 bg-emerald-950/20'
            }`}>
              <div className={`flex items-center gap-1.5 font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                <QrCode className="w-4 h-4" />
                <span>Invite Peers to {currentRoom} via QR Code</span>
              </div>

              <div className={`flex flex-col sm:flex-row items-center gap-4 p-3 rounded-lg border ${
                isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'
              }`}>
                <div className="bg-white p-2.5 rounded-lg shadow-md flex-shrink-0 border border-slate-200">
                  <QRCodeSVG
                    value={roomInviteUrl}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Scan this QR code with any camera or smartphone to instantly join room <strong className={isLight ? 'text-emerald-800' : 'text-emerald-300'}>{currentRoom}</strong> in the mesh network.
                  </p>
                  <div className={`text-[10px] font-mono truncate max-w-xs ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                    {roomInviteUrl}
                  </div>
                  <button
                    onClick={() => handleCopy(roomInviteUrl, 'roomUrl')}
                    className={`w-full sm:w-auto px-3 py-1.5 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border ${
                      isLight
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        : 'bg-emerald-900/80 hover:bg-emerald-800 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    {copiedKey === 'roomUrl' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied Invite Link!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Copy Room Invite Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IDENTITY & HANDLE CUSTOMIZATION */}
          {activeTab === 'profile' && (
            <div className="space-y-3">
              {/* Display Name / Nickname Customization */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                isLight ? 'border-cyan-200 bg-cyan-50/70' : 'border-cyan-500/30 bg-cyan-950/20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-cyan-900' : 'text-cyan-300'}`}>
                    <UserCheck className={`w-4 h-4 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
                    <span>Handle & Name Customization</span>
                  </span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Current: @{nick}</span>
                </div>

                <form onSubmit={handleSaveNick} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={customNick}
                    onChange={(e) => setCustomNick(e.target.value)}
                    placeholder="Enter new display handle..."
                    maxLength={20}
                    className={`flex-1 border outline-none px-3 py-1.5 rounded text-xs font-mono ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-800 focus:border-cyan-500'
                        : 'bg-zinc-950 border-zinc-700 focus:border-cyan-400 text-white'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!customNick.trim() || customNick.trim() === nick}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold rounded text-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    {nickSaved ? <Check className="w-3.5 h-3.5 text-white" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{nickSaved ? 'Updated!' : 'Save Name'}</span>
                  </button>
                </form>
              </div>

              {/* Peer Cryptographic Identity Box */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-900/60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>Node Identity</span>
                  <span className={`font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>ID: {peerId}</span>
                </div>

                <div className={`flex items-center justify-between p-2 rounded border ${
                  isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}>
                  <div>
                    <div className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>SHA-256 Fingerprint</div>
                    <div className={`font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{fingerprint || 'Computing...'}</div>
                  </div>
                  <button
                    onClick={() => handleCopy(fingerprint, 'fp')}
                    className={`p-1.5 rounded cursor-pointer ${
                      isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-900' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    title="Copy fingerprint"
                  >
                    {copiedKey === 'fp' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`pt-3 border-t flex justify-end ${isLight ? 'border-slate-200' : 'border-emerald-500/30'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded text-xs font-bold cursor-pointer transition ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
