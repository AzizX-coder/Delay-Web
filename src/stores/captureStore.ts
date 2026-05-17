import { create } from "zustand";

export interface CaptureItem {
  id: string;
  type: "text" | "link" | "todo";
  content: string;
  linkPreview?: { title?: string; description?: string; image?: string };
  emoji?: string;
  pinned: boolean;
  completed?: boolean;
  created_at: number;
}

interface CaptureState {
  items: CaptureItem[];
  loading: boolean;
  loadItems: () => void;
  addItem: (item: Omit<CaptureItem, "id" | "created_at" | "pinned">) => void;
  removeItem: (id: string) => void;
  togglePin: (id: string) => void;
  toggleComplete: (id: string) => void;
  addReaction: (id: string, emoji: string) => void;
}

const KEY = "delay_saved_messages";

export const useCaptureStore = create<CaptureState>((set, get) => ({
  items: [],
  loading: true,

  loadItems: () => {
    try {
      const raw = localStorage.getItem(KEY);
      set({ items: raw ? JSON.parse(raw) : [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addItem: (partial) => {
    const item: CaptureItem = { ...partial, id: crypto.randomUUID(), pinned: false, created_at: Date.now() };
    const next = [item, ...get().items];
    set({ items: next });
    localStorage.setItem(KEY, JSON.stringify(next));
  },

  removeItem: (id) => {
    const next = get().items.filter(i => i.id !== id);
    set({ items: next });
    localStorage.setItem(KEY, JSON.stringify(next));
  },

  togglePin: (id) => {
    const next = get().items.map(i => i.id === id ? { ...i, pinned: !i.pinned } : i);
    set({ items: next });
    localStorage.setItem(KEY, JSON.stringify(next));
  },

  toggleComplete: (id) => {
    const next = get().items.map(i => i.id === id ? { ...i, completed: !i.completed } : i);
    set({ items: next });
    localStorage.setItem(KEY, JSON.stringify(next));
  },

  addReaction: (id, emoji) => {
    const next = get().items.map(i => i.id === id ? { ...i, emoji: i.emoji === emoji ? undefined : emoji } : i);
    set({ items: next });
    localStorage.setItem(KEY, JSON.stringify(next));
  },
}));
