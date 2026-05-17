import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface XPEvent {
  amount: number;
  label: string;
  timestamp: number;
}

interface GamificationState {
  xp: number;
  level: number;
  streak_days: number;
  streak_last_date: string | null;
  pending_xp: XPEvent | null;        // for floating animation
  show_level_up: boolean;

  loadGamification: () => void;
  setXP: (xp: number) => void;
  setStreak: (days: number, lastDate: string | null) => void;
  addXP: (amount: number, label: string) => void;
  clearPendingXP: () => void;
  clearLevelUp: () => void;
  checkStreak: () => void;
}

const KEY = "delay_gamification";

function calcLevel(xp: number) {
  return Math.floor(xp / 500) + 1;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  xp: 0,
  level: 1,
  streak_days: 0,
  streak_last_date: null,
  pending_xp: null,
  show_level_up: false,

  loadGamification: () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          xp: data.xp || 0,
          level: calcLevel(data.xp || 0),
          streak_days: data.streak_days || 0,
          streak_last_date: data.streak_last_date || null,
        });
      }
    } catch {}
  },

  setXP: (xp) => {
    set({ xp, level: calcLevel(xp) });
    try {
      const raw = localStorage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : {};
      localStorage.setItem(KEY, JSON.stringify({ ...data, xp }));
    } catch {}
  },

  setStreak: (days, lastDate) => {
    set({ streak_days: days, streak_last_date: lastDate });
    try {
      const raw = localStorage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : {};
      localStorage.setItem(KEY, JSON.stringify({ ...data, streak_days: days, streak_last_date: lastDate }));
    } catch {}
  },

  addXP: (amount, label) => {
    const state = get();
    const newXP = state.xp + amount;
    const oldLevel = state.level;
    const newLevel = calcLevel(newXP);
    const showLevelUp = newLevel > oldLevel;

    set({
      xp: newXP,
      level: newLevel,
      pending_xp: { amount, label, timestamp: Date.now() },
      show_level_up: showLevelUp,
    });

    localStorage.setItem(KEY, JSON.stringify({
      xp: newXP,
      streak_days: state.streak_days,
      streak_last_date: state.streak_last_date,
    }));

    // Sync to Supabase (fire-and-forget)
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const uid = data?.session?.user?.id;
        if (uid) {
          supabase!.from("profiles").update({
            xp: newXP,
            level: newLevel,
          }).eq("id", uid).then(() => {});
        }
      });
    }
  },

  clearPendingXP: () => set({ pending_xp: null }),
  clearLevelUp: () => set({ show_level_up: false }),

  checkStreak: () => {
    const state = get();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (state.streak_last_date === today) return; // already counted today

    let newStreak = 1;
    if (state.streak_last_date === yesterday) {
      newStreak = state.streak_days + 1;
    }

    set({ streak_days: newStreak, streak_last_date: today });
    localStorage.setItem(KEY, JSON.stringify({
      xp: state.xp,
      streak_days: newStreak,
      streak_last_date: today,
    }));

    // Sync streak to Supabase (fire-and-forget)
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const uid = data?.session?.user?.id;
        if (uid) {
          supabase!.from("profiles").update({
            streak_days: newStreak,
            streak_last_date: today,
          }).eq("id", uid).then(() => {});
        }
      });
    }

    // Streak bonus
    if (newStreak === 7) {
      get().addXP(100, "7-day streak! 🔥");
    }
  },
}));

// XP reward constants
export const XP_REWARDS = {
  COMPLETE_TASK: 10,
  COMPLETE_FOCUS: 25,
  CREATE_NOTE: 5,
  ALL_TASKS_DONE: 50,
  STREAK_7: 100,
} as const;
