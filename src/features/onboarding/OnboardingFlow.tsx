import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useThemeStore } from "@/stores/themeStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { listOllamaModels, checkOllamaStatus } from "@/lib/ollama";
import { LANGUAGES, ALL_MODULES, DEFAULT_MODULES } from "@/types/settings";
import {
  Sun, Moon, Monitor, ChevronRight, ChevronLeft, Globe,
  Sparkles, Check, StickyNote, CheckSquare, Calendar, Timer,
  Code2, HardDrive, Columns3, PenTool, Mic, Leaf, Coffee, Waves, Flower2, Plus,
  Cloud, RefreshCw, Share2, Lock, Wifi, UserX,
  GraduationCap, Briefcase, Heart, Palette,
} from "lucide-react";

type UseCase = "student" | "builder" | "personal" | "work" | "creative";

// What modules to pre-select for each use-case. Picked to give every
// persona an obviously-useful starter workspace without overwhelming them
// with all 13 modules. The user can still toggle on the next step.
const USE_CASE_PRESETS: Record<UseCase, string[]> = {
  student:  ["notes", "tasks", "calendar", "timer", "ai", "capture", "status"],
  builder:  ["notes", "tasks", "code-studio", "kanban", "ai", "timer", "flows", "status"],
  personal: ["notes", "tasks", "calendar", "timer", "capture", "bucket", "ai"],
  work:     ["notes", "tasks", "calendar", "kanban", "flows", "ai", "status"],
  creative: ["notes", "whiteboard", "voice-studio", "capture", "bucket", "kanban"],
};
import type { OllamaModel } from "@/types/ai";
import { Logo } from "@/components/ui/Logo";

const ICON_MAP: Record<string, any> = {
  StickyNote, CheckSquare, Calendar, Timer, Sparkles, Code2, HardDrive,
  Columns3, PenTool, Mic, Globe,
};

const STEPS = 6;

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const { theme, setTheme } = useThemeStore();
  const {
    language, ai_model, ai_enabled, ai_provider, reduce_motion,
    setSetting, completeOnboarding,
  } = useSettingsStore();

  const [usageMode, setUsageMode] = useState<"cloud" | "local" | null>(null);
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [selectedLang, setSelectedLang] = useState(language);
  const [selectedModel, setSelectedModel] = useState(ai_model);
  const [selectedModules, setSelectedModules] = useState<string[]>([...DEFAULT_MODULES]);
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [, setOllamaOnline] = useState(false);

  useEffect(() => {
    checkOllamaStatus().then(setOllamaOnline);
    listOllamaModels().then(setModels);
  }, []);

  const toggleModule = (id: string) => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const next = () => { if (step < STEPS - 1) { setDirection(1); setStep(step + 1); } };
  const prev = () => { if (step > 0) { setDirection(-1); setStep(step - 1); } };

  const pickUseCase = (uc: UseCase) => {
    setUseCase(uc);
    // Snap the module selection to the preset for this persona. The user
    // can still tweak it on the modules step.
    setSelectedModules([...USE_CASE_PRESETS[uc]]);
  };

  const finish = async () => {
    await setSetting("usage_mode", usageMode ?? "local");
    if (useCase) await setSetting("use_case", useCase);
    await setSetting("language", selectedLang);
    await setSetting("ai_model", selectedModel);
    await setSetting("enabled_modules", selectedModules);
    if (apiKey.trim()) await setSetting("api_key_openrouter", apiKey.trim());
    await completeOnboarding();
  };

  // Transform + opacity only — GPU-composited, no filter:blur (the old laggy bit).
  const reduce = reduce_motion;
  const variants = {
    enter: (dir: number) => ({ x: reduce ? 0 : dir > 0 ? 36 : -36, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: reduce ? 0 : dir > 0 ? -36 : 36, opacity: 0 }),
  };
  const transition = { duration: reduce ? 0.12 : 0.26, ease: [0.22, 1, 0.36, 1] as const };

  const groups = [
    { key: "core", label: "Core" },
    { key: "create", label: "Create" },
    { key: "workspace", label: "Workspace" },
    { key: "media", label: "Media" },
    { key: "system", label: "System" },
  ];

  // Gate Next on step 0 (mode) and step 1 (use case) until the user picks.
  const canAdvance =
    (step === 0 && usageMode === null) ? false :
    (step === 1 && useCase === null)   ? false :
    true;

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bg-primary overflow-hidden">
      {/* Static gradient glows — no motion, no filter:blur. Costs nothing at runtime. */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full opacity-[0.16]"
          style={{ background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-44 -right-32 w-[460px] h-[460px] rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)" }}
        />
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-xl bg-bg-secondary border border-border/50
          rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Progress bars */}
        <div className="flex gap-1.5 p-1 px-10 pt-8">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          ))}
        </div>

        <div className="px-10 py-10 min-h-[520px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 0: How do you want to use Delay? */}
            {step === 0 && (
              <motion.div key="mode" custom={direction} variants={variants}
                initial="enter" animate="center" exit="exit" transition={transition}
                className="flex-1 flex flex-col">
                <div className="flex items-center gap-4 mb-7">
                  <div className="p-3 rounded-2xl bg-accent shadow-xl shadow-accent/30">
                    <Logo size={36} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent/70">Welcome to Delay</p>
                    <h1 className="text-[24px] font-extrabold text-text-primary tracking-tight leading-tight mt-0.5">
                      How do you want to use it?
                    </h1>
                    <p className="text-[13px] text-text-tertiary font-medium">You can switch later in Settings.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  {/* Cloud */}
                  <button
                    onClick={() => setUsageMode("cloud")}
                    className={`relative flex flex-col items-start text-left p-5 rounded-3xl border-2 transition-colors cursor-pointer
                      ${usageMode === "cloud"
                        ? "border-accent bg-accent/5"
                        : "border-border/40 bg-bg-primary/40 hover:border-border"}`}
                  >
                    <div className={`p-2.5 rounded-2xl mb-3 ${usageMode === "cloud" ? "bg-accent text-white" : "bg-bg-hover text-text-tertiary"}`}>
                      <Cloud size={22} />
                    </div>
                    <span className="text-[15px] font-bold text-text-primary mb-1">Cloud Account</span>
                    <span className="text-[12px] text-text-tertiary leading-snug mb-3">
                      Sign in to sync everything across your devices.
                    </span>
                    <ul className="space-y-1.5 mt-auto">
                      {[
                        { icon: RefreshCw, t: "Sync across devices" },
                        { icon: Cloud, t: "Automatic backup" },
                        { icon: Share2, t: "Share notes & boards" },
                      ].map(({ icon: I, t }) => (
                        <li key={t} className="flex items-center gap-2 text-[11px] text-text-secondary font-medium">
                          <I size={12} className="text-accent shrink-0" /> {t}
                        </li>
                      ))}
                    </ul>
                    {usageMode === "cloud" && (
                      <div className="absolute top-3 right-3 text-accent"><Check size={18} strokeWidth={3} /></div>
                    )}
                  </button>

                  {/* Local */}
                  <button
                    onClick={() => setUsageMode("local")}
                    className={`relative flex flex-col items-start text-left p-5 rounded-3xl border-2 transition-colors cursor-pointer
                      ${usageMode === "local"
                        ? "border-accent bg-accent/5"
                        : "border-border/40 bg-bg-primary/40 hover:border-border"}`}
                  >
                    <div className={`p-2.5 rounded-2xl mb-3 ${usageMode === "local" ? "bg-accent text-white" : "bg-bg-hover text-text-tertiary"}`}>
                      <HardDrive size={22} />
                    </div>
                    <span className="text-[15px] font-bold text-text-primary mb-1">Local Only</span>
                    <span className="text-[12px] text-text-tertiary leading-snug mb-3">
                      Everything stays on this device. No account needed.
                    </span>
                    <ul className="space-y-1.5 mt-auto">
                      {[
                        { icon: Lock, t: "100% private" },
                        { icon: Wifi, t: "Works fully offline" },
                        { icon: UserX, t: "No sign-up" },
                      ].map(({ icon: I, t }) => (
                        <li key={t} className="flex items-center gap-2 text-[11px] text-text-secondary font-medium">
                          <I size={12} className="text-accent shrink-0" /> {t}
                        </li>
                      ))}
                    </ul>
                    {usageMode === "local" && (
                      <div className="absolute top-3 right-3 text-accent"><Check size={18} strokeWidth={3} /></div>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 1: Use case — personalizes the workspace */}
            {step === 1 && (
              <motion.div key="usecase" custom={direction} variants={variants}
                initial="enter" animate="center" exit="exit" transition={transition}
                className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-accent text-white shadow-lg shadow-accent/20"><Sparkles size={24} /></div>
                  <div>
                    <h2 className="text-[22px] font-bold text-text-primary tracking-tight">What's this mainly for?</h2>
                    <p className="text-[12px] text-text-tertiary">We'll set up the right tools for you. Change anything later.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto max-h-[360px] pr-2 custom-scrollbar">
                  {([
                    { id: "student",  icon: GraduationCap, label: "Studying / school", sub: "Notes, calendar, focus timer, AI tutor" },
                    { id: "builder",  icon: Code2,         label: "Building software",  sub: "Code studio, tasks, kanban, AI, flows" },
                    { id: "work",     icon: Briefcase,     label: "Work / a team",      sub: "Tasks, calendar, kanban, status, flows" },
                    { id: "personal", icon: Heart,         label: "Personal life",      sub: "Notes, tasks, capture, vault, calendar" },
                    { id: "creative", icon: Palette,       label: "Creative projects",  sub: "Whiteboard, voice, capture, vault, boards" },
                  ] as { id: UseCase; icon: any; label: string; sub: string }[]).map(({ id, icon: Icon, label, sub }) => {
                    const active = useCase === id;
                    return (
                      <button key={id} onClick={() => pickUseCase(id)}
                        className={`relative flex items-start gap-3 p-4 rounded-2xl border-2 transition-colors cursor-pointer text-left
                          ${active ? "border-accent bg-accent/5" : "border-border/40 bg-bg-primary/40 hover:border-border"}`}>
                        <div className={`p-2 rounded-xl shrink-0 ${active ? "bg-accent text-white" : "bg-bg-hover text-text-tertiary"}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13.5px] font-bold ${active ? "text-accent" : "text-text-primary"}`}>{label}</p>
                          <p className="text-[11px] text-text-tertiary mt-0.5">{sub}</p>
                        </div>
                        {active && (
                          <div className="absolute top-2.5 right-2.5 text-accent"><Check size={15} strokeWidth={3} /></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Theme */}
            {step === 2 && (
              <motion.div key="theme" custom={direction} variants={variants}
                initial="enter" animate="center" exit="exit" transition={transition}
                className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-accent text-white shadow-lg shadow-accent/20"><Sun size={24} /></div>
                  <div>
                    <h2 className="text-[22px] font-bold text-text-primary tracking-tight">Pick a look you'll love</h2>
                    <p className="text-[12px] text-text-tertiary">Built for long sessions. Change anytime.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 flex-1">
                  {[
                    { value: "light" as const, icon: <Sun size={22} />, label: "Aura Light", desc: "Clean & Bright" },
                    { value: "dark" as const, icon: <Moon size={22} />, label: "Obsidian", desc: "Sleek & Deep" },
                    { value: "forest" as const, icon: <Leaf size={22} />, label: "Forest", desc: "Natural & Calm" },
                    { value: "mocha" as const, icon: <Coffee size={22} />, label: "Mocha", desc: "Warm & Cozy" },
                    { value: "ocean" as const, icon: <Waves size={22} />, label: "Ocean", desc: "Cool & Fluid" },
                    { value: "rose" as const, icon: <Flower2 size={22} />, label: "Rosé", desc: "Soft & Vibrant" },
                    { value: "system" as const, icon: <Monitor size={22} />, label: "Automatic", desc: "Follow OS" },
                  ].map((opt) => (
                    <button key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-colors cursor-pointer relative
                        ${theme === opt.value
                          ? "border-accent bg-accent/5 text-accent"
                          : "border-border/40 bg-bg-primary/40 text-text-secondary hover:border-border"}`}>
                      <div className={`mb-3 p-2.5 rounded-2xl ${theme === opt.value ? "bg-accent text-white" : "bg-bg-hover text-text-tertiary"}`}>{opt.icon}</div>
                      <span className="text-[13px] font-bold mb-0.5">{opt.label}</span>
                      <span className="text-[10px] opacity-60 font-medium">{opt.desc}</span>
                      {theme === opt.value && (<div className="absolute top-2.5 right-2.5 text-accent"><Check size={16} strokeWidth={3} /></div>)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Language */}
            {step === 3 && (
              <motion.div key="language" custom={direction} variants={variants}
                initial="enter" animate="center" exit="exit" transition={transition}
                className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-accent text-white shadow-lg shadow-accent/20"><Globe size={24} /></div>
                  <div>
                    <h2 className="text-[22px] font-bold text-text-primary tracking-tight">What's your language?</h2>
                    <p className="text-[12px] text-text-tertiary">We'll match the UI and voice prompts.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[340px] pr-2 custom-scrollbar">
                  {LANGUAGES.map((lang) => (
                    <button key={lang.code}
                      onClick={() => setSelectedLang(lang.code)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-colors cursor-pointer
                        ${selectedLang === lang.code ? "bg-accent/10 border-accent/40" : "bg-bg-primary/40 border-transparent hover:border-border/40"}`}>
                      <div className="flex items-center gap-4 text-left">
                        <div className="text-2xl">{lang.code === "en" ? "🇺🇸" : lang.code === "ru" ? "🇷🇺" : lang.code === "es" ? "🇪🇸" : lang.code === "uz" ? "🇺🇿" : "🌐"}</div>
                        <div>
                          <p className={`text-[14px] font-bold ${selectedLang === lang.code ? "text-accent" : "text-text-primary"}`}>{lang.name}</p>
                          <p className="text-[11px] text-text-tertiary font-medium">{lang.native}</p>
                        </div>
                      </div>
                      {selectedLang === lang.code && <Check size={18} className="text-accent" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Module selection */}
            {step === 4 && (
              <motion.div key="modules" custom={direction} variants={variants}
                initial="enter" animate="center" exit="exit" transition={transition}
                className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-accent text-white shadow-lg shadow-accent/20"><Columns3 size={24} /></div>
                  <div>
                    <h2 className="text-[22px] font-bold text-text-primary tracking-tight">Build your workspace</h2>
                    <p className="text-[13px] text-text-tertiary">Pick what you'll use. Toggle the rest anytime from the <Plus size={11} className="inline mb-0.5" /> menu.</p>
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[380px] pr-2 custom-scrollbar space-y-4">
                  {groups.map(g => {
                    const mods = ALL_MODULES.filter(m => m.group === g.key);
                    if (mods.length === 0) return null;
                    return (
                      <div key={g.key}>
                        <p className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-widest mb-2 px-1">{g.label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {mods.map(m => {
                            const Icon = ICON_MAP[m.icon] || Sparkles;
                            const enabled = selectedModules.includes(m.id);
                            return (
                              <button key={m.id} onClick={() => toggleModule(m.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer
                                  ${enabled ? "bg-accent/8 border-accent/40" : "bg-bg-primary/40 border-transparent hover:border-border/30"}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${enabled ? "bg-accent text-white" : "bg-bg-hover text-text-tertiary"}`}>
                                  <Icon size={15} />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                  <p className={`text-[12px] font-bold truncate ${enabled ? "text-accent" : "text-text-primary"}`}>{m.label}</p>
                                  <p className="text-[10px] text-text-tertiary truncate">{m.desc}</p>
                                </div>
                                {enabled && <Check size={14} className="text-accent shrink-0" strokeWidth={3} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 5: AI */}
            {step === 5 && (
              <motion.div key="ai" custom={direction} variants={variants}
                initial="enter" animate="center" exit="exit" transition={transition}
                className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-accent text-white shadow-lg shadow-accent/20"><Sparkles size={24} /></div>
                  <div>
                    <h2 className="text-[22px] font-bold text-text-primary tracking-tight">Connect AI <span className="text-text-tertiary font-medium text-[13px] align-middle">(optional)</span></h2>
                    <p className="text-[12px] text-text-tertiary">Pick a model now, or skip and configure later in Settings.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[14px] font-bold text-text-primary">Do you want to use AI?</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSetting("ai_enabled", true)}
                      className={`flex-1 py-3 rounded-xl border font-bold text-[13px] transition-colors ${ai_enabled ? "bg-accent text-white border-accent" : "bg-bg-primary/40 text-text-secondary border-border/40 hover:border-accent/40"}`}>
                      Yes, Enable AI
                    </button>
                    <button onClick={() => { setSetting("ai_enabled", false); setSelectedModel("none"); }}
                      className={`flex-1 py-3 rounded-xl border font-bold text-[13px] transition-colors ${!ai_enabled ? "bg-danger text-white border-danger" : "bg-bg-primary/40 text-text-secondary border-border/40 hover:border-danger/40"}`}>
                      No, Disable AI
                    </button>
                  </div>

                  {ai_enabled && (
                    <div className="space-y-3 pt-4 border-t border-border/20">
                      <label className="text-[12px] font-bold text-text-tertiary">Select Provider</label>
                      <select onChange={(e) => {
                        const val = e.target.value as any;
                        setSetting("ai_provider", val);
                        if (val === "openrouter") setSelectedModel("liquid/lfm-40b");
                      }} value={ai_provider} className="w-full bg-bg-primary px-3 py-2.5 rounded-xl border border-border/40 text-[13px] outline-none">
                        <option value="openrouter">OpenRouter (Cloud)</option>
                        <option value="ollama">Ollama (Local)</option>
                      </select>

                      {ai_provider !== "ollama" && (
                        <div>
                          <label className="text-[12px] font-bold text-text-tertiary">API Key</label>
                          <input
                            type="password"
                            value={apiKey}
                            placeholder="Enter OpenRouter API Key"
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full mt-1 bg-bg-primary px-3 py-2.5 rounded-xl border border-border/40 text-[13px] outline-none"
                          />
                        </div>
                      )}
                      {ai_provider === "ollama" && (
                        <div>
                          <label className="text-[12px] font-bold text-text-tertiary">Select Local Model</label>
                          <select onChange={(e) => setSelectedModel(e.target.value)} className="w-full mt-1 bg-bg-primary px-3 py-2.5 rounded-xl border border-border/40 text-[13px] outline-none">
                            {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-auto pt-8">
            <button onClick={prev} disabled={step === 0}
              className={`flex items-center gap-2 px-4 py-2 text-[14px] font-bold transition-colors cursor-pointer
                ${step === 0 ? "opacity-0 pointer-events-none" : "text-text-tertiary hover:text-text-primary"}`}>
              <ChevronLeft size={18} /> Back
            </button>
            <div className="flex gap-2">
              {Array.from({ length: STEPS }).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-accent" : "w-1.5 bg-border/40"}`} />
              ))}
            </div>
            <button
              onClick={step === STEPS - 1 ? finish : next}
              disabled={!canAdvance}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl text-[14px] font-bold transition-all cursor-pointer
                ${canAdvance
                  ? "bg-accent text-bg-primary shadow-xl shadow-accent/30 hover:opacity-90"
                  : "bg-bg-hover text-text-tertiary cursor-not-allowed"}`}>
              {step === STEPS - 1 ? "Start Delay" : "Continue"}
              {step < STEPS - 1 && <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
