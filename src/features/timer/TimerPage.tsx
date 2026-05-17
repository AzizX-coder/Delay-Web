import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTimerStore, TIMER_PRESETS } from "@/stores/timerStore";
import {
  Play, Pause, RotateCcw, Flame, Coffee, Sunset, Clock, Zap,
  Target, Plus, Trash2, Check, ChevronRight,
} from "lucide-react";

interface Goal {
  id: string;
  purpose: string;
  focusMin: number;
  breakMin: number;
  sessionsPerDay: number;
  totalDays: number;
  completedSessions: number;
  color: string;
}

const GOAL_COLORS = ["#6366F1","#EF4444","#10B981","#F59E0B","#8B5CF6","#06B6D4","#EC4899"];
const uid = () => crypto.randomUUID();

export function TimerPage() {
  const {
    mode, duration, remaining, isRunning, sessions, totalFocusSessions,
    setMode, setCustomDuration, start, pause, reset, loadSessions,
  } = useTimerStore();

  const [customMin, setCustomMin] = useState("");
  const [showGoals, setShowGoals] = useState(false);
  const [goals, setGoals] = useState<Goal[]>(() => {
    try { return JSON.parse(localStorage.getItem("delay_timer_goals") || "[]"); } catch { return []; }
  });
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({ purpose: "", focusMin: 25, breakMin: 5, sessionsPerDay: 4, totalDays: 7 });

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { localStorage.setItem("delay_timer_goals", JSON.stringify(goals)); }, [goals]);

  // Keep screen awake while timer is running
  useEffect(() => {
    if (isRunning) {
      let wakeLock: any = null;
      const requestWakeLock = async () => {
        try {
          if ('wakeLock' in navigator) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
          }
        } catch {}
      };
      requestWakeLock();
      return () => { wakeLock?.release().catch(() => {}); };
    }
  }, [isRunning]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = duration > 0 ? (duration - remaining) / duration : 0;

  const radius = 160;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const preset = TIMER_PRESETS.find((p) => p.mode === mode);
  const accentColor = preset?.color || "#007AFF";
  const activeGoal = goals.find(g => g.id === activeGoalId);

  const modeIcons = {
    focus: <Flame size={18} />,
    short_break: <Coffee size={18} />,
    long_break: <Sunset size={18} />,
  };

  const todaySessions = sessions.filter((s) => {
    const today = new Date();
    const sessionDate = new Date(s.started_at * 1000);
    return s.type === "focus" && s.completed && sessionDate.toDateString() === today.toDateString();
  });
  const totalFocusMinutes = todaySessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0);

  const addGoal = () => {
    if (!newGoal.purpose.trim()) return;
    const g: Goal = {
      id: uid(),
      purpose: newGoal.purpose,
      focusMin: newGoal.focusMin,
      breakMin: newGoal.breakMin,
      sessionsPerDay: newGoal.sessionsPerDay,
      totalDays: newGoal.totalDays,
      completedSessions: 0,
      color: GOAL_COLORS[goals.length % GOAL_COLORS.length],
    };
    setGoals(prev => [...prev, g]);
    setNewGoal({ purpose: "", focusMin: 25, breakMin: 5, sessionsPerDay: 4, totalDays: 7 });
  };

  const activateGoal = (goal: Goal) => {
    setActiveGoalId(goal.id);
    setCustomDuration(goal.focusMin);
    setShowGoals(false);
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    if (activeGoalId === id) setActiveGoalId(null);
  };

  // After a session completes, increment goal progress
  useEffect(() => {
    if (remaining === 0 && duration > 0 && !isRunning && activeGoalId && mode === "focus") {
      setGoals(prev => prev.map(g =>
        g.id === activeGoalId ? { ...g, completedSessions: g.completedSessions + 1 } : g
      ));
    }
  }, [remaining, isRunning]);

  return (
    <div className="flex h-full relative overflow-hidden">
      {/* Main timer area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none transition-all duration-1000"
          style={{ background: `radial-gradient(circle at 50% 40%, ${accentColor} 0%, transparent 70%)` }} />

        <div className="relative z-10 flex flex-col items-center">
          {/* Active goal badge */}
          {activeGoal && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-secondary/60 border border-border/30 mb-6">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: activeGoal.color }} />
              <span className="text-[12px] font-bold text-text-primary">{activeGoal.purpose}</span>
              <span className="text-[10px] text-text-tertiary">
                {activeGoal.completedSessions}/{activeGoal.sessionsPerDay * activeGoal.totalDays} sessions
              </span>
            </motion.div>
          )}

          {/* Mode selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-bg-secondary/60 border border-border/40 mb-10 backdrop-blur-sm">
            {TIMER_PRESETS.map((p) => (
              <motion.button key={p.mode} whileTap={{ scale: 0.95 }} onClick={() => setMode(p.mode)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer
                  ${mode === p.mode ? "text-bg-primary shadow-lg" : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"}`}
                style={mode === p.mode ? { backgroundColor: p.color } : {}}>
                {modeIcons[p.mode]}{p.label}
              </motion.button>
            ))}
          </div>

          {/* Circular timer */}
          <div className="relative w-[360px] h-[360px] flex items-center justify-center mb-10">
            <svg className="timer-ring absolute inset-0" width="360" height="360" viewBox="0 0 360 360">
              <circle cx="180" cy="180" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-border" opacity="0.3" />
              <circle cx="180" cy="180" r={radius} fill="none" stroke={accentColor} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                style={{ filter: `drop-shadow(0 0 8px ${accentColor}40)` }} />
            </svg>
            <div className="relative flex flex-col items-center">
              <span className="text-[72px] md:text-[104px] font-bold tracking-[-0.04em] text-text-primary leading-none tabular-nums"
                style={{ fontVariantNumeric: "tabular-nums" }}>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
              <span className="text-[13px] font-semibold uppercase tracking-widest mt-2" style={{ color: accentColor }}>
                {remaining === 0 && duration > 0 ? "Complete!" : isRunning ? "Running" : "Paused"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mb-10">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} onClick={reset}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-bg-secondary/60 text-text-secondary hover:text-text-primary border border-border/40 cursor-pointer">
              <RotateCcw size={20} />
            </motion.button>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} onClick={isRunning ? pause : start}
              className="w-16 h-16 flex items-center justify-center rounded-full text-white shadow-2xl cursor-pointer"
              style={{ backgroundColor: accentColor, boxShadow: `0 8px 32px ${accentColor}40` }}>
              {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </motion.button>

            <div className="relative">
              <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-bg-secondary/60 border border-border/40">
                <input type="number" placeholder="∞" value={customMin}
                  onChange={(e) => { setCustomMin(e.target.value); const val = parseInt(e.target.value); if (val > 0 && val <= 180) setCustomDuration(val); }}
                  className="w-full h-full text-center bg-transparent text-[13px] font-bold text-text-primary outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  min={1} max={180} />
              </div>
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-text-tertiary whitespace-nowrap">min</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 mt-4 px-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center"><Zap size={16} className="text-accent" /></div>
              <div>
                <p className="text-[18px] font-bold text-text-primary">{todaySessions.length}</p>
                <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Sessions</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-10 bg-border/40" />
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center"><Flame size={16} className="text-success" /></div>
              <div>
                <p className="text-[18px] font-bold text-text-primary">{totalFocusMinutes}</p>
                <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Focus min</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-10 bg-border/40" />
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center"><Clock size={16} className="text-warning" /></div>
              <div>
                <p className="text-[18px] font-bold text-text-primary">{totalFocusSessions}</p>
                <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">All-time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goals sidebar toggle */}
      <button onClick={() => setShowGoals(!showGoals)}
        className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-secondary/60 border border-border/30
          text-[12px] font-bold text-text-secondary hover:text-accent cursor-pointer transition-all">
        <Target size={14} /> Goals
        {goals.length > 0 && <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] flex items-center justify-center font-bold">{goals.length}</span>}
      </button>

      {/* Goals panel */}
      <AnimatePresence>
        {showGoals && (
          <motion.div
            initial={{ width: 0, opacity: 0 }} animate={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            className="absolute top-0 right-0 z-30 md:relative h-full border-l border-border/40 bg-bg-secondary/95 md:bg-bg-secondary/30 backdrop-blur-md flex flex-col overflow-hidden shadow-2xl md:shadow-none">
            <div className="p-4 border-b border-border/20 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
                  <Target size={16} className="text-accent" /> Focus Goals
                </h3>
                <p className="text-[11px] text-text-tertiary mt-1">Set a purpose and auto-configure your timer schedule</p>
              </div>
              <button onClick={() => setShowGoals(false)} className="md:hidden p-2 rounded-lg bg-bg-hover text-text-tertiary">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* New goal form */}
            <div className="p-4 border-b border-border/20 space-y-3">
              <input value={newGoal.purpose} onChange={e => setNewGoal(p => ({ ...p, purpose: e.target.value }))}
                placeholder="Goal purpose (e.g. Learn React)"
                className="w-full px-3 py-2.5 rounded-xl bg-bg-primary border border-border/30 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary" />
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-text-tertiary uppercase">Focus (min)</span>
                  <input type="number" value={newGoal.focusMin} onChange={e => setNewGoal(p => ({ ...p, focusMin: +e.target.value }))}
                    className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-border/30 text-[12px] text-text-primary outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-text-tertiary uppercase">Break (min)</span>
                  <input type="number" value={newGoal.breakMin} onChange={e => setNewGoal(p => ({ ...p, breakMin: +e.target.value }))}
                    className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-border/30 text-[12px] text-text-primary outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-text-tertiary uppercase">Sessions/day</span>
                  <input type="number" value={newGoal.sessionsPerDay} onChange={e => setNewGoal(p => ({ ...p, sessionsPerDay: +e.target.value }))}
                    className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-border/30 text-[12px] text-text-primary outline-none" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-text-tertiary uppercase">Total days</span>
                  <input type="number" value={newGoal.totalDays} onChange={e => setNewGoal(p => ({ ...p, totalDays: +e.target.value }))}
                    className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-border/30 text-[12px] text-text-primary outline-none" />
                </label>
              </div>
              <button onClick={addGoal}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white font-bold text-[12px] cursor-pointer">
                <Plus size={14} /> Add Goal
              </button>
            </div>

            {/* Goals list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {goals.map(goal => {
                const totalSessions = goal.sessionsPerDay * goal.totalDays;
                const pct = totalSessions > 0 ? Math.round((goal.completedSessions / totalSessions) * 100) : 0;
                const isActive = activeGoalId === goal.id;
                return (
                  <div key={goal.id}
                    className={`p-3 rounded-xl border transition-all ${isActive ? "border-accent/40 bg-accent/5" : "border-border/20 bg-bg-primary"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: goal.color }} />
                        <span className="text-[13px] font-bold text-text-primary">{goal.purpose}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => activateGoal(goal)}
                          className={`w-6 h-6 flex items-center justify-center rounded-lg cursor-pointer transition-all
                            ${isActive ? "bg-accent text-white" : "bg-bg-hover text-text-tertiary hover:text-accent"}`}>
                          <Play size={10} />
                        </button>
                        <button onClick={() => deleteGoal(goal.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-text-tertiary hover:text-danger bg-bg-hover cursor-pointer">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-text-tertiary mb-2">
                      <span>{goal.focusMin}m focus</span>
                      <span>{goal.breakMin}m break</span>
                      <span>{goal.sessionsPerDay}/day</span>
                      <span>{goal.totalDays} days</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-border/20 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: goal.color }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-text-tertiary mt-1">{goal.completedSessions}/{totalSessions} sessions · {pct}%</p>
                  </div>
                );
              })}
              {goals.length === 0 && (
                <div className="text-center py-8">
                  <Target size={24} className="mx-auto mb-2 text-text-tertiary/40" />
                  <p className="text-[12px] text-text-tertiary">No goals yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
