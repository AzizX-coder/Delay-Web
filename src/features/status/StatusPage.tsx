import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/database";
import { motion } from "motion/react";
import {
  BarChart3, TrendingUp, Clock, CheckCircle2, StickyNote,
  Calendar, Flame, Sparkles, Activity, Target, Zap, FileText, Loader2,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useSettingsStore } from "@/stores/settingsStore";
import { callOpenRouter } from "@/lib/openrouter";

interface DayStat {
  date: string;      // YYYY-MM-DD
  focusMin: number;
  tasksCompleted: number;
  notesCreated: number;
  eventsCreated: number;
}

export function StatusPage() {
  const [stats, setStats] = useState<DayStat[]>([]);
  const [totalNotes, setTotalNotes] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalFocusMin, setTotalFocusMin] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "all">("7d");
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const { profile, updateProfile } = useProfile();
  const { api_key_openrouter: openrouter_api_key } = useSettingsStore();

  useEffect(() => {
    loadStats();
  }, []);

  // Load cached insight or generate on Mondays
  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().slice(0, 10);
    const isMonday = new Date().getDay() === 1;
    if (profile.weekly_insight && profile.weekly_insight_date === today) {
      setInsight(profile.weekly_insight);
      return;
    }
    if (isMonday && openrouter_api_key && !insightLoading) {
      generateInsight();
    } else if (profile.weekly_insight) {
      setInsight(profile.weekly_insight);
    }
  }, [profile?.id]);

  const generateInsight = async () => {
    if (!openrouter_api_key) return;
    setInsightLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const prompt = `You are an AI productivity coach. Based on these weekly stats, give a 2-sentence motivating insight:\n- ${totalFocusMin} focus minutes\n- ${completedTasks} tasks completed\n- ${totalNotes} notes created\n- ${streak} day streak\nBe specific, positive, and actionable. Max 50 words.`;
      const text = await callOpenRouter([{ role: "user", content: prompt }], openrouter_api_key);
      setInsight(text);
      updateProfile?.({ weekly_insight: text, weekly_insight_date: today });
    } catch {}
    setInsightLoading(false);
  };

  const loadStats = async () => {
    try {
      const [notes, tasks, events, sessions] = await Promise.all([
        db.notes.toArray(),
        db.tasks.toArray(),
        db.events.toArray(),
        db.timerSessions.toArray(),
      ]);

      setTotalNotes(notes.filter(n => !n.deleted_at).length);
      setTotalTasks(tasks.filter(t => !t.deleted_at).length);
      setCompletedTasks(tasks.filter(t => t.completed && !t.deleted_at).length);
      setTotalEvents(events.filter(e => !e.deleted_at).length);

      const focusSessions = sessions.filter(s => s.type === "focus" && s.completed);
      setTotalSessions(focusSessions.length);
      setTotalFocusMin(focusSessions.reduce((a, s) => a + Math.round(s.duration / 60), 0));

      // Build daily stats for last 30 days
      const dayMap: Record<string, DayStat> = {};
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { date: key, focusMin: 0, tasksCompleted: 0, notesCreated: 0, eventsCreated: 0 };
      }

      for (const s of focusSessions) {
        const key = new Date(s.started_at * 1000).toISOString().slice(0, 10);
        if (dayMap[key]) dayMap[key].focusMin += Math.round(s.duration / 60);
      }
      for (const t of tasks.filter(t => t.completed && !t.deleted_at)) {
        const key = new Date((t.updated_at || t.created_at) * 1000).toISOString().slice(0, 10);
        if (dayMap[key]) dayMap[key].tasksCompleted += 1;
      }
      for (const n of notes.filter(n => !n.deleted_at)) {
        const key = new Date(n.created_at * 1000).toISOString().slice(0, 10);
        if (dayMap[key]) dayMap[key].notesCreated += 1;
      }
      for (const e of events.filter(e => !e.deleted_at)) {
        const key = new Date(e.created_at * 1000).toISOString().slice(0, 10);
        if (dayMap[key]) dayMap[key].eventsCreated += 1;
      }

      const sortedStats = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
      setStats(sortedStats);

      // Calculate streak
      let currentStreak = 0;
      for (let i = sortedStats.length - 1; i >= 0; i--) {
        const d = sortedStats[i];
        if (d.focusMin > 0 || d.tasksCompleted > 0 || d.notesCreated > 0) {
          currentStreak++;
        } else if (i < sortedStats.length - 1) {
          break;
        }
      }
      setStreak(currentStreak);
    } catch {}
    setLoading(false);
  };

  const displayStats = useMemo(() => {
    if (range === "7d") return stats.slice(-7);
    if (range === "30d") return stats;
    return stats;
  }, [stats, range]);

  const maxFocus = Math.max(1, ...displayStats.map(d => d.focusMin));
  const maxTasks = Math.max(1, ...displayStats.map(d => d.tasksCompleted));

  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary text-[13px]">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <BarChart3 size={20} className="text-accent" />
            </div>
            <div>
              <h1 className="text-[22px] md:text-[28px] font-bold text-text-primary">Status</h1>
              <p className="text-[12px] text-text-tertiary">Your productivity at a glance</p>
            </div>
          </div>
        </motion.div>

        {/* AI Weekly Insight */}
        {(insight || insightLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-accent/8 to-accent/4 border border-accent/20 flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
              {insightLoading ? <Loader2 size={15} className="text-accent animate-spin" /> : <Sparkles size={15} className="text-accent" />}
            </div>
            <div>
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">AI Weekly Insight</p>
              {insightLoading ? (
                <p className="text-[13px] text-text-tertiary">Generating your weekly insight...</p>
              ) : (
                <p className="text-[13px] text-text-secondary leading-relaxed">{insight}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <KpiCard icon={<Flame size={18} />} label="Focus Time" value={`${totalFocusMin}m`} accent="#EF4444" sub={`${totalSessions} sessions`} />
          <KpiCard icon={<CheckCircle2 size={18} />} label="Tasks Done" value={String(completedTasks)} accent="#10B981" sub={`${taskCompletionRate}% rate`} />
          <KpiCard icon={<StickyNote size={18} />} label="Documents" value={String(totalNotes)} accent="#6366F1" sub="notes created" />
          <KpiCard icon={<Calendar size={18} />} label="Events" value={String(totalEvents)} accent="#F59E0B" sub="scheduled" />
        </div>

        {/* Streak & Activity Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl bg-bg-secondary/40 border border-border/20">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={20} className="text-warning" />
              <span className="text-[14px] font-bold text-text-primary">Current Streak</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-[48px] md:text-[56px] font-black text-text-primary leading-none">{streak}</span>
              <span className="text-[14px] font-medium text-text-tertiary mb-2">day{streak !== 1 ? "s" : ""}</span>
            </div>
            <p className="text-[11px] text-text-tertiary mt-2">Days in a row with at least one completed action</p>
          </motion.div>

          {/* Task Completion Ring */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="p-5 rounded-2xl bg-bg-secondary/40 border border-border/20">
            <div className="flex items-center gap-3 mb-4">
              <Target size={20} className="text-success" />
              <span className="text-[14px] font-bold text-text-primary">Completion Rate</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-border/30" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#10B981" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - taskCompletionRate / 100)}`}
                    style={{ transition: "stroke-dashoffset 1s ease" }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[20px] font-black text-text-primary">{taskCompletionRate}%</span>
                </div>
              </div>
              <div>
                <p className="text-[13px] text-text-secondary"><span className="font-bold text-success">{completedTasks}</span> of <span className="font-bold">{totalTasks}</span> tasks</p>
                <p className="text-[11px] text-text-tertiary mt-1">across all lists</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Chart Range Selector */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-text-primary flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" /> Activity
          </h2>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-secondary/60 border border-border/20">
            {(["7d", "30d"] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${range === r ? "bg-accent text-white" : "text-text-tertiary hover:text-text-secondary"}`}>
                {r === "7d" ? "Week" : "Month"}
              </button>
            ))}
          </div>
        </div>

        {/* Focus Time Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl bg-bg-secondary/40 border border-border/20 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-danger" />
            <span className="text-[13px] font-bold text-text-primary">Focus Minutes</span>
          </div>
          <div className="flex items-end gap-[3px] h-[120px] md:h-[160px]">
            {displayStats.map((d, i) => {
              const h = maxFocus > 0 ? (d.focusMin / maxFocus) * 100 : 0;
              const dayLabel = new Date(d.date + "T00:00:00").toLocaleDateString([], { weekday: "narrow" });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="relative w-full flex justify-center">
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-6 px-2 py-1 rounded-md bg-bg-elevated border border-border/40 text-[10px] font-bold text-text-primary whitespace-nowrap z-10 shadow-lg">
                      {d.focusMin}m
                    </div>
                  </div>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(h, 2)}%` }}
                    transition={{ delay: i * 0.03, duration: 0.4 }}
                    className="w-full rounded-t-md min-h-[3px]"
                    style={{ background: d.focusMin > 0 ? `linear-gradient(to top, #EF4444, #F59E0B)` : "rgba(255,255,255,0.05)" }}
                  />
                  <span className="text-[8px] text-text-tertiary mt-1 font-medium">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Tasks Completed Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="p-5 rounded-2xl bg-bg-secondary/40 border border-border/20 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={14} className="text-success" />
            <span className="text-[13px] font-bold text-text-primary">Tasks Completed</span>
          </div>
          <div className="flex items-end gap-[3px] h-[120px] md:h-[160px]">
            {displayStats.map((d, i) => {
              const h = maxTasks > 0 ? (d.tasksCompleted / maxTasks) * 100 : 0;
              const dayLabel = new Date(d.date + "T00:00:00").toLocaleDateString([], { weekday: "narrow" });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="relative w-full flex justify-center">
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-6 px-2 py-1 rounded-md bg-bg-elevated border border-border/40 text-[10px] font-bold text-text-primary whitespace-nowrap z-10 shadow-lg">
                      {d.tasksCompleted}
                    </div>
                  </div>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(h, 2)}%` }}
                    transition={{ delay: i * 0.03, duration: 0.4 }}
                    className="w-full rounded-t-md min-h-[3px]"
                    style={{ background: d.tasksCompleted > 0 ? `linear-gradient(to top, #10B981, #06B6D4)` : "rgba(255,255,255,0.05)" }}
                  />
                  <span className="text-[8px] text-text-tertiary mt-1 font-medium">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Activity Heatmap */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="p-5 rounded-2xl bg-bg-secondary/40 border border-border/20 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-accent" />
            <span className="text-[13px] font-bold text-text-primary">Activity Heatmap</span>
            <span className="text-[10px] text-text-tertiary ml-auto">Less → More</span>
          </div>
          <div className="flex flex-wrap gap-[3px]">
            {stats.map(d => {
              const total = d.focusMin + d.tasksCompleted * 10 + d.notesCreated * 5 + d.eventsCreated * 3;
              const intensity = Math.min(total / 60, 1);
              return (
                <div key={d.date} title={`${d.date}: ${d.focusMin}m focus, ${d.tasksCompleted} tasks, ${d.notesCreated} notes`}
                  className="w-[14px] h-[14px] md:w-[18px] md:h-[18px] rounded-[3px] transition-all hover:scale-125"
                  style={{
                    background: total === 0
                      ? "rgba(255,255,255,0.04)"
                      : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`
                  }} />
              );
            })}
          </div>
        </motion.div>

        {/* Module breakdown */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="p-5 rounded-2xl bg-bg-secondary/40 border border-border/20">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} className="text-accent" />
            <span className="text-[13px] font-bold text-text-primary">Data Overview</span>
          </div>
          <div className="space-y-3">
            <BarRow label="Documents" value={totalNotes} max={Math.max(totalNotes, totalTasks, totalEvents, totalSessions)} color="#6366F1" />
            <BarRow label="Tasks Created" value={totalTasks} max={Math.max(totalNotes, totalTasks, totalEvents, totalSessions)} color="#10B981" />
            <BarRow label="Events" value={totalEvents} max={Math.max(totalNotes, totalTasks, totalEvents, totalSessions)} color="#F59E0B" />
            <BarRow label="Focus Sessions" value={totalSessions} max={Math.max(totalNotes, totalTasks, totalEvents, totalSessions)} color="#EF4444" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, accent, sub }: { icon: React.ReactNode; label: string; value: string; accent: string; sub: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-2xl bg-bg-secondary/40 border border-border/20 hover:border-border/40 transition-all">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: accent + "15", color: accent }}>
          {icon}
        </div>
        <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[28px] md:text-[32px] font-black text-text-primary leading-none">{value}</p>
      <p className="text-[10px] text-text-tertiary mt-1">{sub}</p>
    </motion.div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-medium text-text-secondary w-[110px] shrink-0">{label}</span>
      <div className="flex-1 h-[8px] rounded-full bg-border/10 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
      <span className="text-[12px] font-bold text-text-primary tabular-nums w-[40px] text-right">{value}</span>
    </div>
  );
}
