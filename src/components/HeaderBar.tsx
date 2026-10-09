import React, { useState } from 'react';
import { UIMode, DisappearingTimer, TerminalPalette, ThemeMode } from '../types';
import { PALETTES, getPaletteTheme } from '../lib/theme';
import {
  Lock,
  Unlock,
  Flame,
  Volume2,
  VolumeX,
  Terminal,
  Layout,
  HelpCircle,
  Key,
  Users,
  Radio,
  Palette,
  Keyboard,
  Edit3,
  Menu,
  X,
  Sliders,
  ShieldCheck,
  Bluetooth,
  QrCode,
  Sun,
  Moon,
  Maximize,
  Minimize,
} from 'lucide-react';

interface HeaderBarProps {
  uiMode: UIMode;
  setUiMode: (mode: UIMode) => void;
  palette: TerminalPalette;
  setPalette: (palette: TerminalPalette) => void;
  themeMode?: ThemeMode;
  setThemeMode?: (mode: ThemeMode) => void;
  currentRoom: string;
  nick: string;
  peerId: string;
  peersCount: number;
  isEncrypted: boolean;
  timerSeconds: DisappearingTimer;
  typingPeers?: string[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenHelp: () => void;
  onOpenKeys: () => void;
  onOpenRooms: () => void;
  onOpenBluetooth: () => void;
  bleConnected?: boolean;
  onOpenShortcuts: () => void;
  onOpenQR?: () => void;
  onTogglePeerSidebar?: () => void;
  isSidebarOpen?: boolean;
  isMobileSheetOpen?: boolean;
  setIsMobileSheetOpen?: (open: boolean) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  uiMode,
  setUiMode,
  palette,
  setPalette,
  themeMode = 'dark',
  setThemeMode,
  currentRoom,
  nick,
  peerId,
  peersCount,
  isEncrypted,
  timerSeconds,
  typingPeers = [],
  soundEnabled,
  onToggleSound,
  onOpenHelp,
  onOpenKeys,
  onOpenRooms,
  onOpenBluetooth,
  bleConnected = false,
  onOpenShortcuts,
  onOpenQR,
  onTogglePeerSidebar,
  isSidebarOpen,
  isMobileSheetOpen,
  setIsMobileSheetOpen,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [internalShowMobileSheet, setInternalShowMobileSheet] = useState(false);
  const showMobileSheet = isMobileSheetOpen !== undefined ? isMobileSheetOpen : internalShowMobileSheet;
  const setShowMobileSheet = (open: boolean) => {
    if (setIsMobileSheetOpen) setIsMobileSheetOpen(open);
    else setInternalShowMobileSheet(open);
  };
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const isLight = themeMode === 'light';
  const theme = getPaletteTheme(palette, (themeMode as ThemeMode) || 'dark');
  const isTerminal = uiMode === 'terminal';

  return (
    <header
      className={`relative z-30 font-mono text-xs select-none border-b transition-colors duration-200 ${
        isTerminal
          ? `${theme.headerBg} ${theme.textClass} ${theme.borderClass}`
          : isLight
          ? 'bg-white/95 text-slate-800 border-slate-200 shadow-xs'
          : 'bg-zinc-900/95 text-zinc-100 border-zinc-800'
      }`}
    >
      {/* Top Header Bar */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Left Section: Brand & Room */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 font-bold tracking-wider flex-shrink-0">
            <Radio className="w-4 h-4 text-emerald-500" />
            <span className={`text-sm font-bold tracking-tight ${isLight && !isTerminal ? 'text-slate-900' : ''}`}>
              meshnet
            </span>
          </div>

          <span className={`${isLight ? 'text-slate-400' : 'text-zinc-600'} font-normal hidden sm:inline`}>▸</span>

          {/* Room Button */}
          <button
            onClick={onOpenRooms}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-bold text-xs transition truncate max-w-[130px] sm:max-w-[200px] ${
              isTerminal
                ? isLight
                  ? 'bg-white hover:bg-emerald-100/60 border-emerald-600/30 text-emerald-950'
                  : `bg-zinc-900/80 hover:bg-zinc-800 ${theme.borderClass}`
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-300 text-emerald-700'
                : 'bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-emerald-400'
            }`}
            title="Switch channel [Ctrl+J]"
          >
            <span className="truncate">{currentRoom}</span>
            {isEncrypted ? (
              <Lock className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            ) : (
              <Unlock className={`w-3 h-3 ${isLight ? 'text-slate-400' : 'text-zinc-500'} flex-shrink-0`} />
            )}
          </button>

          {/* Typing Indicator */}
          {typingPeers.length > 0 && (
            <div className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] ${
              isLight
                ? 'bg-amber-100 border border-amber-300 text-amber-900'
                : 'bg-amber-950/70 border border-amber-500/40 text-amber-300'
            }`}>
              <Edit3 className="w-3 h-3 text-amber-500" />
              <span className="font-semibold truncate max-w-[120px]">
                {typingPeers.join(', ')} typing...
              </span>
            </div>
          )}
        </div>

        {/* Right Section: Desktop Controls */}
        <div className="hidden md:flex items-center gap-2">
          {/* Identity Tag */}
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${
            isLight
              ? 'bg-slate-100 border-slate-200 text-slate-700'
              : 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
          }`}>
            <span className={isLight ? 'text-slate-400' : 'text-zinc-500'}>you:</span>
            <span className="text-amber-500 font-semibold">{nick}</span>
          </div>

          {/* Palette Picker */}
          {isTerminal && (
            <button
              onClick={() => setShowPaletteMenu(!showPaletteMenu)}
              className={`p-1.5 rounded-lg border ${theme.borderClass} transition ${
                isLight ? 'hover:bg-slate-200/70' : 'hover:bg-zinc-800/60'
              }`}
              title={`Color Palette (${theme.name}) [Ctrl+T]`}
            >
              <Palette className="w-4 h-4" style={{ color: theme.hexColor }} />
            </button>
          )}

          {/* Theme Mode Toggle (Dark / Light) */}
          {setThemeMode && (
            <button
              onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition active:scale-95 ${
                isLight
                  ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-300 text-amber-900 shadow-xs'
                  : isTerminal
                  ? `bg-zinc-900/80 hover:bg-zinc-800 ${theme.borderClass} text-amber-300`
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
              }`}
              title={`Switch to ${themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'} [Ctrl+D]`}
            >
              {themeMode === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{themeMode === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          )}

          {/* Keyboard Shortcuts */}
          <button
            onClick={onOpenShortcuts}
            className={`p-1.5 rounded-lg border transition ${
              isTerminal
                ? `${theme.borderClass} ${isLight ? 'hover:bg-slate-200/70' : 'hover:bg-zinc-800/60'}`
                : isLight
                ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800/60'
            }`}
            title="Shortcuts Cheat Sheet [Ctrl+?]"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Disappearing Timer Indicator */}
          {timerSeconds > 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono border ${
              isLight
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
            }`}>
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{timerSeconds}s burn</span>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg border transition ${
              isTerminal
                ? `${theme.borderClass} ${isLight ? 'hover:bg-slate-200/70' : 'hover:bg-zinc-800/60'}`
                : isLight
                ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800/60'
            }`}
            title={soundEnabled ? 'Mute audio' : 'Enable audio'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <VolumeX className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
            )}
          </button>

          {/* Keys Button */}
          <button
            onClick={onOpenKeys}
            className={`p-1.5 rounded-lg border transition ${
              isTerminal
                ? `${theme.borderClass} ${isLight ? 'hover:bg-slate-200/70' : 'hover:bg-zinc-800/60'}`
                : isLight
                ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800/60'
            }`}
            title="Encryption keys (/keys) [Ctrl+K]"
          >
            <Key className="w-4 h-4" />
          </button>

          {/* QR Code / Share Room Button */}
          {onOpenQR && (
            <button
              onClick={onOpenQR}
              className={`p-1.5 rounded-lg border transition ${
                isLight
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-zinc-800/60'
              }`}
              title="Share / Scan QR Code & Room Invite"
            >
              <QrCode className="w-4 h-4 text-emerald-500" />
            </button>
          )}

          {/* Bluetooth BLE Button */}
          <button
            onClick={onOpenBluetooth}
            className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-semibold transition active:scale-95 ${
              bleConnected
                ? isLight
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-xs'
                  : 'bg-emerald-950 border-emerald-500/60 text-emerald-300 shadow-sm'
                : isLight
                ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-900'
                : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/50 text-cyan-300'
            }`}
            title={bleConnected ? 'Bluetooth Device Connected (Active Link)' : 'Web Bluetooth BLE Mesh Transceiver'}
          >
            <Bluetooth className={`w-3.5 h-3.5 ${bleConnected ? 'text-emerald-500 animate-pulse' : 'text-cyan-500'}`} />
            <span>{bleConnected ? 'BLE Linked' : 'BLE Mesh'}</span>
            {bleConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
          </button>

          {/* Help Button */}
          <button
            onClick={onOpenHelp}
            className={`p-1.5 rounded-lg border transition ${
              isTerminal
                ? `${theme.borderClass} ${isLight ? 'hover:bg-slate-200/70' : 'hover:bg-zinc-800/60'}`
                : isLight
                ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800/60'
            }`}
            title="Command Reference (/help)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* UI Mode Toggle */}
          <button
            onClick={() => setUiMode(uiMode === 'terminal' ? 'modern' : 'terminal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                : isTerminal
                ? `bg-zinc-900 hover:bg-zinc-800 ${theme.borderClass} text-zinc-200`
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
            }`}
            title="Toggle View Mode [Ctrl+M]"
          >
            {isTerminal ? <Layout className="w-3.5 h-3.5 text-cyan-500" /> : <Terminal className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{isTerminal ? 'GUI' : 'Terminal'}</span>
          </button>

          {/* Peers Toggle */}
          {onTogglePeerSidebar && (
            <button
              onClick={onTogglePeerSidebar}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition ${
                isSidebarOpen
                  ? isLight
                    ? 'bg-cyan-100 border-cyan-400 text-cyan-900 shadow-xs'
                    : 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-500" />
              <span>{peersCount}</span>
            </button>
          )}

          {/* Menu / Settings Drawer Toggle */}
          <button
            id="desktop-menu-toggle-btn"
            onClick={() => setShowMobileSheet(true)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isTerminal
                ? `${theme.borderClass} ${isLight ? 'hover:bg-slate-200/70' : 'hover:bg-zinc-800/60'}`
                : isLight
                ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800/60'
            }`}
            title="Open MeshNet Menu & Tools Sheet"
          >
            <Sliders className="w-4 h-4 text-emerald-500" />
          </button>

          {/* Fullscreen Toggle (Desktop) */}
          {onToggleFullscreen && (
            <button
              id="desktop-fullscreen-toggle-btn"
              onClick={onToggleFullscreen}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isFullscreen
                  ? isLight
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-xs'
                    : 'bg-emerald-950 border-emerald-500/60 text-emerald-300'
                  : isTerminal
                  ? `${theme.borderClass} ${isLight ? 'hover:bg-slate-200/70' : 'hover:bg-zinc-800/60'}`
                  : isLight
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800/60'
              }`}
              title={isFullscreen ? 'Exit Full Screen [F11 / Esc]' : 'Enter Desktop Full Screen Mode [F11]'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-emerald-500" /> : <Maximize className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Mobile Action Controls */}
        <div className="flex md:hidden items-center gap-1.5">
          {/* Quick Theme Toggle for Mobile Header */}
          {setThemeMode && (
            <button
              onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-lg border active:scale-95 transition ${
                isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-zinc-900 border-zinc-800 text-amber-400'
              }`}
              title={`Switch to ${themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}`}
              aria-label="Toggle light or dark theme"
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          )}

          {/* Peer Drawer Toggle */}
          {onTogglePeerSidebar && (
            <button
              onClick={onTogglePeerSidebar}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold active:scale-95 transition ${
                isSidebarOpen
                  ? isLight
                    ? 'bg-cyan-100 border-cyan-400 text-cyan-900'
                    : 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-500" />
              <span>{peersCount}</span>
            </button>
          )}

          {/* Quick Settings Sheet Button */}
          <button
            onClick={() => setShowMobileSheet(true)}
            className={`p-2 rounded-lg border active:scale-95 transition ${
              isLight
                ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
            }`}
            aria-label="Open settings menu"
          >
            <Sliders className="w-4 h-4 text-emerald-500" />
          </button>
        </div>
      </div>

      {/* Typing Indicator Banner for Mobile */}
      {typingPeers.length > 0 && (
        <div className="sm:hidden px-3 py-1 bg-amber-950/80 border-t border-amber-500/30 text-amber-300 text-[11px] font-mono flex items-center gap-1.5">
          <Edit3 className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span className="truncate">
            <strong className="text-amber-200">{typingPeers.join(', ')}</strong> is typing...
          </span>
        </div>
      )}

      {/* Terminal Palette Selection Dropdown (Desktop) */}
      {showPaletteMenu && isTerminal && (
        <div className={`absolute top-full right-3 mt-1.5 w-56 rounded-xl border p-2 shadow-2xl z-50 text-xs font-mono ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
            : 'bg-zinc-950 border-zinc-700 text-zinc-100'
        }`}>
          <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-b mb-1.5 flex justify-between items-center ${
            isLight ? 'text-slate-500 border-slate-200' : 'text-zinc-400 border-zinc-800'
          }`}>
            <span>Terminal Theme</span>
            <span className={isLight ? 'text-slate-400' : 'text-zinc-500'}>[Ctrl+T]</span>
          </div>
          <div className="space-y-1">
            {Object.values(PALETTES).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPalette(p.id);
                  setShowPaletteMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition flex items-center justify-between cursor-pointer ${
                  palette === p.id
                    ? isLight
                      ? 'bg-slate-100 font-bold text-slate-900 border border-emerald-500'
                      : 'bg-zinc-800 font-bold text-white border border-zinc-700'
                    : isLight
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: p.hexColor }} />
                  <span>{p.name}</span>
                </span>
                {palette === p.id && <span className={`text-[10px] font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>ACTIVE</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Settings Bottom Drawer / Sheet */}
      {showMobileSheet && (
        <div className={`fixed inset-0 z-50 ${isLight ? 'bg-black/50' : 'bg-black/70'} backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150`}>
          <div
            className="fixed inset-0"
            onClick={() => setShowMobileSheet(false)}
          />

          <div className={`relative z-10 rounded-t-2xl p-4 space-y-4 max-h-[85vh] overflow-y-auto font-mono text-xs border-t shadow-2xl ${
            isLight
              ? 'bg-white border-slate-200 text-slate-800'
              : 'bg-zinc-950 border-zinc-800 text-zinc-100'
          }`}>
            {/* Grab Handle */}
            <div className={`w-12 h-1 rounded-full mx-auto ${isLight ? 'bg-slate-300' : 'bg-zinc-700'}`} />

            <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <Sliders className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span className={`font-bold text-sm uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Mobile Mesh Settings</span>
              </div>
              <button
                onClick={() => setShowMobileSheet(false)}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  isLight
                    ? 'text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200'
                    : 'text-zinc-400 hover:text-white bg-zinc-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Node Info */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-zinc-900 border-zinc-800'
            }`}>
              <div>
                <div className={`text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Your Mesh Node</div>
                <div className={`font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>{nick}</div>
              </div>
              <div className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>{peerId}</div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* QR Code Scan / Share */}
              {onOpenQR && (
                <button
                  onClick={() => {
                    setShowMobileSheet(false);
                    onOpenQR();
                  }}
                  className={`p-3 rounded-xl text-left flex flex-col gap-1 transition cursor-pointer border ${
                    isLight
                      ? 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-300'
                      : 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-500/40'
                  }`}
                >
                  <div className={`flex items-center justify-between font-bold ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                    <span>QR Code & Scan</span>
                    <QrCode className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  </div>
                  <div className={`text-[11px] ${isLight ? 'text-emerald-700' : 'text-emerald-200/80'}`}>Share/Scan Invites</div>
                </button>
              )}

              {/* Bluetooth BLE Transceiver */}
              <button
                onClick={() => {
                  setShowMobileSheet(false);
                  onOpenBluetooth();
                }}
                className={`p-3 border rounded-xl text-left flex flex-col gap-1 transition cursor-pointer ${
                  bleConnected
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-emerald-950/80 border-emerald-500/60'
                    : isLight
                    ? 'bg-cyan-50 hover:bg-cyan-100/80 border-cyan-300'
                    : 'bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-500/40'
                }`}
              >
                <div className={`flex items-center justify-between font-bold ${
                  bleConnected
                    ? isLight ? 'text-emerald-900' : 'text-emerald-300'
                    : isLight ? 'text-cyan-900' : 'text-cyan-300'
                }`}>
                  <span>{bleConnected ? 'BLE Linked' : 'Bluetooth BLE'}</span>
                  <Bluetooth className={`w-3.5 h-3.5 ${
                    bleConnected
                      ? isLight ? 'text-emerald-600 animate-pulse' : 'text-emerald-400 animate-pulse'
                      : isLight ? 'text-cyan-600' : 'text-cyan-400'
                  }`} />
                </div>
                <div className={`text-[11px] ${
                  bleConnected
                    ? isLight ? 'text-emerald-700' : 'text-emerald-300/90'
                    : isLight ? 'text-cyan-700' : 'text-cyan-200/80'
                }`}>
                  {bleConnected ? 'Radio Transceiver Active' : 'Pair Local BLE / P2P Node'}
                </div>
              </button>

              {/* Room Selector */}
              <button
                onClick={() => {
                  setShowMobileSheet(false);
                  onOpenRooms();
                }}
                className={`p-3 rounded-xl text-left flex flex-col gap-1 transition cursor-pointer border ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
                }`}
              >
                <div className={`flex items-center justify-between font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                  <span>Switch Channel</span>
                  <Radio className="w-3.5 h-3.5" />
                </div>
                <div className={`text-[11px] truncate ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>{currentRoom}</div>
              </button>

              {/* Encryption Keys */}
              <button
                onClick={() => {
                  setShowMobileSheet(false);
                  onOpenKeys();
                }}
                className={`p-3 rounded-xl text-left flex flex-col gap-1 transition cursor-pointer border ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
                }`}
              >
                <div className={`flex items-center justify-between font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                  <span>AES Security</span>
                  {isEncrypted ? (
                    <Lock className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  ) : (
                    <Unlock className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                  )}
                </div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  {isEncrypted ? 'AES-256 Active' : 'Unencrypted'}
                </div>
              </button>

              {/* Theme Mode Toggle */}
              {setThemeMode && (
                <button
                  onClick={() => {
                    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    isLight
                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-300'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className={isLight ? 'text-amber-900' : 'text-amber-400'}>
                      {themeMode === 'dark' ? 'Light Theme' : 'Dark Theme'}
                    </span>
                    {themeMode === 'dark' ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                  </div>
                  <div className={`text-[11px] ${isLight ? 'text-amber-800/80' : 'text-zinc-400'}`}>
                    Active: {themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </div>
                </button>
              )}

              {/* View Mode */}
              <button
                onClick={() => {
                  setUiMode(uiMode === 'terminal' ? 'modern' : 'terminal');
                }}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
                }`}
              >
                <div className={`flex items-center justify-between font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-500'}`}>
                  <span>UI Layout</span>
                  {isTerminal ? <Terminal className="w-3.5 h-3.5" /> : <Layout className="w-3.5 h-3.5" />}
                </div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  {isTerminal ? 'Retro Terminal' : 'Tactical GUI'}
                </div>
              </button>

              {/* Shortcuts Sheet */}
              <button
                onClick={() => {
                  setShowMobileSheet(false);
                  onOpenShortcuts();
                }}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
                }`}
              >
                <div className={`flex items-center justify-between font-bold ${isLight ? 'text-amber-800' : 'text-amber-500'}`}>
                  <span>Shortcuts</span>
                  <Keyboard className="w-3.5 h-3.5" />
                </div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Ctrl+K, L, J...</div>
              </button>
            </div>

            {/* Terminal Palette Picker */}
            {isTerminal && (
              <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Terminal Color Palettes
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(PALETTES).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPalette(p.id);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        palette === p.id
                          ? isLight
                            ? 'bg-white border-2 border-emerald-600 text-slate-900 font-bold shadow-xs'
                            : 'bg-zinc-800 border-emerald-500 text-white font-bold'
                          : isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: p.hexColor }} />
                        <span>{p.name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className={`flex items-center justify-between pt-2 border-t text-xs ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-zinc-800 text-zinc-400'
            }`}>
              <button
                onClick={onToggleSound}
                className={`flex items-center gap-1.5 p-2 rounded-lg border transition cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                ) : (
                  <VolumeX className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                )}
                <span>{soundEnabled ? 'Audio On' : 'Audio Muted'}</span>
              </button>

              <button
                onClick={() => {
                  setShowMobileSheet(false);
                  onOpenHelp();
                }}
                className={`flex items-center gap-1.5 p-2 rounded-lg border transition cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                }`}
              >
                <HelpCircle className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                <span>Command Help</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

