import { create } from "zustand";

type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

interface UpdaterState {
  status: UpdaterStatus;
  version: string | null;
  percent: number;
  error: string | null;
  initialized: boolean;
  currentVersion: string;

  init: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  quitAndInstall: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  status: "idle",
  version: null,
  percent: 0,
  error: null,
  initialized: false,
  currentVersion: "1.4.2",

  init: async () => {
    if (get().initialized) return;
    const api = window.electronAPI;
    if (!api?.updater || !api.getVersion) {
      set({ initialized: true });
      return;
    }

    try {
      const v = await api.getVersion();
      set({ currentVersion: v });
    } catch {}

    api.updater.onEvent(({ event, payload }) => {
      const p = payload as { version?: string; percent?: number } | undefined;
      switch (event) {
        case "checking":
          set({ status: "checking", error: null });
          break;
        case "available":
          set({
            status: "available",
            version: p?.version ?? null,
            error: null,
          });
          break;
        case "not-available":
          set({ status: "not-available", error: null });
          break;
        case "progress":
          set({
            status: "downloading",
            percent: Math.round(p?.percent ?? 0),
          });
          break;
        case "downloaded":
          set({
            status: "downloaded",
            version: p?.version ?? get().version,
            percent: 100,
          });
          break;
        case "error":
          set({ status: "error", error: String(payload) });
          break;
      }
    });

    set({ initialized: true });
  },

  checkForUpdates: async () => {
    const api = window.electronAPI?.updater;
    if (!api) return;
    set({ status: "checking", error: null });
    const res = await api.check();
    if (!res.ok) {
      set({ status: "error", error: res.error ?? "Check failed" });
    }
  },

  downloadUpdate: async () => {
    const api = window.electronAPI?.updater;
    if (!api) return;
    set({ status: "downloading", percent: 0 });
    const res = await api.download();
    if (!res.ok) {
      set({ status: "error", error: res.error ?? "Download failed" });
    }
  },

  quitAndInstall: () => {
    window.electronAPI?.updater?.quitAndInstall();
  },
}));
