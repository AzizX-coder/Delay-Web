import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "@/stores/themeStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAIStore } from "@/stores/aiStore";
import { useUpdaterStore } from "@/stores/updaterStore";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listOllamaModels, checkOllamaStatus } from "@/lib/ollama";
import { motion, AnimatePresence } from "motion/react";
import {
  Sun, Moon, Monitor, Bot, Languages, Info, Wifi, WifiOff, ChevronRight,
  Check, Download, RefreshCw, CheckCircle2, AlertCircle, Trash2, AlertTriangle,
  Zap, Leaf, Coffee, Waves, Flower2, Shield, Lock, Layout,
  PanelLeft, PanelRight, PanelBottom,
  User, Cloud, HardDrive, Crown, LogOut, Users, ExternalLink, Sparkles, ArrowRight,
  CreditCard, Receipt, Zap as Lightning,
} from "lucide-react";
import { db } from "@/lib/database";
import { LANGUAGES, ACCENT_PRESETS } from "@/types/settings";
import type { OllamaModel } from "@/types/ai";
import { Logo } from "@/components/ui/Logo";
import { useT } from "@/lib/i18n";

/** Sections the sidebar can navigate to. Order = sidebar order. */
const SECTION_TABS = [
  { id: "account",    label: "Account",     icon: User,        group: "you" },
  { id: "billing",    label: "Billing",     icon: CreditCard,  group: "you" },
  { id: "workspace",  label: "Workspace",   icon: Layout,      group: "you" },
  { id: "appearance", label: "Appearance",  icon: Sun,         group: "look" },
  { id: "navigation", label: "Navigation",  icon: PanelLeft,   group: "look" },
  { id: "language",   label: "Language",    icon: Languages,   group: "look" },
  { id: "ai",         label: "AI",          icon: Bot,         group: "smart" },
  { id: "security",   label: "Security",    icon: Shield,      group: "smart" },
  { id: "updates",    label: "Updates",     icon: Download,    group: "system" },
  { id: "data",       label: "Data",        icon: AlertTriangle, group: "system" },
  { id: "about",      label: "About",       icon: Info,        group: "system" },
] as const;

type SectionId = (typeof SECTION_TABS)[number]["id"];

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme, customBgData, setCustomBg } = useThemeStore();
  const {
    language, ai_provider, ai_model, ai_enabled, security_pin,
    nav_position, nav_style, show_clock,
    workspace_name, accent_color, density, font_family, reduce_motion, rounded_corners,
    api_key_openrouter, api_key_groq, api_key_openai,
    api_key_anthropic, api_key_deepseek, api_key_gemini,
    usage_mode, use_case,
    setSetting
  } = useSettingsStore();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [activeSection, setActiveSection] = useState<SectionId>("account");
  const { setModel } = useAIStore();
  const {
    status,
    version: updateVersion,
    percent,
    error: updateError,
    currentVersion,
    init: initUpdater,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
  } = useUpdaterStore();

  const [models, setModels] = useState<OllamaModel[]>([]);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [pendingLang, setPendingLang] = useState<string | null>(null);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinMode, setPinMode] = useState<"idle" | "set" | "clear">("idle");
  const t = useT();

  const wipeAllData = async () => {
    setWiping(true);
    try {
      await Promise.all([
        db.notes.clear(),
        db.tasks.clear(),
        db.taskLists.clear(),
        db.events.clear(),
        db.aiConversations.clear(),
        db.aiMessages.clear(),
        db.memories.clear(),
        db.settings.clear(),
      ]);
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.electronAPI?.relaunch?.();
    window.location.reload();
  };

  useEffect(() => {
    checkOllamaStatus().then(setOllamaOnline);
    listOllamaModels().then(setModels);
    initUpdater();
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === language);

  return (
    <div className="h-full flex bg-bg-primary overflow-hidden">
      {/* ── Sidebar with section tabs ── */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-border/30 bg-bg-secondary/30 overflow-y-auto">
        <div className="px-5 pt-7 pb-5">
          <p className="text-[20px] font-bold tracking-[-0.02em] text-text-primary">{t("settings.title")}</p>
          <p className="text-[11.5px] text-text-tertiary mt-0.5">{t("settings.subtitle")}</p>
        </div>
        <nav className="px-2 pb-4 space-y-0.5">
          {SECTION_TABS.map((tab, i) => {
            const Icon = tab.icon;
            const prev = SECTION_TABS[i - 1];
            const showGroupDivider = prev && prev.group !== tab.group;
            return (
              <div key={tab.id}>
                {showGroupDivider && <div className="my-2 mx-3 h-px bg-border/30" />}
                <button
                  onClick={() => setActiveSection(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer
                    ${activeSection === tab.id ? "bg-accent/12 text-accent" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"}`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Mobile tab strip ── */}
      <div className="md:hidden absolute top-0 inset-x-0 z-10 bg-bg-primary border-b border-border/30">
        <div className="flex overflow-x-auto no-scrollbar px-3 py-2 gap-1.5">
          {SECTION_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold whitespace-nowrap transition-colors cursor-pointer
                  ${activeSection === tab.id ? "bg-accent text-white" : "bg-bg-secondary/60 text-text-secondary"}`}>
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active section content ── */}
      <div className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 md:py-10">

          {/* ── Account ── */}
          {activeSection === "account" && (
            <div className="mb-6 space-y-4">
              <SectionHeader title="Account" subtitle="Your profile, plan and where your data lives." />
              {user ? (
                <div className="rounded-2xl border border-border/30 bg-bg-secondary/40 p-5">
                  <div className="flex items-center gap-4">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center text-accent text-[20px] font-bold">
                        {(profile?.display_name ?? user.email ?? "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-text-primary truncate">{profile?.display_name ?? user.email}</p>
                      <p className="text-[12px] text-text-tertiary truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider
                          ${profile?.plan === "max" ? "bg-purple-400/15 text-purple-400" :
                            profile?.plan === "pro" ? "bg-amber-400/15 text-amber-400" :
                            "bg-bg-hover text-text-tertiary"}`}>
                          {profile?.plan ?? "free"}
                        </span>
                        {profile?.plan === "free" && (
                          <button onClick={() => navigate("/pricing")}
                            className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer">
                            Upgrade <ArrowRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    <button onClick={() => signOut()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-danger bg-danger/10 hover:bg-danger/15 cursor-pointer transition-colors">
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/30 bg-bg-secondary/40 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/12 flex items-center justify-center shrink-0">
                      <Cloud size={20} className="text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-bold text-text-primary">You're using Delay locally</p>
                      <p className="text-[12px] text-text-tertiary mt-0.5 leading-relaxed">
                        Sign in to sync across devices, share notes with public links, and collaborate in workspaces.
                      </p>
                      <button onClick={() => { setSetting("usage_mode", "cloud"); window.location.reload(); }}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-[12.5px] font-bold hover:opacity-90 cursor-pointer">
                        Sign in
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Storage mode */}
              <div className="rounded-2xl border border-border/30 bg-bg-secondary/40 p-4">
                <p className="text-[12px] font-bold text-text-tertiary uppercase tracking-wider mb-3">Storage</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "cloud", icon: Cloud, label: "Cloud sync", sub: "Across devices" },
                    { id: "local", icon: HardDrive, label: "Local only", sub: "This device" },
                  ] as const).map(({ id, icon: Icon, label, sub }) => (
                    <button key={id} onClick={() => setSetting("usage_mode", id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer text-left
                        ${usage_mode === id ? "border-accent bg-accent/5" : "border-border/30 hover:border-border/60"}`}>
                      <Icon size={16} className={usage_mode === id ? "text-accent" : "text-text-tertiary"} />
                      <div className="min-w-0">
                        <p className={`text-[12.5px] font-bold ${usage_mode === id ? "text-accent" : "text-text-primary"}`}>{label}</p>
                        <p className="text-[10.5px] text-text-tertiary">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Use case (read-only — set during onboarding) */}
              {use_case && (
                <div className="rounded-2xl border border-border/30 bg-bg-secondary/40 p-4 flex items-center gap-3">
                  <Sparkles size={16} className="text-accent shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-text-primary">Workspace tuned for: <span className="text-accent capitalize">{use_case}</span></p>
                    <p className="text-[11px] text-text-tertiary mt-0.5">Modules and AI prompts are tailored to this. Change in Workspace → Modules.</p>
                  </div>
                </div>
              )}

              {/* Workspaces shortcut */}
              {isSupabaseConfigured && user && (
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/30 bg-bg-secondary/40 hover:bg-bg-hover transition-colors cursor-pointer text-left"
                  onClick={() => window.dispatchEvent(new CustomEvent("delay:open-workspaces"))}
                >
                  <Users size={16} className="text-accent shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12.5px] font-bold text-text-primary">Workspaces & invites</p>
                    <p className="text-[11px] text-text-tertiary">Share notes, tasks and boards with your team.</p>
                  </div>
                  <ChevronRight size={14} className="text-text-tertiary" />
                </button>
              )}
            </div>
          )}

          {/* ── Billing ── */}
          {activeSection === "billing" && (
            <div className="mb-6 space-y-4">
              <SectionHeader title="Subscription & Billing" subtitle="Your plan, payment method, invoices and renewal date." />

              {/* Current plan card */}
              <div className="rounded-2xl border border-border/30 bg-bg-secondary/40 p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                    ${profile?.plan === "max" ? "bg-purple-400/15" :
                      profile?.plan === "pro" ? "bg-amber-400/15" :
                      "bg-bg-hover"}`}>
                    {profile?.plan === "max" ? <Lightning size={20} className="text-purple-400" /> :
                     profile?.plan === "pro" ? <Crown size={20} className="text-amber-400" /> :
                     <Sparkles size={20} className="text-text-tertiary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Current plan</p>
                    <p className="text-[20px] font-bold text-text-primary capitalize">{profile?.plan ?? "free"}</p>
                    <p className="text-[12px] text-text-tertiary mt-0.5">
                      {profile?.plan === "max" ? "$29 / month · or $290 / year" :
                       profile?.plan === "pro" ? "$12 / month · or $120 / year" :
                       "Free forever, on this device"}
                    </p>
                    {profile?.subscription_period_end && (
                      <p className="text-[11px] text-text-tertiary mt-1.5">
                        Renews on {new Date(profile.subscription_period_end).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <button onClick={() => navigate("/pricing")}
                    className="px-4 py-2 rounded-xl bg-accent text-white text-[12px] font-bold hover:opacity-90 cursor-pointer shrink-0">
                    {profile?.plan === "free" ? "Upgrade" : "Change plan"}
                  </button>
                </div>
              </div>

              {/* Manage billing portal */}
              {profile?.plan && profile.plan !== "free" ? (
                <div className="rounded-2xl border border-border/30 bg-bg-secondary/40 p-5">
                  <div className="flex items-start gap-3">
                    <Receipt size={16} className="text-accent mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-text-primary">Manage billing</p>
                      <p className="text-[12px] text-text-tertiary mt-0.5 leading-relaxed">
                        Update your payment method, see invoices, switch between monthly
                        and yearly, or cancel — all in one place.
                      </p>
                      <button
                        disabled
                        title="Available once Stripe is wired up"
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bg-hover text-text-secondary text-[12px] font-bold opacity-60 cursor-not-allowed">
                        Open billing portal <ExternalLink size={12} />
                      </button>
                      <p className="text-[10.5px] text-text-tertiary mt-2">
                        Payments aren't live yet — this opens the Stripe billing portal as soon as the merchant account is set up.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/30 bg-bg-secondary/40 p-5">
                  <div className="flex items-start gap-3">
                    <Sparkles size={16} className="text-accent mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-text-primary">What you get on Pro</p>
                      <ul className="mt-2 space-y-1.5 text-[12px] text-text-secondary">
                        {[
                          "Unlimited notes, tasks, boards & flows",
                          "Cloud sync across every device",
                          "Public note sharing with links",
                          "5 GB encrypted Cloud Vault",
                          "500 AI credits / month",
                          "Real-time collab — up to 3 people",
                        ].map(f => (
                          <li key={f} className="flex items-start gap-2">
                            <Check size={12} className="text-accent mt-1 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button onClick={() => navigate("/pricing")}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-b from-accent to-accent-hover text-white text-[12px] font-bold hover:brightness-110 cursor-pointer">
                        See all plans <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Help */}
              <p className="text-[11px] text-text-tertiary px-1">
                Questions about billing? Email <a className="text-accent hover:underline" href="mailto:hello@delay.app">hello@delay.app</a>.
                Refunds within 30 days, no questions asked.
              </p>
            </div>
          )}

        <Section title="Workspace" icon={<Layout size={18} />} hidden={activeSection !== "workspace"}>
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-bold text-text-secondary mb-1.5">Workspace name</p>
              <input value={workspace_name} onChange={(e) => setSetting("workspace_name", e.target.value)}
                placeholder="My workspace"
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary/60 border border-border/30 outline-none focus:border-accent/40 text-[13px] text-text-primary" />
            </div>

            {/* Accent color */}
            <div>
              <p className="text-[12px] font-bold text-text-secondary mb-2">Accent color</p>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_PRESETS.map(p => (
                  <button key={p.id} onClick={() => setSetting("accent_color", p.hex)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${accent_color === p.hex ? "border-text-primary ring-2 ring-text-primary/20" : "border-border/30 hover:border-border/60"}`}>
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ background: p.hex }} />
                    <span className="text-[11.5px] font-bold text-text-primary">{p.name}</span>
                  </button>
                ))}
                <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/30 hover:border-border/60 cursor-pointer transition-all">
                  <input type="color" value={accent_color} onChange={e => setSetting("accent_color", e.target.value)}
                    className="w-4 h-4 rounded-full overflow-hidden cursor-pointer p-0 border-0" />
                  <span className="text-[11.5px] font-bold text-text-primary">Custom</span>
                </label>
              </div>
            </div>

            {/* Density */}
            <div>
              <p className="text-[12px] font-bold text-text-secondary mb-2">Density</p>
              <div className="flex items-center gap-2">
                {(["compact", "comfortable", "spacious"] as const).map(d => (
                  <button key={d} onClick={() => setSetting("density", d)}
                    className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer capitalize ${density === d ? "bg-accent/12 text-accent ring-1 ring-accent/30" : "bg-bg-secondary/40 text-text-secondary hover:bg-bg-hover"}`}>{d}</button>
                ))}
              </div>
            </div>

            {/* Font family */}
            <div>
              <p className="text-[12px] font-bold text-text-secondary mb-2">Font family</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {([
                  { id: "sans", label: "Sans", sample: "Aa" },
                  { id: "serif", label: "Serif", sample: "Aa" },
                  { id: "mono", label: "Mono", sample: "Aa" },
                  { id: "rounded", label: "Rounded", sample: "Aa" },
                ] as const).map(opt => (
                  <button key={opt.id} onClick={() => setSetting("font_family", opt.id)}
                    className={`px-3 py-2.5 rounded-lg flex items-center justify-between transition-all cursor-pointer ${font_family === opt.id ? "bg-accent/12 ring-1 ring-accent/30" : "bg-bg-secondary/40 hover:bg-bg-hover"}`}>
                    <span className="text-[12px] font-bold text-text-primary">{opt.label}</span>
                    <span className={`text-[15px] ${font_family === opt.id ? "text-accent" : "text-text-tertiary"}`}
                      style={{ fontFamily:
                        opt.id === "serif" ? "ui-serif, Georgia, serif" :
                        opt.id === "mono" ? "ui-monospace, monospace" :
                        opt.id === "rounded" ? "ui-rounded, 'SF Pro Rounded', system-ui" :
                        "ui-sans-serif, system-ui" }}>
                      {opt.sample}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rounded corners */}
            <div>
              <p className="text-[12px] font-bold text-text-secondary mb-2">Rounded corners <span className="text-text-tertiary font-mono ml-1">{rounded_corners}px</span></p>
              <input type="range" min={0} max={24} value={rounded_corners}
                onChange={(e) => setSetting("rounded_corners", parseInt(e.target.value, 10))}
                className="w-full accent-[var(--color-accent)]" />
            </div>

            {/* Reduce motion */}
            <label className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg-secondary/40 cursor-pointer">
              <div>
                <p className="text-[13px] font-bold text-text-primary">Reduce motion</p>
                <p className="text-[11px] text-text-tertiary">Minimize animations and transitions</p>
              </div>
              <button onClick={() => setSetting("reduce_motion", !reduce_motion)}
                className={`w-10 h-5.5 rounded-full transition-all relative ${reduce_motion ? "bg-accent" : "bg-border/40"}`}>
                <motion.div animate={{ x: reduce_motion ? 18 : 2 }} className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </label>
          </div>
        </Section>

        <Section title={t("settings.appearance")} icon={<Sun size={18} />} hidden={activeSection !== "appearance"}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {(
              [
                { value: "light" as const, icon: <Sun size={18} />, label: "Aura Light" },
                { value: "dark" as const, icon: <Moon size={18} />, label: "Obsidian" },
                { value: "forest" as const, icon: <Leaf size={18} />, label: "Forest" },
                { value: "mocha" as const, icon: <Coffee size={18} />, label: "Mocha" },
                { value: "ocean" as const, icon: <Waves size={18} />, label: "Ocean" },
                { value: "rose" as const, icon: <Flower2 size={18} />, label: "Rosé" },
                { value: "system" as const, icon: <Monitor size={18} />, label: "System" },
              ]
            ).map((opt) => (
              <motion.button
                key={opt.value}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setTheme(opt.value)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  border transition-all cursor-pointer text-[13px] font-medium
                  ${
                    theme === opt.value
                      ? "border-accent/60 bg-accent/10 text-accent shadow-[0_4px_16px_rgba(0,122,255,0.15)]"
                      : "border-border bg-bg-secondary/50 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }`}
              >
                {opt.icon}
                {opt.label}
              </motion.button>
            ))}
          </div>
          
          <div className="mt-4 p-4 rounded-xl bg-bg-secondary/50 border border-border border-dashed flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-text-primary">Custom Background</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">Upload a local image (Base64) to use as the app wallpaper</p>
            </div>
            <div className="flex items-center gap-2">
              {customBgData && (
                <button 
                  onClick={() => setCustomBg(null)} 
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
                >
                  Remove
                </button>
              )}
              <label className="px-4 py-1.5 rounded-lg bg-bg-hover border border-border/80 text-[12px] font-medium hover:bg-bg-active cursor-pointer transition-colors block">
                {customBgData ? "Change Image" : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const input = e.currentTarget;
                    const file = input.files?.[0];
                    input.value = ""; // allow re-selecting same file
                    if (!file) return;
                    const MAX = 5 * 1024 * 1024;
                    if (file.size > MAX) {
                      alert("Image too large. Please pick something under 5 MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onerror = () => alert("Couldn't read the image. Try a different file.");
                    reader.onload = (event) => {
                      const result = event.target?.result;
                      if (typeof result === "string") {
                        Promise.resolve(setCustomBg(result)).catch(err => {
                          console.error("setCustomBg failed:", err);
                          alert("Couldn't save background. The image may be too large for storage.");
                        });
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>
        </Section>

        <Section title={t("settings.language")} icon={<Languages size={18} />} hidden={activeSection !== "language"}>
          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="w-full flex items-center justify-between px-4 py-3
              bg-bg-secondary rounded-xl border border-border-light
              text-[14px] text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <span>
              {currentLang?.name} · {currentLang?.native}
            </span>
            <ChevronRight
              size={16}
              className={`text-text-tertiary transition-transform ${
                showLangPicker ? "rotate-90" : ""
              }`}
            />
          </button>
          <AnimatePresence>
            {showLangPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-0.5 overflow-hidden"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSetting("language", lang.code);
                      setShowLangPicker(false);
                      if (lang.code !== language) setPendingLang(lang.code);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5
                      rounded-lg text-[13px] transition-colors cursor-pointer
                      ${
                        language === lang.code
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-text-secondary hover:bg-bg-hover"
                      }`}
                  >
                    <span>
                      {lang.name} — {lang.native}
                    </span>
                    {language === lang.code && <Check size={14} />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {pendingLang && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center justify-between px-3.5 py-2.5 rounded-xl
                bg-accent/10 border border-accent/20 text-[12.5px] text-accent"
            >
              <span>{t("settings.restart_needed")}</span>
              <button
                onClick={() => window.electronAPI?.relaunch?.()}
                className="px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-semibold cursor-pointer"
              >
                {t("settings.restart_now")}
              </button>
            </motion.div>
          )}
        </Section>

        <Section title="Navigation & Display" icon={<Layout size={18} />} hidden={activeSection !== "navigation"}>
          {/* Nav Position */}
          <div className="mb-5">
            <p className="text-[12px] font-bold text-text-tertiary uppercase mb-2">Sidebar Position</p>
            <div className="flex gap-2">
              {(["left", "right", "bottom"] as const).map(pos => {
                const Icon = pos === "left" ? PanelLeft : pos === "right" ? PanelRight : PanelBottom;
                return (
                  <button key={pos} onClick={() => setSetting("nav_position", pos)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all cursor-pointer
                      ${nav_position === pos ? "bg-accent/10 border-accent/30 text-accent" : "bg-bg-secondary/40 border-border/20 text-text-tertiary hover:border-border/40"}`}>
                    <Icon size={18} />
                    <span className="text-[11px] font-bold capitalize">{pos}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nav Style */}
          <div className="mb-5">
            <p className="text-[12px] font-bold text-text-tertiary uppercase mb-2">Menu Style</p>
            <div className="flex gap-2">
              {(["pill", "compact", "telegram"] as const).map(style => (
                <button key={style} onClick={() => setSetting("nav_style", style)}
                  className={`flex-1 py-2.5 rounded-xl border text-[12px] font-bold transition-all cursor-pointer capitalize
                    ${nav_style === style ? "bg-accent/10 border-accent/30 text-accent" : "bg-bg-secondary/40 border-border/20 text-text-tertiary hover:border-border/40"}`}>
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Clock Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-text-primary">Sidebar Clock</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">Show analog clock widget in sidebar</p>
            </div>
            <button onClick={() => setSetting("show_clock", !show_clock)}
              className={`w-12 h-7 rounded-full transition-all relative cursor-pointer ${show_clock ? "bg-accent" : "bg-border/40"}`}>
              <motion.div animate={{ x: show_clock ? 22 : 4 }} className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </Section>

        <Section title="AI Intelligence" icon={<Bot size={18} />} hidden={activeSection !== "ai"}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[14px] font-medium text-text-primary">Enable AI Features</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">AI Agent, code assistant, note intelligence</p>
            </div>
            <button
              onClick={() => setSetting("ai_enabled", !ai_enabled)}
              className={`w-12 h-7 rounded-full transition-all relative cursor-pointer ${ai_enabled ? "bg-accent" : "bg-border/40"}`}
            >
              <motion.div
                animate={{ x: ai_enabled ? 22 : 4 }}
                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm"
              />
            </button>
          </div>
          {ai_enabled && (
          <div className="flex flex-col gap-4">
            
            {/* Provider Selection */}
            <div>
              <p className="text-[12px] font-bold text-text-tertiary uppercase mb-2">Active Provider</p>
              <button
                onClick={() => setShowProviderPicker(!showProviderPicker)}
                className="w-full flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-xl border border-border-light text-[14px] text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
              >
                <span className="capitalize">{ai_provider}</span>
                <ChevronRight size={16} className={`text-text-tertiary transition-transform ${showProviderPicker ? "rotate-90" : ""}`} />
              </button>
              
              <AnimatePresence>
                {showProviderPicker && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-0.5 overflow-hidden">
                    {["ollama", "openrouter", "groq", "openai", "anthropic", "deepseek", "gemini"].map(p => (
                      <button key={p} onClick={() => { setSetting("ai_provider", p as any); setShowProviderPicker(false); }} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[13px] capitalize transition-colors cursor-pointer ${ai_provider === p ? "bg-accent/10 text-accent font-medium" : "text-text-secondary hover:bg-bg-hover"}`}>
                        <span>{p}</span>
                        {ai_provider === p && <Check size={14} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Model Selection (only for Ollama right now, other providers let user type) */}
            {ai_provider === "ollama" ? (
              <div>
                <p className="text-[12px] font-bold text-text-tertiary uppercase mb-2 flex justify-between">
                   Local Model
                   <span className={ollamaOnline ? "text-success" : "text-warning"}>{ollamaOnline ? "Online" : "Offline"}</span>
                </p>
                <button onClick={() => setShowModelPicker(!showModelPicker)} className="w-full flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-xl border border-border-light text-[14px] text-text-primary hover:bg-bg-hover transition-colors cursor-pointer">
                  <span>{ai_model}</span>
                  <ChevronRight size={16} className={`text-text-tertiary transition-transform ${showModelPicker ? "rotate-90" : ""}`} />
                </button>
                <AnimatePresence>
                  {showModelPicker && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-0.5 overflow-hidden">
                      <ModelButton name="glm-5:cloud" selected={ai_model === "glm-5:cloud"} isDefault onClick={() => { setSetting("ai_model", "glm-5:cloud"); setModel("glm-5:cloud"); setShowModelPicker(false); }} />
                      {models.filter(m => m.name !== "glm-5:cloud").map(m => (
                        <ModelButton key={m.name} name={m.name} selected={ai_model === m.name} onClick={() => { setSetting("ai_model", m.name); setModel(m.name); setShowModelPicker(false); }} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div>
                <p className="text-[12px] font-bold text-text-tertiary uppercase mb-2">Target Model Name</p>
                <input 
                  type="text" 
                  value={ai_model} 
                  onChange={e => setSetting("ai_model", e.target.value)} 
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet-20241022" 
                  className="w-full px-4 py-3 bg-bg-secondary rounded-xl border border-border-light text-[14px] text-text-primary outline-none focus:border-accent"
                />
              </div>
            )}

            {/* API Keys */}
            <div className="pt-4 border-t border-border/40">
              <p className="text-[12px] font-bold text-text-tertiary uppercase mb-3">API Keys</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { id: "api_key_openrouter", label: "OpenRouter Key", val: api_key_openrouter },
                  { id: "api_key_groq", label: "Groq Key", val: api_key_groq },
                  { id: "api_key_openai", label: "OpenAI Key", val: api_key_openai },
                  { id: "api_key_anthropic", label: "Anthropic Key", val: api_key_anthropic },
                  { id: "api_key_deepseek", label: "DeepSeek Key", val: api_key_deepseek },
                  { id: "api_key_gemini", label: "Gemini Key", val: api_key_gemini },
                ].map(k => (
                  <div key={k.id} className="relative">
                    <input 
                      type="password" 
                      value={k.val} 
                      onChange={e => setSetting(k.id as any, e.target.value)} 
                      placeholder={k.label} 
                      className="w-full px-3 py-2 bg-bg-secondary rounded-lg border border-border-light text-[12px] text-text-primary outline-none focus:border-accent font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </Section>

        {/* Security PIN */}
        <Section title="App Security" icon={<Shield size={18} />} hidden={activeSection !== "security"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-text-primary">App Lock PIN</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">
                {security_pin ? "PIN is set — app requires PIN on launch" : "No PIN set — app opens directly"}
              </p>
            </div>
            {security_pin ? (
              <button
                onClick={() => { setSetting("security_pin", null); setPinMode("idle"); }}
                className="px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-[12px] font-bold cursor-pointer hover:bg-danger/15"
              >
                Remove PIN
              </button>
            ) : (
              <button
                onClick={() => { setPinMode("set"); setPinInput(""); }}
                className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-[12px] font-bold cursor-pointer hover:bg-accent/15"
              >
                <Lock size={12} className="inline mr-1" /> Set PIN
              </button>
            )}
          </div>
          <AnimatePresence>
            {pinMode === "set" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden">
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="Enter 4-digit PIN"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-bg-secondary border border-border-light text-[14px] text-text-primary outline-none focus:border-accent text-center tracking-[0.5em] font-bold"
                  />
                  <button
                    disabled={pinInput.length !== 4}
                    onClick={() => { setSetting("security_pin", pinInput); setPinMode("idle"); setPinInput(""); }}
                    className="px-4 py-2.5 rounded-xl bg-accent text-white text-[12px] font-bold cursor-pointer disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        <Section title={t("settings.updates")} icon={<Download size={18} />} hidden={activeSection !== "updates"}>
          <UpdatePanel
            status={status}
            currentVersion={currentVersion}
            version={updateVersion}
            percent={percent}
            error={updateError}
            onCheck={checkForUpdates}
            onDownload={downloadUpdate}
            onInstall={quitAndInstall}
          />
        </Section>

        <Section title={t("settings.danger_zone")} icon={<AlertTriangle size={18} />} hidden={activeSection !== "data"}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-[14px] font-medium text-text-primary">
                {t("settings.wipe_title")}
              </p>
              <p className="text-[12px] text-text-tertiary mt-0.5">
                {t("settings.wipe_sub")}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowWipeConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg
                bg-danger/10 hover:bg-danger/15 border border-danger/30
                text-[13px] font-medium text-danger transition-colors cursor-pointer shrink-0"
            >
              <Trash2 size={14} />
              {t("settings.wipe_button")}
            </motion.button>
          </div>

          <AnimatePresence>
            {showWipeConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-xl bg-danger/10 border border-danger/30">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle size={16} className="text-danger mt-0.5 shrink-0" />
                    <p className="text-[13px] text-danger">
                      {t("settings.wipe_confirm")}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowWipeConfirm(false)}
                      disabled={wiping}
                      className="px-3 py-1.5 rounded-lg bg-bg-secondary
                        text-[12px] font-medium text-text-primary cursor-pointer
                        hover:bg-bg-hover transition-colors"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      onClick={wipeAllData}
                      disabled={wiping}
                      className="px-3 py-1.5 rounded-lg bg-danger text-white
                        text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      {wiping ? t("settings.wipe_running") : t("settings.wipe_confirm_button")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        <Section title={t("settings.about")} icon={<Info size={18} />} hidden={activeSection !== "about"}>
          <div className="flex items-center gap-4">
            <Logo size={56} />
            <div className="flex-1">
              <h3 className="text-[17px] font-semibold text-text-primary tracking-[-0.01em]">Delay</h3>
              <p className="text-[12px] text-text-secondary">
                Version <span className="font-mono font-bold">{__APP_VERSION__}</span>
                <span className="text-text-tertiary"> · built {__BUILD_DATE__}</span>
              </p>
              <p className="text-[12px] text-text-tertiary mt-0.5">
                Notes, tasks, calendar & AI — your second brain for deep work.
              </p>
            </div>
            <a href={`https://github.com/AzizX-coder/Delay/releases/tag/v${__APP_VERSION__}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-secondary hover:bg-bg-hover border border-border-light text-[12px] text-text-secondary hover:text-text-primary transition-colors">
              <ExternalLink size={12} /> Release notes
            </a>
          </div>

          {/* Build / runtime info */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {([
              ["Platform",   detectPlatform()],
              ["Build mode", import.meta.env.MODE],
              ["Online",     navigator.onLine ? "Yes" : "No"],
              ["Locale",     navigator.language],
            ] as const).map(([k, v]) => (
              <div key={k} className="px-3 py-2 rounded-lg bg-bg-secondary/50 border border-border/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{k}</p>
                <p className="text-[12px] font-mono text-text-primary mt-0.5 truncate">{v}</p>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="https://github.com/AzizX-coder/Delay" target="_blank" rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-bg-secondary/50 hover:bg-bg-hover border border-border/30 text-[11.5px] font-semibold text-text-secondary hover:text-text-primary cursor-pointer transition-colors">GitHub</a>
            <a href="https://github.com/AzizX-coder/Delay/releases" target="_blank" rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-bg-secondary/50 hover:bg-bg-hover border border-border/30 text-[11.5px] font-semibold text-text-secondary hover:text-text-primary cursor-pointer transition-colors">All releases</a>
            <a href="https://github.com/AzizX-coder/Delay/issues/new" target="_blank" rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-bg-secondary/50 hover:bg-bg-hover border border-border/30 text-[11.5px] font-semibold text-text-secondary hover:text-text-primary cursor-pointer transition-colors">Report a bug</a>
            <a href="mailto:hello@delay.app"
              className="px-3 py-1.5 rounded-lg bg-bg-secondary/50 hover:bg-bg-hover border border-border/30 text-[11.5px] font-semibold text-text-secondary hover:text-text-primary cursor-pointer transition-colors">Email</a>
          </div>
        </Section>
        </div>
      </div>
    </div>
  );
}

/** Sub-header shown above non-Section content (e.g. the Account panel). */
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-[20px] font-bold tracking-[-0.02em] text-text-primary">{title}</h2>
      <p className="text-[12.5px] text-text-tertiary mt-0.5">{subtitle}</p>
    </div>
  );
}

/** Best-effort platform label for the About panel — desktop / mobile / web. */
function detectPlatform(): string {
  if (typeof window !== "undefined" && (window as any).electronAPI?.isElectron) return "Desktop (Electron)";
  if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) return "Android (Capacitor)";
  const m = (navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/) || [])[0];
  return m ? `Web · ${m}` : "Web";
}

function UpdatePanel({
  status,
  currentVersion,
  version,
  percent,
  error,
  onCheck,
  onDownload,
  onInstall,
}: {
  status: string;
  currentVersion: string;
  version: string | null;
  percent: number;
  error: string | null;
  onCheck: () => void;
  onDownload: () => void;
  onInstall: () => void;
}) {
  const isChecking = status === "checking";
  const isDownloading = status === "downloading";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-medium text-text-primary">
            You're on version {currentVersion}
          </p>
          <p className="text-[12px] text-text-tertiary">
            {statusMessage(status, version)}
          </p>
        </div>

        {status === "available" && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg
              bg-accent text-white text-[13px] font-medium
              hover:bg-accent-hover transition-colors cursor-pointer"
          >
            <Download size={14} />
            Download
          </motion.button>
        )}

        {status === "downloaded" && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onInstall}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg
              bg-success text-white text-[13px] font-medium
              hover:opacity-90 transition-opacity cursor-pointer"
          >
            <CheckCircle2 size={14} />
            Install &amp; restart
          </motion.button>
        )}

        {(status === "idle" ||
          status === "not-available" ||
          status === "error") && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onCheck}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg
              bg-bg-secondary hover:bg-bg-hover border border-border-light
              text-[13px] text-text-primary transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Check for updates
          </motion.button>
        )}

        {isChecking && (
          <div className="flex items-center gap-1.5 px-4 py-2 text-[13px] text-text-secondary">
            <RefreshCw size={14} className="animate-spin" />
            Checking…
          </div>
        )}
      </div>

      {isDownloading && (
        <div className="w-full">
          <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ type: "tween", duration: 0.3 }}
            />
          </div>
          <p className="text-[11px] text-text-tertiary mt-1.5">
            Downloading… {percent}%
          </p>
        </div>
      )}

      {status === "error" && error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-danger/10 text-danger text-[12px]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}
    </div>
  );
}

function statusMessage(status: string, version: string | null) {
  switch (status) {
    case "checking":
      return "Checking for updates…";
    case "available":
      return `Version ${version ?? "?"} is available`;
    case "not-available":
      return "You're up to date.";
    case "downloading":
      return "Downloading the latest version…";
    case "downloaded":
      return `Version ${version ?? "?"} is ready to install`;
    case "error":
      return "Something went wrong.";
    default:
      return "Automatic updates enabled.";
  }
}

function Section({
  title,
  icon,
  children,
  hidden,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  hidden?: boolean | "" | string | null;
}) {
  if (hidden) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-text-tertiary">{icon}</span>
        <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div
        className="bg-bg-glass-heavy backdrop-blur-xl rounded-2xl border border-border-light
          p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_28px_rgba(0,0,0,0.06)]"
      >
        {children}
      </div>
    </div>
  );
}

function ModelButton({
  name,
  selected,
  isDefault,
  onClick,
}: {
  name: string;
  selected: boolean;
  isDefault?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5
        rounded-lg text-[13px] transition-colors cursor-pointer
        ${
          selected
            ? "bg-accent/10 text-accent font-medium"
            : "text-text-secondary hover:bg-bg-hover"
        }`}
    >
      <span className="flex items-center gap-2">
        {name}
        {isDefault && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
            Default
          </span>
        )}
      </span>
      {selected && <Check size={14} />}
    </button>
  );
}
