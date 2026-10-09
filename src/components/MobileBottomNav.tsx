import React from 'react';
import { UIMode, ThemeMode } from '../types';
import {
  MessageSquare,
  Users,
  Radio,
  Sliders,
  QrCode,
  Lock,
  Key,
  Bluetooth,
  Maximize,
  Minimize,
} from 'lucide-react';

interface MobileBottomNavProps {
  uiMode: UIMode;
  themeMode?: ThemeMode;
  currentRoom: string;
  peersCount: number;
  isEncrypted: boolean;
  timerSeconds: number;
  isSidebarOpen: boolean;
  onTogglePeerSidebar: () => void;
  onOpenRooms: () => void;
  onOpenBluetooth?: () => void;
  bleConnected?: boolean;
  onOpenKeys: () => void;
  onOpenQR?: () => void;
  onOpenMobileSheet: () => void;
  onFocusInput: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  uiMode,
  themeMode = 'dark',
  currentRoom,
  peersCount,
  isEncrypted,
  timerSeconds,
  isSidebarOpen,
  onTogglePeerSidebar,
  onOpenRooms,
  onOpenBluetooth,
  bleConnected = false,
  onOpenKeys,
  onOpenQR,
  onOpenMobileSheet,
  onFocusInput,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';

  return (
    <div
      id="app-navigation-bar"
      className="fixed bottom-2.5 sm:bottom-3 inset-x-2 sm:inset-x-4 z-30 flex justify-center pointer-events-none select-none transition-all duration-200"
    >
      <nav
        aria-label="MeshNet Navigation Bar"
        className={`pointer-events-auto flex items-center justify-around sm:justify-center gap-0.5 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-2xl backdrop-blur-xl transition-all max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-3xl w-full font-mono ${
          isTerminal
            ? isLight
              ? 'bg-white/95 border-slate-300 shadow-slate-400/30 text-slate-800'
              : 'bg-zinc-950/90 border-emerald-500/40 shadow-emerald-950/30 text-emerald-300'
            : isLight
            ? 'bg-white/95 border-slate-200 shadow-slate-300/40 text-slate-800'
            : 'bg-zinc-900/90 border-zinc-800/80 shadow-black/80 text-zinc-200'
        }`}
      >
        {/* 1. Chat Tab */}
        <button
          id="nav-chat-btn"
          onClick={onFocusInput}
          className={`flex-1 min-h-[42px] sm:min-h-[44px] flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-full transition active:scale-95 cursor-pointer ${
            isLight
              ? 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
              : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/60'
          }`}
          title="Focus Chat Input [Enter]"
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {timerSeconds > 0 && (
              <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
            )}
          </div>
          <span className="text-[9px] sm:text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
            Chat
          </span>
        </button>

        {/* 2. Channel Tab */}
        <button
          id="nav-channels-btn"
          onClick={onOpenRooms}
          className={`flex-1 min-h-[42px] sm:min-h-[44px] flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-full transition active:scale-95 cursor-pointer ${
            isLight
              ? 'bg-emerald-100/90 border border-emerald-300 text-emerald-950 hover:bg-emerald-200/80'
              : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80'
          }`}
          title={`Active Channel: ${currentRoom} [Ctrl+J]`}
        >
          <div className="relative flex items-center gap-0.5">
            <Radio className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            {isEncrypted && <Lock className={`w-2.5 h-2.5 ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`} />}
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-tight max-w-[62px] sm:max-w-[90px] truncate mt-0.5">
            {currentRoom.startsWith('#') ? currentRoom : `#${currentRoom}`}
          </span>
        </button>

        {/* 3. Peers Tab */}
        <button
          id="nav-peers-btn"
          onClick={onTogglePeerSidebar}
          className={`flex-1 min-h-[42px] sm:min-h-[44px] flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-full transition active:scale-95 cursor-pointer ${
            isSidebarOpen
              ? isLight
                ? 'bg-cyan-100 text-cyan-950 border border-cyan-300'
                : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50'
              : isLight
              ? 'text-slate-600 hover:text-cyan-700 hover:bg-slate-100'
              : 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/60'
          }`}
          title="Toggle Mesh Peers [Ctrl+P]"
        >
          <div className="relative">
            <Users className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
            <span
              className={`absolute -top-1 -right-2 px-1 py-0.2 border text-[8px] font-bold rounded-full min-w-[12px] text-center ${
                isLight
                  ? 'bg-cyan-200 border-cyan-400 text-cyan-950'
                  : 'bg-cyan-950 border-cyan-500/60 text-cyan-300'
              }`}
            >
              {peersCount}
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
            Peers
          </span>
        </button>

        {/* 4. Encryption Keys Tab */}
        <button
          id="nav-keys-btn"
          onClick={onOpenKeys}
          className={`flex-1 min-h-[42px] sm:min-h-[44px] flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-full transition active:scale-95 cursor-pointer ${
            isEncrypted
              ? isLight
                ? 'text-emerald-800 hover:bg-emerald-50'
                : 'text-emerald-400 hover:bg-emerald-950/40'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          title="Room Encryption & Key Management (/keys) [Ctrl+K]"
        >
          <div className="relative">
            {isEncrypted ? (
              <Lock className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-500" />
            ) : (
              <Key className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            )}
          </div>
          <span className="text-[9px] sm:text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
            Keys
          </span>
        </button>

        {/* 5. Bluetooth BLE Hardware Tab */}
        {onOpenBluetooth && (
          <button
            id="nav-ble-btn"
            onClick={onOpenBluetooth}
            className={`flex-1 min-h-[42px] sm:min-h-[44px] flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-full transition active:scale-95 cursor-pointer ${
              bleConnected
                ? isLight
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                : isLight
                ? 'text-slate-600 hover:text-cyan-700 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/60'
            }`}
            title={bleConnected ? 'Bluetooth Device Connected (Active Link)' : 'Web Bluetooth BLE Mesh Transceiver'}
          >
            <div className="relative">
              <Bluetooth className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${bleConnected ? 'text-emerald-500 animate-pulse' : 'text-cyan-500'}`} />
              {bleConnected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
              {bleConnected ? 'Linked' : 'BLE'}
            </span>
          </button>
        )}

        {/* 6. QR Code / Invite Tab */}
        {onOpenQR && (
          <button
            id="nav-invite-btn"
            onClick={onOpenQR}
            className={`flex-1 min-h-[42px] sm:min-h-[44px] flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-full transition active:scale-95 cursor-pointer ${
              isLight
                ? 'text-amber-800 hover:text-amber-950 hover:bg-amber-50'
                : 'text-amber-400 hover:text-amber-300 hover:bg-zinc-800/60'
            }`}
            title="Scan or Share QR Invite Code"
          >
            <QrCode className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="text-[9px] sm:text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
              Invite
            </span>
          </button>
        )}

        {/* 7. Settings / Menu Sheet */}
        <button
          id="nav-menu-btn"
          onClick={onOpenMobileSheet}
          className={`flex-1 min-h-[42px] sm:min-h-[44px] flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-full transition active:scale-95 cursor-pointer ${
            isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          title="Menu & Settings Drawer"
        >
          <div className="relative">
            <Sliders className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
            Menu
          </span>
        </button>

        {/* 8. Fullscreen Toggle (Desktop / Tablet) */}
        {onToggleFullscreen && (
          <button
            id="nav-fullscreen-btn"
            onClick={onToggleFullscreen}
            className={`hidden sm:flex flex-1 min-h-[44px] flex-col items-center justify-center py-1 px-2 rounded-full transition active:scale-95 cursor-pointer ${
              isFullscreen
                ? isLight
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title={isFullscreen ? 'Exit Desktop Full Screen [F11 / Esc]' : 'Enter Desktop Full Screen Mode [F11]'}
          >
            <div className="relative">
              {isFullscreen ? (
                <Minimize className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-500" />
              ) : (
                <Maximize className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
              {isFullscreen ? 'Exit' : 'Full'}
            </span>
          </button>
        )}
      </nav>
    </div>
  );
};
