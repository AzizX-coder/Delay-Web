import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, X } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function useNow() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function MobileClockWidget() {
  const { show_clock } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const time = useNow();

  if (!show_clock) return null;

  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");

  return (
    <>
      {/* Floating pill — visible on mobile only, top-right, won't interfere with title bar */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open clock widget"
        className="md:hidden fixed top-2 right-2 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
          bg-bg-elevated/90 backdrop-blur-md border border-border/40 shadow-lg
          text-[11px] font-bold font-mono tabular-nums text-text-primary
          hover:bg-bg-hover active:scale-95 transition-all">
        <Clock size={11} className="text-accent" />
        {hh}:{mm}
      </button>

      <AnimatePresence>
        {open && <ClockOverlay time={time} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function ClockOverlay({ time, onClose }: { time: Date; onClose: () => void }) {
  const h = time.getHours();
  const m = time.getMinutes();
  const s = time.getSeconds();
  const hAngle = (h % 12) * 30 + m * 0.5;
  const mAngle = m * 6;
  const sAngle = s * 6;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-2xl flex items-center justify-center"
      onClick={onClose}
      role="dialog" aria-label="Clock">
      {/* Animated background pulses */}
      <motion.div
        className="absolute w-[340px] h-[340px] rounded-full bg-accent/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div
        className="absolute w-[200px] h-[200px] rounded-full bg-purple-500/15 blur-2xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }} />

      <motion.div
        initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 20 }}
        transition={{ type: "spring", stiffness: 360, damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="relative flex flex-col items-center gap-6 px-8 py-10 rounded-[40px]
          bg-bg-elevated/90 backdrop-blur-xl border border-border/30 shadow-2xl">
        {/* Close */}
        <button onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full
            text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-all">
          <X size={16} />
        </button>

        {/* Analog clock — 200px */}
        <div className="relative w-[200px] h-[200px]">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Outer ring */}
            <defs>
              <linearGradient id="clockRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="94" fill="url(#clockRing)" stroke="currentColor" strokeWidth="1.5" className="text-border/50" />
            {/* Hour markers */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => {
              const isMajor = a % 90 === 0;
              return (
                <line key={a} x1="100" y1="14" x2="100" y2={isMajor ? "26" : "20"}
                  stroke="currentColor" strokeWidth={isMajor ? "3" : "1.5"}
                  className={isMajor ? "text-text-primary" : "text-text-tertiary"}
                  transform={`rotate(${a} 100 100)`} strokeLinecap="round" />
              );
            })}
            {/* Hour hand */}
            <motion.line x1="100" y1="100" x2="100" y2="55"
              stroke="currentColor" strokeWidth="5" strokeLinecap="round"
              className="text-text-primary"
              animate={{ rotate: hAngle }} transition={{ type: "spring", stiffness: 100, damping: 20 }}
              style={{ transformOrigin: "100px 100px" }} />
            {/* Minute hand */}
            <motion.line x1="100" y1="100" x2="100" y2="35"
              stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
              className="text-accent"
              animate={{ rotate: mAngle }} transition={{ type: "spring", stiffness: 100, damping: 20 }}
              style={{ transformOrigin: "100px 100px" }} />
            {/* Second hand */}
            <motion.line x1="100" y1="115" x2="100" y2="28"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              className="text-danger"
              animate={{ rotate: sAngle }} transition={{ type: "spring", stiffness: 200, damping: 15 }}
              style={{ transformOrigin: "100px 100px" }} />
            {/* Center cap */}
            <circle cx="100" cy="100" r="6" className="fill-bg-elevated stroke-accent" strokeWidth="2" />
            <circle cx="100" cy="100" r="2.5" className="fill-accent" />
          </svg>
        </div>

        {/* Digital */}
        <div className="text-center">
          <p className="text-[44px] font-extrabold font-mono tabular-nums text-text-primary tracking-tight leading-none">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
            <span className="text-accent text-[28px] ml-1">{String(s).padStart(2, "0")}</span>
          </p>
          <p className="text-[12px] font-bold text-text-tertiary uppercase tracking-[0.2em] mt-3">
            {DAYS[time.getDay()]}
          </p>
          <p className="text-[14px] font-semibold text-text-secondary mt-1">
            {MONTHS[time.getMonth()]} {time.getDate()}, {time.getFullYear()}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
