import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGamificationStore } from "@/stores/gamificationStore";
import confetti from "canvas-confetti";
import { Zap, Star } from "lucide-react";

/**
 * Global XP popup — shows "+10 XP" floating animation when XP is earned.
 * Mount once in AppLayout.
 */
export function XPPopup() {
  const { pending_xp, clearPendingXP } = useGamificationStore();

  useEffect(() => {
    if (pending_xp) {
      const timer = setTimeout(clearPendingXP, 1400);
      return () => clearTimeout(timer);
    }
  }, [pending_xp]);

  return (
    <AnimatePresence>
      {pending_xp && (
        <motion.div
          key={pending_xp.timestamp}
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -50, scale: 1.1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.3, ease: "easeOut" }}
          className="fixed bottom-24 right-6 z-[300] flex items-center gap-2 px-4 py-2.5 rounded-2xl
            bg-accent/90 backdrop-blur-md text-white font-bold text-[14px] shadow-xl pointer-events-none"
        >
          <Zap size={16} className="text-yellow-300" />
          +{pending_xp.amount} XP
          <span className="text-[11px] text-white/70 ml-1">{pending_xp.label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Level-up celebration overlay — full screen confetti + level display.
 * Mount once in AppLayout.
 */
export function LevelUpOverlay() {
  const { show_level_up, level, clearLevelUp } = useGamificationStore();

  useEffect(() => {
    if (show_level_up) {
      // Fire confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#6366F1", "#8B5CF6", "#06B6D4", "#F59E0B", "#10B981"],
      });
      const timer = setTimeout(clearLevelUp, 3500);
      return () => clearTimeout(timer);
    }
  }, [show_level_up]);

  return (
    <AnimatePresence>
      {show_level_up && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={clearLevelUp}
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6, repeat: 2 }}
            >
              <Star size={64} className="text-yellow-400 fill-yellow-400" />
            </motion.div>
            <h2 className="text-[40px] md:text-[56px] font-black text-white mt-4 leading-none">
              Level {level}
            </h2>
            <p className="text-[16px] text-white/70 mt-2 font-medium">
              You've leveled up! Keep going 🚀
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Small inline profile badge showing level and XP.
 */
export function XPBadge() {
  const { xp, level, streak_days } = useGamificationStore();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-secondary/50 border border-border/20">
      <div className="flex items-center gap-1">
        <Star size={12} className="text-yellow-400 fill-yellow-400" />
        <span className="text-[11px] font-bold text-text-primary">Lv.{level}</span>
      </div>
      <div className="w-px h-3 bg-border/30" />
      <span className="text-[10px] text-text-tertiary font-bold tabular-nums">{xp.toLocaleString()} XP</span>
      {streak_days > 0 && (
        <>
          <div className="w-px h-3 bg-border/30" />
          <span className="text-[10px] font-bold text-warning">🔥 {streak_days}d</span>
        </>
      )}
    </div>
  );
}
