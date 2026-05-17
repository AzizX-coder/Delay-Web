import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  StickyNote, CheckSquare, Calendar, Sparkles, Timer, Code2,
  HardDrive, Settings, Columns3, PenTool, Mic, Plus, X, Archive, Bookmark, BarChart3, Clock, GitBranch,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTimerStore } from "@/stores/timerStore";
import { ALL_MODULES } from "@/types/settings";
import { ProfileButton } from "@/components/ui/ProfileButton";

const ICON_MAP: Record<string, any> = {
  StickyNote, CheckSquare, Calendar, Timer, Sparkles, Code2,
  HardDrive, Columns3, PenTool, Mic, Archive, Bookmark, BarChart3, GitBranch,
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = time.getHours();
  const m = time.getMinutes();
  const s = time.getSeconds();
  const hAngle = (h % 12) * 30 + m * 0.5;
  const mAngle = m * 6;
  const sAngle = s * 6;

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {/* Analog face */}
      <div className="relative w-[42px] h-[42px]">
        <svg viewBox="0 0 42 42" className="w-full h-full">
          <circle cx="21" cy="21" r="19" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border/40" />
          {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => (
            <line key={a} x1="21" y1="4" x2="21" y2={a % 90 === 0 ? "7" : "5.5"}
              stroke="currentColor" strokeWidth={a % 90 === 0 ? "1.5" : "0.8"}
              className="text-text-tertiary" transform={`rotate(${a} 21 21)`} />
          ))}
          {/* Hour */}
          <line x1="21" y1="21" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="text-text-primary" transform={`rotate(${hAngle} 21 21)`} />
          {/* Minute */}
          <line x1="21" y1="21" x2="21" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
            className="text-accent" transform={`rotate(${mAngle} 21 21)`} />
          {/* Second */}
          <line x1="21" y1="21" x2="21" y2="6" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round"
            className="text-danger" transform={`rotate(${sAngle} 21 21)`} />
          <circle cx="21" cy="21" r="1.5" className="fill-accent" />
        </svg>
      </div>
      {/* Digital */}
      <span className="text-[9px] font-bold font-mono tabular-nums text-text-tertiary">
        {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}
      </span>
    </div>
  );
}

export function NavigationRail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const { enabled_modules, toggleModule, ai_enabled, nav_style, nav_position, show_clock } = useSettingsStore();

  const visibleItems = ALL_MODULES.filter(m => {
    if (!enabled_modules.includes(m.id)) return false;
    if (m.id === "ai" && !ai_enabled) return false;
    return true;
  });
  const { isRunning: timerRunning, remaining: timerRemaining } = useTimerStore();
  const timerMin = Math.floor(timerRemaining / 60);
  const timerSec = timerRemaining % 60;
  const timerDisplay = `${timerMin}:${String(timerSec).padStart(2, '0')}`;

  const isTelegram = nav_style === "telegram";
  const isCompact = nav_style === "compact";

  // Item size classes — larger on mobile for proper touch targets (Material 48dp minimum)
  const itemClass = isTelegram
    ? "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer min-h-[48px]"
    : isCompact
    ? "flex flex-col items-center justify-center min-w-[48px] h-[48px] md:min-w-[42px] md:h-[42px] shrink-0 rounded-lg md:rounded-xl transition-all duration-200 cursor-pointer"
    : "group relative flex flex-col items-center justify-center min-w-[56px] h-[52px] md:min-w-[48px] md:h-[44px] shrink-0 rounded-xl transition-all duration-200 cursor-pointer";

  const renderItem = (item: typeof visibleItems[number]) => {
    const path = `/${item.id}`;
    const isActive = location.pathname.startsWith(path);
    const Icon = ICON_MAP[item.icon] || Sparkles;
    const isHovered = hoveredPath === path;

    const renderIcon = (sz: number) => (
      <Icon size={sz} strokeWidth={isActive ? 2.2 : 1.7}
        className={`transition-all duration-200 ${isActive ? "text-accent" : "text-text-tertiary group-hover:text-text-primary"}`} />
    );

    if (isTelegram) {
      return (
        <button key={item.id} onClick={() => navigate(path)}
          className={`${itemClass} ${isActive ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-bg-hover"}`}>
          {renderIcon(20)}
          <span className="text-[13px] font-semibold flex-1">{item.label}</span>
          {item.id === "timer" && timerRunning && (
            <span className="text-[10px] font-mono font-bold tabular-nums animate-pulse text-accent">{timerDisplay}</span>
          )}
        </button>
      );
    }

    return (
      <button key={item.id} onClick={() => navigate(path)}
        onMouseEnter={() => setHoveredPath(path)} onMouseLeave={() => setHoveredPath(null)}
        className={itemClass} title={item.label}>
        {isActive && !isCompact && (
          <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 ring-1 ring-accent/20 shadow-sm"
            transition={{ type: "spring", stiffness: 400, damping: 30 }} />
        )}
        {item.id === "timer" && timerRunning ? (
          <span className={`relative z-10 text-[10px] font-bold font-mono tabular-nums animate-pulse ${isActive ? "text-accent" : "text-text-secondary"}`}>{timerDisplay}</span>
        ) : (
          <>
            <span className="relative z-10">{renderIcon(isCompact ? 22 : 24)}</span>
            {!isCompact && (
              <span className={`relative z-10 text-[9.5px] md:text-[8.5px] mt-0.5 font-semibold transition-all duration-200 ${isActive ? "text-accent" : "text-text-tertiary group-hover:text-text-secondary"}`}>
                {item.label}
              </span>
            )}
          </>
        )}
        {isCompact && isActive && <div className="absolute bottom-0 w-4 h-[2px] rounded-full bg-accent" />}
        {!isTelegram && <AnimatedTooltip visible={isHovered && !isActive} label={item.id === "timer" && timerRunning ? timerDisplay : item.label} />}
      </button>
    );
  };

  const isHorizontal = nav_position === "bottom";
  // Outer reserves layout space; inner panel is the visible "floating glass" sidebar
  const outerWidth = isHorizontal ? "w-full" : isTelegram ? "md:w-[224px]" : isCompact ? "md:w-[68px]" : "md:w-[80px]";
  const outerHeight = isHorizontal ? "h-[72px] md:h-[80px]" : "md:h-full h-[72px]";
  const outerFlex = isHorizontal ? "items-center justify-center" : "md:flex-col items-stretch md:items-center justify-center";

  // Floating panel — rounded, glass, max-height for vertical desktop
  const panelBase = "flex gap-0.5 bg-bg-sidebar/70 backdrop-blur-2xl border border-border/30 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)] rounded-[24px] no-scrollbar";
  const panelLayout = isHorizontal
    ? `${panelBase} flex-row items-center px-2 py-1.5 mx-3 mb-2 mt-1 max-w-[min(720px,calc(100vw-24px))] overflow-x-auto`
    : `${panelBase} flex-row md:flex-col items-center w-full md:w-auto md:my-3 ${nav_position === "right" ? "md:mr-3" : "md:ml-3"} mx-2 mb-2 mt-1 md:mt-0 md:max-h-[min(840px,calc(100vh-90px))] ${isTelegram ? "md:px-2 md:py-3 px-2 py-1.5" : "md:px-2 md:py-3 px-1 py-1.5"} overflow-x-auto md:overflow-y-auto md:overflow-x-visible`;

  return (
    <nav className={`flex ${outerFlex} ${outerWidth} ${outerHeight} shrink-0 relative z-50`}>
      <div className={panelLayout}>

      {/* Clock widget (vertical sidebar only — not when bottom-nav) */}
      {show_clock && !isHorizontal && (
        <div className="hidden md:flex w-full justify-center border-b border-border/20 mb-1.5 pb-1.5">
          <LiveClock />
        </div>
      )}

      {/* Module items */}
      {visibleItems.map(renderItem)}

      {/* Profile */}
      <div className={`${isTelegram ? "w-full" : "flex justify-center"} md:mt-auto ml-auto md:ml-0`}>
        <ProfileButton compact={isCompact} telegram={isTelegram} />
      </div>

      {/* Settings */}
      <button onClick={() => navigate("/settings")}
        onMouseEnter={() => setHoveredPath("/settings")} onMouseLeave={() => setHoveredPath(null)}
        className={`${isTelegram
          ? "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer md:mt-auto ml-auto md:ml-0"
          : `group relative flex flex-col items-center justify-center ${isCompact ? "w-[40px] h-[40px] rounded-lg" : "w-[48px] h-[44px] rounded-xl"} shrink-0 transition-all duration-200 cursor-pointer md:mt-auto ml-auto md:ml-0`}`}
        title="Settings">
        {location.pathname === "/settings" && !isTelegram && !isCompact && (
          <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-accent/12"
            transition={{ type: "spring", stiffness: 400, damping: 30 }} />
        )}
        <Settings size={isTelegram ? 18 : isCompact ? 17 : 19} strokeWidth={location.pathname === "/settings" ? 2.2 : 1.7}
          className={`relative z-10 transition-all ${location.pathname === "/settings"
            ? "text-accent"
            : isTelegram ? "text-text-secondary" : "text-text-tertiary group-hover:text-text-primary"}`} />
        {isTelegram ? (
          <span className={`text-[13px] font-semibold flex-1 ${location.pathname === "/settings" ? "text-accent" : "text-text-secondary"}`}>Settings</span>
        ) : !isCompact ? (
          <span className={`relative z-10 text-[8px] mt-0.5 font-medium ${location.pathname === "/settings" ? "text-accent" : "text-text-tertiary"}`}>Settings</span>
        ) : null}
      </button>

      {/* + Module Manager — bigger, more visible */}
      <button onClick={() => setShowManager(true)}
        className={`${isTelegram
          ? "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-accent/10 text-accent hover:bg-accent/15 border border-accent/20 md:mb-2 font-bold"
          : `w-[44px] h-[44px] shrink-0 md:mb-2 ml-1 md:ml-0 flex items-center justify-center rounded-xl bg-accent/10 text-accent hover:bg-accent/15 border border-accent/20 active:scale-95`} transition-all cursor-pointer shadow-sm`}
        title="Customize Modules" aria-label="Open module manager">
        <Plus size={isTelegram ? 16 : 18} strokeWidth={2.5} />
        {isTelegram && <span className="text-[12px] font-bold">Modules</span>}
      </button>

      </div>{/* /panel */}

      {/* Module Manager — centered modal works on any nav position */}
      <AnimatePresence>
        {showManager && (
          <ModuleManagerModal
            onClose={() => setShowManager(false)}
            enabled_modules={enabled_modules}
            toggleModule={toggleModule}
            navPosition={nav_position}
          />
        )}
      </AnimatePresence>
    </nav>
  );
}

function ModuleManagerModal({ onClose, enabled_modules, toggleModule, navPosition }: {
  onClose: () => void;
  enabled_modules: string[];
  toggleModule: (id: string) => void;
  navPosition: string;
}) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose}
        aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        role="dialog" aria-label="Module manager"
        className="fixed z-[101] bg-bg-elevated/98 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden
          left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2
          w-[min(420px,calc(100vw-24px))] max-h-[min(560px,calc(100vh-120px))]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div>
            <p className="text-[15px] font-extrabold text-text-primary">Modules</p>
            <p className="text-[11px] text-text-tertiary">Toggle the workspaces you need · {navPosition} nav</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-all cursor-pointer" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-2 max-h-[440px]">
          {ALL_MODULES.map(m => {
            const Icon = ICON_MAP[m.icon] || Sparkles;
            const enabled = enabled_modules.includes(m.id);
            return (
              <button key={m.id} onClick={() => toggleModule(m.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer
                  ${enabled ? "bg-accent/8" : "hover:bg-bg-hover"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${enabled ? "bg-accent/15 ring-1 ring-accent/25" : "bg-bg-hover"}`}>
                  <Icon size={16} strokeWidth={enabled ? 2.4 : 1.8} className={enabled ? "text-accent" : "text-text-tertiary"} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-[13px] font-bold ${enabled ? "text-text-primary" : "text-text-secondary"}`}>{m.label}</p>
                  <p className="text-[10.5px] opacity-60">{m.desc}</p>
                </div>
                <div className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${enabled ? "bg-accent" : "bg-border/40"}`}>
                  <motion.div animate={{ x: enabled ? 16 : 2 }} className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

function AnimatedTooltip({ visible, label }: { visible: boolean; label: string }) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      className="absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-lg
        bg-bg-elevated border border-border/40 shadow-lg
        text-[11px] font-semibold text-text-primary whitespace-nowrap pointer-events-none"
    >
      {label}
    </motion.div>
  );
}
