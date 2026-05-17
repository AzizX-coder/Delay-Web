export type NavPosition = "left" | "right" | "bottom";
export type NavStyle = "pill" | "compact" | "telegram";
export type Density = "compact" | "comfortable" | "spacious";
export type FontFamily = "sans" | "serif" | "mono" | "rounded";

export const ACCENT_PRESETS = [
  { id: "indigo",  name: "Indigo",  hex: "#6366F1" },
  { id: "violet",  name: "Violet",  hex: "#8B5CF6" },
  { id: "rose",    name: "Rose",    hex: "#EC4899" },
  { id: "ruby",    name: "Ruby",    hex: "#EF4444" },
  { id: "amber",   name: "Amber",   hex: "#F59E0B" },
  { id: "emerald", name: "Emerald", hex: "#10B981" },
  { id: "cyan",    name: "Cyan",    hex: "#06B6D4" },
  { id: "slate",   name: "Slate",   hex: "#64748B" },
] as const;

export interface AppSettings {
  theme: "light" | "dark" | "system" | "forest" | "mocha" | "ocean" | "rose" | "nord" | "solarized" | "sakura";
  language: string;
  security_pin: string | null;
  ai_enabled: boolean;
  ai_provider: "ollama" | "openrouter" | "groq" | "openai" | "anthropic" | "deepseek" | "gemini";
  ai_model: string;
  api_key_openrouter: string;
  api_key_groq: string;
  api_key_openai: string;
  api_key_anthropic: string;
  api_key_deepseek: string;
  api_key_gemini: string;
  onboarding_completed: boolean;
  usage_mode: "cloud" | "local" | null;
  use_case: "student" | "builder" | "personal" | "work" | "creative" | null;
  sidebar_collapsed: boolean;
  enabled_modules: string[];
  nav_position: NavPosition;
  nav_style: NavStyle;
  show_clock: boolean;
  workspace_name: string;
  accent_color: string;       // hex, overrides --accent
  density: Density;
  font_family: FontFamily;
  reduce_motion: boolean;
  rounded_corners: number;    // 0-24, base radius
}

export const ALL_MODULES = [
  { id: "notes",        label: "Docs",        icon: "StickyNote",  group: "core",      desc: "Rich documents & knowledge base" },
  { id: "tasks",        label: "Planner",     icon: "CheckSquare", group: "core",      desc: "Projects & task management" },
  { id: "calendar",     label: "Schedule",    icon: "Calendar",    group: "core",      desc: "Events, deadlines & agenda" },
  { id: "timer",        label: "Focus",       icon: "Timer",       group: "core",      desc: "Pomodoro & deep work sessions" },
  { id: "saved",        label: "Saved",       icon: "Bookmark",    group: "core",      desc: "Saved messages & link previews" },
  { id: "kanban",       label: "Boards",      icon: "Columns3",    group: "workspace", desc: "Kanban project boards" },
  { id: "whiteboard",   label: "Canvas",      icon: "PenTool",     group: "workspace", desc: "Infinite design canvas" },
  { id: "code-studio",  label: "Studio",      icon: "Code2",       group: "workspace", desc: "Code editor & terminal" },
  { id: "bucket",       label: "Vault",       icon: "Archive",     group: "workspace", desc: "Secure file storage & folders" },
  { id: "voice-studio", label: "Voice",       icon: "Mic",         group: "media",     desc: "Audio recording & processing" },
  { id: "status",       label: "Status",      icon: "BarChart3",   group: "system",    desc: "Activity graphs & analytics" },
  { id: "ai",           label: "Copilot",     icon: "Sparkles",    group: "system",    desc: "AI-powered assistant" },
  { id: "flows",        label: "Flows",       icon: "GitBranch",   group: "workspace", desc: "Projects linking tasks, notes & events" },
] as const;

export const DEFAULT_MODULES = [
  "notes", "tasks", "calendar", "timer", "saved", "flows", "bucket", "status", "ai", "code-studio", "kanban", "whiteboard"
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  language: "en",
  security_pin: null,
  ai_enabled: true,
  ai_provider: "openrouter",
  ai_model: "liquid/lfm-40b",
  api_key_openrouter: "",
  api_key_groq: "",
  api_key_openai: "",
  api_key_anthropic: "",
  api_key_deepseek: "",
  api_key_gemini: "",
  onboarding_completed: false,
  usage_mode: null,
  use_case: null,
  sidebar_collapsed: false,
  enabled_modules: DEFAULT_MODULES,
  nav_position: "left",
  nav_style: "pill",
  show_clock: true,
  workspace_name: "My workspace",
  accent_color: "#6E62F5",
  density: "comfortable",
  font_family: "sans",
  reduce_motion: false,
  rounded_corners: 16,
};

export const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "uz", name: "Uzbek", native: "O'zbekcha" },
];
