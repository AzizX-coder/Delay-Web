import { create } from "zustand";
import { db } from "@/lib/database";

type ThemeMode = "light" | "dark" | "system" | "forest" | "mocha" | "ocean" | "rose" | "nord" | "solarized" | "sakura";

interface ThemeState {
  theme: ThemeMode;
  resolved: ThemeMode;
  customBgData: string | null;
  setTheme: (theme: ThemeMode) => void;
  setCustomBg: (dataUrl: string | null) => Promise<void>;
  initTheme: () => Promise<void>;
}

function getSystemTheme(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: ThemeMode, bgData: string | null = null) {
  document.documentElement.classList.remove("dark", "theme-forest", "theme-mocha", "theme-ocean", "theme-rose", "theme-nord", "theme-solarized", "theme-sakura");
  
  if (resolved === "dark") document.documentElement.classList.add("dark");
  else if (resolved === "forest") document.documentElement.classList.add("theme-forest");
  else if (resolved === "mocha") document.documentElement.classList.add("theme-mocha");
  else if (resolved === "ocean") document.documentElement.classList.add("theme-ocean");
  else if (resolved === "rose") document.documentElement.classList.add("theme-rose");
  else if (resolved === "nord") document.documentElement.classList.add("theme-nord");
  else if (resolved === "solarized") document.documentElement.classList.add("theme-solarized");
  else if (resolved === "sakura") document.documentElement.classList.add("theme-sakura");
  
  if (bgData) {
    document.documentElement.classList.add("custom-bg");
    document.body.style.backgroundImage = `url(${bgData})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
  } else {
    document.documentElement.classList.remove("custom-bg");
    document.body.style.backgroundImage = "";
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "system",
  resolved: getSystemTheme(),
  customBgData: null,

  setTheme: async (theme: ThemeMode) => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    applyTheme(resolved, get().customBgData);
    set({ theme, resolved });
    try {
      await db.settings.put({ key: "theme", value: theme });
    } catch {}
  },

  setCustomBg: async (dataUrl: string | null) => {
    applyTheme(get().resolved, dataUrl);
    set({ customBgData: dataUrl });
    try {
      if (dataUrl) {
        await db.settings.put({ key: "custom_bg", value: dataUrl });
      } else {
        await db.settings.delete("custom_bg");
      }
    } catch {}
  },

  initTheme: async () => {
    try {
      const rowTheme = await db.settings.get("theme");
      const rowBg = await db.settings.get("custom_bg");
      
      const theme = (rowTheme?.value as ThemeMode) || "system";
      const customBgData = (rowBg?.value as string) || null;
      
      const resolved = theme === "system" ? getSystemTheme() : theme;
      applyTheme(resolved, customBgData);
      set({ theme, resolved, customBgData });
    } catch {
      const resolved = getSystemTheme();
      applyTheme(resolved, null);
      set({ resolved });
    }

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        const { theme, customBgData } = get();
        if (theme === "system") {
          const resolved = getSystemTheme();
          applyTheme(resolved, customBgData);
          set({ resolved });
        }
      });
  },
}));
