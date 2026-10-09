import React, { useEffect } from 'react';
import { Command, X, Keyboard, Terminal, Sparkles } from 'lucide-react';
import { UIMode, ThemeMode } from '../types';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiMode: UIMode;
  themeMode?: ThemeMode;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Security' | 'Chat' | 'System';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'K'], description: 'Open Encryption Keys & Room Passwords', category: 'Security' },
  { keys: ['Ctrl', 'L'], description: 'Clear screen terminal / Chat scroll buffer', category: 'Chat' },
  { keys: ['Ctrl', 'J'], description: 'Open Room / Channel selection menu', category: 'Navigation' },
  { keys: ['Ctrl', 'P'], description: 'Toggle Mesh Peers Sidebar & Discovery', category: 'Navigation' },
  { keys: ['F11'], description: 'Toggle Desktop Full Screen Mode', category: 'Navigation' },
  { keys: ['Ctrl', 'B'], description: 'Cycle Disappearing Message timer (Burn rate)', category: 'Security' },
  { keys: ['Ctrl', 'T'], description: 'Toggle Terminal Color Palette (Matrix/Amber/Cyberpunk)', category: 'System' },
  { keys: ['Ctrl', 'M'], description: 'Toggle UI View (Retro Terminal ↔ Tactical GUI)', category: 'System' },
  { keys: ['Ctrl', 'D'], description: 'Toggle Dark / Light Theme Mode', category: 'System' },
  { keys: ['Ctrl', '?'], description: 'Open this Keyboard Shortcuts Cheat Sheet', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close active overlays & modals', category: 'System' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  uiMode,
  themeMode = 'dark',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';

  const categories = ['Navigation', 'Security', 'Chat', 'System'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div
        className={`w-full max-w-xl rounded-t-2xl sm:rounded-xl border shadow-2xl overflow-hidden font-mono text-xs sm:text-sm max-h-[90vh] flex flex-col ${
          isTerminal
            ? isLight
              ? 'bg-white border-slate-300 text-slate-800'
              : 'bg-zinc-950 border-emerald-500/40 text-emerald-300'
            : isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-zinc-900 border-zinc-700 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between ${
            isLight
              ? 'border-slate-200 bg-slate-50'
              : isTerminal
              ? 'border-emerald-500/30 bg-zinc-900/50'
              : 'border-zinc-800 bg-zinc-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <Keyboard className={`w-4 h-4 ${isLight ? 'text-emerald-700' : isTerminal ? 'text-emerald-400' : 'text-cyan-400'}`} />
            <span className="font-bold tracking-wider uppercase text-sm">Keyboard Shortcuts Overlay</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Body */}
        <div className="p-4 sm:p-5 max-h-[75vh] overflow-y-auto space-y-5">
          {categories.map((cat) => {
            const list = SHORTCUTS.filter((s) => s.category === cat);
            if (list.length === 0) return null;

            return (
              <div key={cat} className="space-y-2">
                <div className={`text-[11px] font-bold tracking-widest uppercase ${
                  isLight ? 'text-slate-500' : isTerminal ? 'text-emerald-500' : 'text-zinc-400'
                }`}>
                  // {cat}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {list.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded border transition ${
                        isLight
                          ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                          : isTerminal
                          ? 'bg-zinc-900/40 border-emerald-500/20 hover:border-emerald-500/40'
                          : 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <span className={isLight ? 'text-slate-700 font-medium' : 'text-zinc-300'}>{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono shadow-xs border ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-800'
                                : isTerminal
                                ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                                : 'bg-zinc-800 border-zinc-600 text-zinc-200'
                            }`}
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-2.5 border-t text-[11px] flex items-center justify-between ${
            isLight
              ? 'border-slate-200 bg-slate-50 text-slate-600'
              : isTerminal
              ? 'border-emerald-500/30 bg-zinc-950 text-emerald-500'
              : 'border-zinc-800 bg-zinc-950 text-zinc-400'
          }`}
        >
          <span className="flex items-center gap-1">
            <Sparkles className={`w-3 h-3 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
            Press <kbd className={`px-1 rounded ${isLight ? 'bg-white border border-slate-300' : 'bg-zinc-800'}`}>Ctrl+?</kbd> anytime
          </span>
          <button
            onClick={onClose}
            className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
              isLight
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : isTerminal
                ? 'bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-500/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
            }`}
          >
            Close [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
