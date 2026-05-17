import { create } from "zustand";
import { db, generateId, now } from "@/lib/database";
import type { TimerSession } from "@/lib/database";

type TimerMode = "focus" | "short_break" | "long_break";

interface TimerPreset {
  mode: TimerMode;
  label: string;
  duration: number; // seconds
  color: string;
}

export const TIMER_PRESETS: TimerPreset[] = [
  { mode: "focus", label: "Focus", duration: 25 * 60, color: "#007AFF" },
  { mode: "short_break", label: "Short Break", duration: 5 * 60, color: "#34C759" },
  { mode: "long_break", label: "Long Break", duration: 15 * 60, color: "#FF9500" },
];

interface TimerState {
  mode: TimerMode;
  duration: number; // total seconds for current mode
  remaining: number; // seconds left
  isRunning: boolean;
  sessions: TimerSession[];
  totalFocusSessions: number;
  customDuration: number | null;

  setMode: (mode: TimerMode) => void;
  setCustomDuration: (minutes: number) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  loadSessions: () => Promise<void>;
}

let tickInterval: ReturnType<typeof setInterval> | null = null;

export const useTimerStore = create<TimerState>((set, get) => ({
  mode: "focus",
  duration: 25 * 60,
  remaining: 25 * 60,
  isRunning: false,
  sessions: [],
  totalFocusSessions: 0,
  customDuration: null,

  setMode: (mode) => {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = null;
    const preset = TIMER_PRESETS.find((p) => p.mode === mode);
    const duration = preset?.duration || 25 * 60;
    set({ mode, duration, remaining: duration, isRunning: false, customDuration: null });
  },

  setCustomDuration: (minutes) => {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = null;
    const seconds = minutes * 60;
    set({ customDuration: minutes, duration: seconds, remaining: seconds, isRunning: false });
  },

  start: () => {
    if (tickInterval) clearInterval(tickInterval);
    set({ isRunning: true });
    tickInterval = setInterval(() => {
      get().tick();
    }, 1000);
  },

  pause: () => {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = null;
    set({ isRunning: false });
  },

  reset: () => {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = null;
    const { duration } = get();
    set({ remaining: duration, isRunning: false });
  },

  tick: () => {
    const { remaining, mode, duration } = get();
    if (remaining <= 1) {
      // Timer complete
      if (tickInterval) clearInterval(tickInterval);
      tickInterval = null;

      // Play completion sound
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
        // Second chime
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 1100;
          osc2.type = "sine";
          gain2.gain.setValueAtTime(0.3, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 1);
        }, 300);
      } catch {}

      // Save session to DB
      const session: TimerSession = {
        id: generateId(),
        type: mode,
        duration,
        completed: true,
        started_at: now() - duration,
        ended_at: now(),
      };
      db.timerSessions.add(session).catch(() => {});

      set((state) => {
        if (mode === "focus") {
          import("./gamificationStore").then(m => {
            m.useGamificationStore.getState().addXP(25, "Focus session completed");
          });
        }
        return {
          remaining: 0,
          isRunning: false,
          sessions: [session, ...state.sessions],
          totalFocusSessions:
            mode === "focus" ? state.totalFocusSessions + 1 : state.totalFocusSessions,
        };
      });
    } else {
      set({ remaining: remaining - 1 });
    }
  },

  loadSessions: async () => {
    try {
      const sessions = await db.timerSessions.orderBy("started_at").reverse().limit(50).toArray();
      const focusCount = sessions.filter((s) => s.type === "focus" && s.completed).length;
      set({ sessions, totalFocusSessions: focusCount });
    } catch {}
  },
}));
