import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, UIMode, ThemeMode, TerminalPalette } from '../types';
import { getNickColor } from '../lib/crypto';
import { DisappearingTimerBadge } from './DisappearingTimerBadge';
import { Lock, Copy, Check, Quote, Trash2, ArrowDown, ShieldCheck, Sparkles, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatPaneProps {
  messages: ChatMessage[];
  currentPeerId: string;
  currentRoom: string;
  uiMode: UIMode;
  themeMode?: ThemeMode;
  palette?: TerminalPalette;
  isEncryptedRoom: boolean;
  hasRoomPassword: boolean;
  onOpenKeys: () => void;
  onBurnMessage: (messageId: string) => void;
  onQuoteMessage?: (text: string, sender: string) => void;
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  messages,
  currentPeerId,
  currentRoom,
  uiMode,
  themeMode = 'dark',
  palette = 'emerald',
  isEncryptedRoom,
  hasRoomPassword,
  onOpenKeys,
  onBurnMessage,
  onQuoteMessage,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [translations, setTranslations] = useState<Record<string, { lang: string; text: string }>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [langMenuMsgId, setLangMenuMsgId] = useState<string | null>(null);

  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';

  const SUPPORTED_LANGUAGES = [
    { name: 'English', label: 'English' },
    { name: 'Spanish', label: 'Español' },
    { name: 'French', label: 'Français' },
    { name: 'German', label: 'Deutsch' },
    { name: 'Hindi', label: 'हिंदी' },
    { name: 'Chinese', label: '中文' },
    { name: 'Japanese', label: '日本語' },
    { name: 'Arabic', label: 'العربية' },
    { name: 'Italian', label: 'Italiano' },
    { name: 'Portuguese', label: 'Português' },
    { name: 'Russian', label: 'Русский' },
    { name: 'Korean', label: '한국어' },
    { name: 'Turkish', label: 'Türkçe' },
  ];

  const handleTranslateMessage = async (msgId: string, text: string, targetLang: string = 'English') => {
    setLangMenuMsgId(null);
    if (translations[msgId] && translations[msgId].lang === targetLang) {
      // Toggle off translation if same language selected again
      setTranslations((prev) => {
        const copy = { ...prev };
        delete copy[msgId];
        return copy;
      });
      return;
    }

    setTranslatingId(msgId);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      });
      const data = await res.json();
      if (data.translation) {
        setTranslations((prev) => ({
          ...prev,
          [msgId]: { lang: targetLang, text: data.translation },
        }));
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setTranslatingId(null);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollBottom(!isAtBottom);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`relative flex-1 flex flex-col min-h-0 overflow-hidden transition-colors ${
        isTerminal
          ? isLight
            ? 'bg-slate-100'
            : 'bg-black'
          : isLight
          ? 'bg-slate-100'
          : 'bg-zinc-950'
      }`}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto px-3 sm:px-6 py-3 space-y-2 select-text transition-colors ${
          isTerminal
            ? isLight
              ? 'bg-slate-100 text-slate-900 font-mono'
              : 'bg-black text-emerald-300 font-mono'
            : isLight
            ? 'bg-slate-100 text-slate-900'
            : 'bg-zinc-950 text-zinc-100'
        }`}
      >
        {/* Welcome Banner */}
        {messages.length === 0 && (
          <div className="py-8 text-center space-y-2 select-none my-auto flex flex-col items-center justify-center min-h-[60%]">
            <div
              className={`p-3 rounded-full inline-flex mb-1 ${
                isLight
                  ? 'bg-white border border-slate-200 text-emerald-600 shadow-xs'
                  : 'bg-zinc-900 border border-zinc-800 text-emerald-400'
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Channel <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold'}>{currentRoom}</span>
            </div>
            {isEncryptedRoom && (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  isLight
                    ? 'bg-emerald-100 border border-emerald-300 text-emerald-900'
                    : 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-300'
                }`}
              >
                <Lock className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                <span>End-to-End Encrypted (AES-256)</span>
              </div>
            )}
            <p className={`text-xs max-w-xs mx-auto pt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              Messages are routed directly across peer nodes. Type a message below to start chatting.
            </p>
          </div>
        )}

        {/* Message list */}
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => {
            const isSelf = msg.senderId === currentPeerId;
            const nickColor = getNickColor(msg.senderNick);

            // System Message - Centered Telegram/WhatsApp style pill
            if (msg.isSystemMessage) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex justify-center my-2"
                >
                  <div
                    className={`text-[11px] px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 select-none max-w-[90%] text-center ${
                      isLight
                        ? 'bg-white border border-slate-200 text-slate-600'
                        : 'bg-zinc-900/90 border border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span className={isLight ? 'text-slate-400' : 'text-zinc-500'}>{formatTime(msg.timestamp)}</span>
                    <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>{msg.content}</span>
                  </div>
                </motion.div>
              );
            }

            // Encrypted payload awaiting key
            if (msg.isEncrypted && msg.encryptedPayload && !msg.content) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex justify-center my-2"
                >
                  <div
                    className={`p-3.5 rounded-2xl border text-xs max-w-sm w-full space-y-2 ${
                      isLight
                        ? 'border-amber-300 bg-amber-50 text-amber-950'
                        : 'border-amber-500/30 bg-amber-950/20 text-zinc-300'
                    }`}
                  >
                    <div className={`flex items-center justify-between font-semibold ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                      <span className="flex items-center gap-1.5">
                        <Lock className={`w-3.5 h-3.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                        Encrypted Message
                      </span>
                      <span className={`text-[10px] ${isLight ? 'text-amber-600' : 'text-zinc-500'}`}>{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className={`text-[11px] truncate ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      Ciphertext: {msg.encryptedPayload.ciphertext.substring(0, 32)}...
                    </p>
                    <button
                      onClick={onOpenKeys}
                      className={`w-full py-1.5 border rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer ${
                        isLight
                          ? 'bg-amber-600 hover:bg-amber-700 border-amber-600 text-white'
                          : 'bg-amber-900/60 hover:bg-amber-800 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      Enter Key to Decrypt
                    </button>
                  </div>
                </motion.div>
              );
            }

            const isAiMessage = msg.senderId === 'gemini-ai-assistant' || msg.senderNick === 'AI Assistant';

            // Regular or AI Chat Bubble (WhatsApp / Telegram style)
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.8,
                  filter: 'blur(8px)',
                  transition: { duration: 0.25 },
                }}
                className={`flex flex-col my-1 ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`group relative max-w-[88%] sm:max-w-[75%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm shadow-xs transition ${
                    isAiMessage
                      ? isLight
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-tl-xs'
                        : 'bg-zinc-900 border border-emerald-500/40 text-emerald-300 rounded-tl-xs'
                      : isSelf
                      ? isLight
                        ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                        : 'bg-emerald-900/80 border border-emerald-500/30 text-emerald-50 rounded-tr-xs'
                      : isLight
                      ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-xs'
                  }`}
                >
                  {/* Sender & Actions header */}
                  <div className="flex items-center justify-between gap-3 text-[11px] mb-0.5 font-medium">
                    {isAiMessage ? (
                      <span className={`flex items-center gap-1 font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Assistant</span>
                      </span>
                    ) : (
                      <span
                        style={{ color: isSelf ? (isLight ? '#d1fae5' : '#a7f3d0') : nickColor }}
                        className="font-semibold truncate"
                      >
                        {msg.senderNick} {isSelf && <span className="text-[10px] opacity-80 font-normal">(you)</span>}
                      </span>
                    )}

                    {/* Quick message action icons */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 -mr-1 relative">
                      <div className="relative">
                        <button
                          onClick={() => setLangMenuMsgId(langMenuMsgId === msg.id ? null : msg.id)}
                          disabled={translatingId === msg.id}
                          className={`p-1 rounded flex items-center gap-0.5 ${
                            isSelf && isLight
                              ? 'hover:bg-emerald-700 text-emerald-100'
                              : isLight
                              ? 'hover:bg-slate-200 text-slate-500'
                              : 'hover:bg-black/30 text-zinc-400 hover:text-emerald-300'
                          }`}
                          title="Translate message with AI"
                        >
                          <Languages className={`w-3 h-3 ${translatingId === msg.id ? 'animate-spin text-emerald-400' : ''}`} />
                        </button>

                        {/* Language Selection Dropdown */}
                        {langMenuMsgId === msg.id && (
                          <div
                            className={`absolute right-0 top-6 z-50 w-36 rounded-lg shadow-xl py-1 text-xs font-sans max-h-48 overflow-y-auto border ${
                              isLight
                                ? 'bg-white border-slate-200 text-slate-800'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                            }`}
                          >
                            <div
                              className={`px-2 py-1 text-[10px] font-bold border-b uppercase tracking-wider ${
                                isLight ? 'text-slate-500 border-slate-200 bg-slate-50' : 'text-zinc-400 border-zinc-800'
                              }`}
                            >
                              Translate to...
                            </div>
                            {SUPPORTED_LANGUAGES.map((lang) => (
                              <button
                                key={lang.name}
                                onClick={() => handleTranslateMessage(msg.id, msg.content, lang.name)}
                                className={`w-full text-left px-2.5 py-1 transition flex items-center justify-between ${
                                  isLight
                                    ? 'hover:bg-emerald-50 hover:text-emerald-800 text-slate-700'
                                    : 'hover:bg-emerald-950 hover:text-emerald-300 text-zinc-200'
                                }`}
                              >
                                <span>{lang.label}</span>
                                {translations[msg.id]?.lang === lang.name && (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {onQuoteMessage && (
                        <button
                          onClick={() => onQuoteMessage(msg.content, msg.senderNick)}
                          className={`p-1 rounded ${
                            isSelf && isLight
                              ? 'hover:bg-emerald-700 text-emerald-100'
                              : isLight
                              ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                              : 'hover:bg-black/30 text-zinc-400 hover:text-white'
                          }`}
                          title="Quote Reply"
                        >
                          <Quote className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        className={`p-1 rounded ${
                          isSelf && isLight
                            ? 'hover:bg-emerald-700 text-emerald-100'
                            : isLight
                            ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                            : 'hover:bg-black/30 text-zinc-400 hover:text-white'
                        }`}
                        title="Copy"
                      >
                        {copiedId === msg.id ? <Check className={`w-3 h-3 ${isSelf && isLight ? 'text-white' : 'text-emerald-500'}`} /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => onBurnMessage(msg.id)}
                        className={`p-1 rounded ${
                          isSelf && isLight
                            ? 'hover:bg-emerald-700 text-emerald-200 hover:text-white'
                            : isLight
                            ? 'hover:bg-red-50 text-red-500'
                            : 'hover:bg-red-950 text-red-400 hover:text-red-300'
                        }`}
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div
                    className={`whitespace-pre-wrap break-words leading-relaxed font-sans ${
                      isSelf
                        ? isLight
                          ? 'text-white'
                          : 'text-emerald-50'
                        : isLight
                        ? 'text-slate-800'
                        : 'text-zinc-100'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* AI Translation block if requested */}
                  {translations[msg.id] && (
                    <div
                      className={`mt-2 p-2 rounded-xl text-xs font-sans border ${
                        isLight
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                          : 'bg-black/40 border-emerald-500/30 text-emerald-200'
                      }`}
                    >
                      <div className={`text-[10px] font-semibold mb-0.5 flex items-center justify-between ${
                        isLight ? 'text-emerald-800' : 'text-emerald-400'
                      }`}>
                        <span className="flex items-center gap-1">
                          <Languages className="w-3 h-3" />
                          <span>AI Translation ({translations[msg.id].lang}):</span>
                        </span>
                        <button
                          onClick={() => {
                            setTranslations((prev) => {
                              const copy = { ...prev };
                              delete copy[msg.id];
                              return copy;
                            });
                          }}
                          className={`text-[10px] ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                          Dismiss
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{translations[msg.id].text}</p>
                    </div>
                  )}

                  {/* Bubble Footer: Timestamp & Metadata */}
                  <div
                    className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                      isSelf
                        ? isLight
                          ? 'text-emerald-100'
                          : 'text-emerald-300/70'
                        : isLight
                        ? 'text-slate-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {msg.isDirectMessage && (
                      <span className={`px-1 py-0.2 rounded text-[9px] border ${
                        isLight
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : 'bg-purple-950 text-purple-300 border-purple-500/30'
                      }`}>
                        DM
                      </span>
                    )}
                    {msg.isEncrypted && <Lock className={`w-2.5 h-2.5 ${isSelf && isLight ? 'text-emerald-200' : 'text-emerald-500'}`} />}
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>

                  {/* Self-destruct timer badge */}
                  {msg.timerSeconds > 0 && msg.expiresAt && (
                    <div className="mt-1">
                      <DisappearingTimerBadge
                        expiresAt={msg.expiresAt}
                        timerSeconds={msg.timerSeconds}
                        onBurn={() => onBurnMessage(msg.id)}
                        isTerminal={isTerminal}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Floating Scroll to Bottom button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className={`absolute bottom-3 right-4 z-20 p-2 rounded-full shadow-lg flex items-center justify-center transition active:scale-95 cursor-pointer border ${
            isLight
              ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              : 'bg-emerald-900/90 hover:bg-emerald-800 border border-emerald-500/40 text-emerald-200'
          }`}
          title="Scroll to latest"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
