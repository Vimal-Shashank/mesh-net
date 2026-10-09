import React, { useEffect, useState } from 'react';
import { Flame, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface DisappearingTimerBadgeProps {
  expiresAt?: number;
  timerSeconds: number;
  onBurn?: () => void;
  isTerminal?: boolean;
}

export const DisappearingTimerBadge: React.FC<DisappearingTimerBadgeProps> = ({
  expiresAt,
  timerSeconds,
  onBurn,
  isTerminal = false,
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt - Date.now());
  });

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const left = Math.max(0, expiresAt - Date.now());
      setRemainingMs(left);

      if (left <= 0) {
        clearInterval(interval);
        if (onBurn) {
          onBurn();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [expiresAt, onBurn]);

  if (!timerSeconds || timerSeconds === 0 || !expiresAt) return null;

  const secondsLeft = Math.ceil(remainingMs / 1000);
  const totalMs = timerSeconds * 1000;
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / totalMs) * 100));

  if (isTerminal) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30">
        <Flame className="w-3 h-3 text-amber-500" />
        <span>BURN:{secondsLeft}s</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full max-w-[200px] my-1">
      <div className="flex items-center justify-between text-[11px] font-mono text-amber-400/90">
        <span className="inline-flex items-center gap-1">
          <Flame className="w-3 h-3 text-amber-400" />
          <span>Self-destruct in {secondsLeft}s</span>
        </span>
        <Clock className="w-3 h-3 text-amber-400/60" />
      </div>
      <div className="w-full h-1 bg-amber-950/60 rounded-full overflow-hidden border border-amber-500/20">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
          style={{ width: `${progressPercent}%` }}
          transition={{ ease: 'linear', duration: 0.1 }}
        />
      </div>
    </div>
  );
};
