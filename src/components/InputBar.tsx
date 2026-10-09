import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { SlashCommand, DisappearingTimer, UIMode, ThemeMode, TerminalPalette } from '../types';
import { playKeySound } from '../lib/sound';
import { Send, Flame, Lock, HelpCircle, Key, ChevronUp, MessageSquare, ShieldCheck, Trash2, LogIn, List, Sparkles, Bot } from 'lucide-react';

interface InputBarProps {
  onSendMessage: (text: string) => void;
  uiMode: UIMode;
  themeMode?: ThemeMode;
  palette?: TerminalPalette;
  currentRoom: string;
  timerSeconds: DisappearingTimer;
  onSetTimer: (timer: DisappearingTimer) => void;
  isEncrypted: boolean;
  onOpenKeys: () => void;
  onOpenHelp: () => void;
  onTypingStatus?: (isTyping: boolean) => void;
  onAiAction?: (action: 'summarize' | 'ask') => void;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { name: '/ai', syntax: '/ai <question>', description: 'Ask Gemini AI Assistant directly in chat', example: '/ai How to set up mesh encryption?' },
  { name: '/join', syntax: '/join <room> [password]', description: 'Switch room channel or join encrypted room', example: '/join #disaster-relief secret123' },
  { name: '/key', syntax: '/key <passphrase>', description: 'Set AES-256 encryption key directly in chat (or /key clear)', example: '/key secret123' },
  { name: '/msg', syntax: '/msg <nick> <text>', description: 'Send a private direct message to a peer', example: '/msg Bob meet at gate' },
  { name: '/nick', syntax: '/nick <new_name>', description: 'Change display nickname on the mesh', example: '/nick Alice_Emergency' },
  { name: '/timer', syntax: '/timer <seconds|off>', description: 'Set disappearing message timer (0=off, 5, 10, 30, 60, 300)', example: '/timer 30' },
  { name: '/who', syntax: '/who', description: 'List all known peers and online status', example: '/who' },
  { name: '/clear', syntax: '/clear', description: 'Clear current screen transcript', example: '/clear' },
  { name: '/keys', syntax: '/keys', description: 'View cryptographic identity and encryption keys', example: '/keys' },
  { name: '/help', syntax: '/help', description: 'Show command reference guide', example: '/help' },
];

const TIMER_OPTIONS: DisappearingTimer[] = [0, 5, 10, 30, 60, 300, 3600];

export const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  uiMode,
  themeMode = 'dark',
  palette = 'emerald',
  currentRoom,
  timerSeconds,
  onSetTimer,
  isEncrypted,
  onOpenKeys,
  onOpenHelp,
  onTypingStatus,
}) => {
  const [text, setText] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (onTypingStatus) {
      if (val.trim().length > 0) {
        onTypingStatus(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = window.setTimeout(() => {
          onTypingStatus(false);
        }, 2000);
      } else {
        onTypingStatus(false);
      }
    }
  };

  useEffect(() => {
    if (text.startsWith('/')) {
      const match = SLASH_COMMANDS.filter((cmd) => cmd.name.toLowerCase().startsWith(text.split(' ')[0].toLowerCase()));
      setFilteredCommands(match);
      setSelectedCmdIndex(0);
    } else {
      setFilteredCommands([]);
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (onTypingStatus) {
      onTypingStatus(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }

    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    onSendMessage(trimmed);
    setText('');
    setFilteredCommands([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    playKeySound();

    if (filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCmdIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCmdIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && filteredCommands.length > 0 && text.indexOf(' ') === -1)) {
        e.preventDefault();
        const selected = filteredCommands[selectedCmdIndex];
        setText(selected.name + ' ');
        setFilteredCommands([]);
        return;
      }
    }

    if (e.key === 'ArrowUp' && filteredCommands.length === 0) {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setText(history[nextIdx]);
      }
      return;
    }

    if (e.key === 'ArrowDown' && filteredCommands.length === 0) {
      e.preventDefault();
      if (historyIndex >= 0) {
        const nextIdx = historyIndex + 1;
        if (nextIdx >= history.length) {
          setHistoryIndex(-1);
          setText('');
        } else {
          setHistoryIndex(nextIdx);
          setText(history[nextIdx]);
        }
      }
      return;
    }
  };

  const selectCommand = (cmd: SlashCommand) => {
    setText(cmd.name + ' ');
    setFilteredCommands([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      id="chat-input-bar-container"
      className={`relative px-3 pt-2 pb-20 sm:pb-20 border-t select-none transition-colors ${
        isTerminal
          ? isLight
            ? 'bg-slate-100/90 border-slate-300 text-slate-900 font-mono'
            : 'bg-zinc-950 border-emerald-500/30 text-emerald-300 font-mono'
          : isLight
          ? 'bg-white border-slate-200 text-slate-800 font-sans shadow-sm'
          : 'bg-zinc-900 border-zinc-800/80 text-zinc-100 font-sans'
      }`}
    >
      {/* Autocomplete Popover */}
      {filteredCommands.length > 0 && (
        <div
          className={`absolute bottom-full left-3 right-3 mb-2 rounded-xl border shadow-2xl max-h-56 overflow-y-auto z-30 ${
            isTerminal
              ? isLight
                ? 'bg-white border-emerald-600/40 text-emerald-950'
                : 'bg-zinc-950 border-emerald-500/50 text-emerald-300'
              : isLight
              ? 'bg-white border-slate-300 text-slate-900'
              : 'bg-zinc-900 border-zinc-700 text-zinc-200'
          }`}
        >
          <div
            className={`p-2 border-b text-[11px] font-bold uppercase tracking-wider flex justify-between ${
              isLight ? 'border-slate-200 text-slate-500 bg-slate-50' : 'border-emerald-500/20 text-zinc-400'
            }`}
          >
            <span>Slash Commands (Tab / Enter to select)</span>
            <button
              onClick={() => setFilteredCommands([])}
              className={isLight ? 'hover:text-slate-900' : 'hover:text-white'}
            >
              ✕
            </button>
          </div>
          <div className="p-1 space-y-1">
            {filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.name}
                onClick={() => selectCommand(cmd)}
                className={`p-2 rounded-lg text-xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-1 transition ${
                  idx === selectedCmdIndex
                    ? isTerminal
                      ? isLight
                        ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-400'
                        : 'bg-emerald-950 text-emerald-200 font-bold border border-emerald-500/40'
                      : isLight
                      ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300'
                      : 'bg-zinc-800 text-white font-bold border border-zinc-700'
                    : isLight
                    ? 'hover:bg-slate-100'
                    : 'hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold'}>
                    {cmd.syntax}
                  </span>
                </div>
                <span className={`text-[11px] font-normal ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  {cmd.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disappearing Timer Picker Popover */}
      {showTimerPicker && (
        <div
          className={`absolute bottom-full right-3 mb-2 p-2 rounded-xl border shadow-2xl z-30 flex flex-col gap-1 w-52 ${
            isTerminal
              ? isLight
                ? 'bg-white border-amber-500/50 text-amber-950'
                : 'bg-zinc-950 border-amber-500/50 text-amber-300'
              : isLight
              ? 'bg-white border-slate-300 text-slate-900'
              : 'bg-zinc-900 border-zinc-700 text-zinc-200'
          }`}
        >
          <div
            className={`text-[11px] font-bold flex items-center justify-between px-1 mb-1 ${
              isLight ? 'text-amber-800' : 'text-amber-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Self-Destruct Timer</span>
            </span>
            <button
              onClick={() => setShowTimerPicker(false)}
              className={isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'}
            >
              ✕
            </button>
          </div>
          {TIMER_OPTIONS.map((sec) => (
            <button
              key={sec}
              onClick={() => {
                onSetTimer(sec);
                setShowTimerPicker(false);
              }}
              className={`text-xs px-2.5 py-1.5 rounded-lg text-left transition flex items-center justify-between ${
                timerSeconds === sec
                  ? isLight
                    ? 'bg-amber-100 text-amber-950 font-bold border border-amber-400'
                    : 'bg-amber-950 text-amber-300 font-bold border border-amber-500/40'
                  : isLight
                  ? 'hover:bg-slate-100 text-slate-700'
                  : 'hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              <span>{sec === 0 ? 'Off (Normal)' : `${sec} seconds`}</span>
              {timerSeconds === sec && <Flame className="w-3.5 h-3.5 text-amber-500" />}
            </button>
          ))}
        </div>
      )}

      {/* Mobile Quick Command Bar (Clean icons, no raw emojis) */}
      <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-[11px]">
        <button
          type="button"
          onClick={() => {
            setText('/ai ');
            inputRef.current?.focus();
          }}
          className={`px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 active:scale-95 transition font-semibold ${
            isLight
              ? 'bg-emerald-100 border border-emerald-400 text-emerald-800'
              : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
          }`}
        >
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>/ai</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setText('/msg ');
            inputRef.current?.focus();
          }}
          className={`px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 active:scale-95 transition ${
            isLight
              ? 'bg-slate-100 border border-slate-300 text-slate-700'
              : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-200'
          }`}
        >
          <MessageSquare className="w-3 h-3 text-cyan-500" />
          <span>/msg</span>
        </button>

        <button
          type="button"
          onClick={onOpenKeys}
          className={`px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 active:scale-95 transition ${
            isLight
              ? 'bg-slate-100 border border-slate-300 text-slate-700'
              : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-200'
          }`}
        >
          <Lock className="w-3 h-3 text-emerald-500" />
          <span>/keys</span>
        </button>

        <button
          type="button"
          onClick={() => setShowTimerPicker(!showTimerPicker)}
          className={`px-2.5 py-1 border rounded-full flex items-center gap-1 flex-shrink-0 active:scale-95 transition ${
            timerSeconds > 0
              ? isLight
                ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                : 'bg-amber-950 border-amber-500/50 text-amber-300 font-bold'
              : isLight
              ? 'bg-slate-100 border-slate-300 text-slate-700'
              : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300'
          }`}
        >
          <Flame className={`w-3 h-3 ${timerSeconds > 0 ? 'text-amber-500' : isLight ? 'text-slate-400' : 'text-zinc-400'}`} />
          <span>{timerSeconds > 0 ? `${timerSeconds}s Burn` : '/timer'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setText('/help');
            handleSubmit(new Event('submit') as any);
          }}
          className={`px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 active:scale-95 transition ${
            isLight
              ? 'bg-slate-100 border border-slate-300 text-slate-700'
              : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-200'
          }`}
        >
          <HelpCircle className="w-3 h-3 text-cyan-500" />
          <span>/help</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setText('/clear');
            handleSubmit(new Event('submit') as any);
          }}
          className={`px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 active:scale-95 transition ${
            isLight
              ? 'bg-slate-100 border border-slate-300 text-slate-700'
              : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-200'
          }`}
        >
          <Trash2 className="w-3 h-3 text-red-500" />
          <span>/clear</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setText('/join ');
            inputRef.current?.focus();
          }}
          className={`px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 active:scale-95 transition ${
            isLight
              ? 'bg-slate-100 border border-slate-300 text-slate-700'
              : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-200'
          }`}
        >
          <LogIn className="w-3 h-3 text-emerald-500" />
          <span>/join</span>
        </button>
      </div>

      {/* Modern Capsule Chat Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div
          className={`flex-1 flex items-center rounded-2xl px-3 py-1.5 transition shadow-xs ${
            isLight
              ? 'bg-slate-100 border border-slate-300 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20'
              : 'bg-zinc-800/90 border border-zinc-700/70 focus-within:border-emerald-500/60'
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isEncrypted
                ? `Message ${currentRoom} (Encrypted)...`
                : `Message ${currentRoom} or /help...`
            }
            className={`flex-1 bg-transparent text-xs sm:text-sm outline-none py-1 ${
              isLight
                ? 'text-slate-900 placeholder-slate-400'
                : 'text-zinc-100 placeholder-zinc-400'
            }`}
          />

          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={() => {
                if (!text.startsWith('/ai ')) {
                  setText('/ai ' + text);
                }
                inputRef.current?.focus();
              }}
              className={`p-1.5 rounded-lg transition ${
                isLight ? 'text-emerald-700 hover:bg-emerald-100' : 'text-emerald-400 hover:bg-emerald-950/60'
              }`}
              title="Ask Gemini AI Assistant (/ai)"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowTimerPicker(!showTimerPicker)}
              className={`p-1.5 rounded-lg transition ${
                timerSeconds > 0
                  ? isLight
                    ? 'text-amber-800 bg-amber-100'
                    : 'text-amber-400 bg-amber-950/60'
                  : isLight
                  ? 'text-slate-400 hover:text-slate-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Disappearing Timer"
            >
              <Flame className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenKeys}
              className={`p-1.5 rounded-lg transition ${
                isEncrypted
                  ? isLight
                    ? 'text-emerald-700'
                    : 'text-emerald-400'
                  : isLight
                  ? 'text-slate-400 hover:text-slate-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Encryption Key Settings"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telegram / WhatsApp Style Circular Send Button */}
        <button
          type="submit"
          disabled={!text.trim()}
          className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 transition shadow-md active:scale-95 cursor-pointer"
          title="Send Message"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
};
