import { create } from "zustand";
import { db } from "@/lib/database";
import type { AppSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

interface SettingsState extends AppSettings {
  loading: boolean;
  initSettings: () => Promise<void>;
  setSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  toggleModule: (moduleId: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loading: true,

  initSettings: async () => {
    try {
      const rows = await db.settings.toArray();
      const settings: Partial<AppSettings> = {};
      for (const row of rows) {
        if (row.key === "onboarding_completed") {
          settings.onboarding_completed = row.value === "true";
        } else if (row.key === "usage_mode") {
          settings.usage_mode =
            row.value === "cloud" || row.value === "local" ? row.value : null;
        } else if (row.key === "use_case") {
          const allowed = ["student", "builder", "personal", "work", "creative"];
          settings.use_case = allowed.includes(row.value) ? (row.value as any) : null;
        } else if (row.key === "sidebar_collapsed") {
          settings.sidebar_collapsed = row.value === "true";
        } else if (row.key === "ai_enabled") {
          settings.ai_enabled = row.value === "true";
        } else if (row.key === "security_pin") {
          settings.security_pin = row.value === "null" ? null : row.value;
        } else if (row.key === "show_clock") {
          settings.show_clock = row.value === "true";
        } else if (row.key === "reduce_motion") {
          settings.reduce_motion = row.value === "true";
        } else if (row.key === "rounded_corners") {
          const n = parseInt(row.value, 10);
          if (!isNaN(n)) settings.rounded_corners = n;
        } else if (row.key === "enabled_modules") {
          try { settings.enabled_modules = JSON.parse(row.value); } catch {}
        } else {
          (settings as Record<string, string>)[row.key] = row.value;
        }
      }

      // Migration: Ensure new default modules are captured
      if (settings.enabled_modules) {
        const { DEFAULT_MODULES } = await import("@/types/settings");
        let migrated = false;
        const nextModules = [...settings.enabled_modules];
        for (const modId of DEFAULT_MODULES) {
          if (!nextModules.includes(modId)) {
            nextModules.push(modId);
            migrated = true;
          }
        }
        if (migrated) {
          settings.enabled_modules = nextModules;
          db.settings.put({ key: "enabled_modules", value: JSON.stringify(nextModules) }).catch(() => {});
        }
      }

      set({ ...DEFAULT_SETTINGS, ...settings, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setSetting: async (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    try {
      const v = typeof value === "object" ? JSON.stringify(value) : String(value);
      await db.settings.put({ key, value: v });
    } catch {
      // silent
    }
  },

  completeOnboarding: async () => {
    set({ onboarding_completed: true });
    try {
      await db.settings.put({ key: "onboarding_completed", value: "true" });
    } catch {
      // silent
    }
  },

  toggleModule: (moduleId: string) => {
    const current = get().enabled_modules;
    const next = current.includes(moduleId)
      ? current.filter(m => m !== moduleId)
      : [...current, moduleId];
    set({ enabled_modules: next });
    db.settings.put({ key: "enabled_modules", value: JSON.stringify(next) }).catch(() => {});
  },
}));
