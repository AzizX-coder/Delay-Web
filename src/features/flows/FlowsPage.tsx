import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pin, PinOff, Trash2, ArrowLeft, GitBranch, Check, Search, X,
  ListTodo, FileText, Flag, CalendarClock,
} from "lucide-react";
import { useFlowsStore, FLOW_COLORS, type Flow } from "@/stores/flowsStore";
import { useTasksStore } from "@/stores/tasksStore";
import { useNotesStore } from "@/stores/notesStore";
import { EmptyState } from "@/shared/components/EmptyState";

export function FlowsPage() {
  const { flows, loading, loadFlows, createFlow, updateFlow, removeFlow, togglePin } = useFlowsStore();
  const { tasks, loadTasks } = useTasksStore();
  const { notes, loadNotes } = useNotesStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { loadFlows(); loadTasks(); loadNotes(); }, []);

  const sorted = useMemo(() => {
    const f = search
      ? flows.filter(f => f.title.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase()))
      : flows;
    return [...f].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at - a.updated_at);
  }, [flows, search]);

  const selected = flows.find(f => f.id === selectedId);

  const handleCreate = () => setSelectedId(createFlow("Untitled flow"));

  // Live progress for a flow = (done linked tasks + done milestones) / total
  const flowProgress = (f: Flow) => {
    const linkedTasks = tasks.filter(t => f.linkedTaskIds.includes(t.id) && !t.deleted_at);
    const total = linkedTasks.length + f.steps.length;
    const done = linkedTasks.filter(t => t.completed).length + f.steps.filter(s => s.done).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0,
             items: linkedTasks.length + f.linkedNoteIds.length + f.steps.length };
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-bg-primary">
      {/* ── List ── */}
      <aside className={`md:w-[320px] md:border-r border-border/30 flex flex-col ${selected ? "hidden md:flex" : "flex"} h-full`}>
        <header className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/12 ring-1 ring-accent/25 flex items-center justify-center">
              <GitBranch size={17} className="text-accent" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-text-primary leading-tight">Flows</h1>
              <p className="text-[10px] text-text-tertiary">{flows.length} project{flows.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <button onClick={handleCreate}
            className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer">
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </header>

        <div className="px-3 py-2 border-b border-border/20">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border/20">
            <Search size={13} className="text-text-tertiary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flows..."
              className="bg-transparent outline-none text-[12px] text-text-primary flex-1 placeholder:text-text-tertiary" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {loading ? (
            <p className="text-[12px] text-text-tertiary text-center py-8">Loading...</p>
          ) : sorted.length === 0 ? (
            <div className="py-12">
              <EmptyState type="flows"
                title={search ? "No matches" : "No flows yet"}
                description={search ? "Try another keyword." : "A flow is a project — link your real tasks and notes, track milestones, see progress."} />
            </div>
          ) : (
            sorted.map(f => {
              const p = flowProgress(f);
              return (
                <button key={f.id} onClick={() => setSelectedId(f.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2.5
                    ${selectedId === f.id ? "bg-accent/10 ring-1 ring-accent/20" : "hover:bg-bg-hover"}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[14px]"
                    style={{ background: `${f.color}1f`, border: `1px solid ${f.color}40` }}>
                    {f.emoji || "✦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-bold truncate ${selectedId === f.id ? "text-accent" : "text-text-primary"}`}>{f.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-border/30 overflow-hidden max-w-[90px]">
                        <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: f.color }} />
                      </div>
                      <span className="text-[9.5px] text-text-tertiary tabular-nums">{p.items} item{p.items === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  {f.pinned && <Pin size={11} className="text-accent shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Detail ── */}
      <main className={`flex-1 ${selected ? "flex" : "hidden md:flex"} flex-col overflow-hidden`}>
        {selected ? (
          <FlowDetail key={selected.id} flow={selected} onBack={() => setSelectedId(null)}
            onUpdate={(p) => updateFlow(selected.id, p)}
            onDelete={() => { removeFlow(selected.id); setSelectedId(null); }}
            onTogglePin={() => togglePin(selected.id)} />
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <EmptyState type="flows"
              title="Pick or create a flow"
              description="A flow pulls your real tasks, notes and milestones for one project into a single view." />
          </div>
        )}
      </main>
    </div>
  );
}

function FlowDetail({ flow, onBack, onUpdate, onDelete, onTogglePin }: {
  flow: Flow;
  onBack: () => void;
  onUpdate: (patch: Partial<Flow>) => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const navigate = useNavigate();
  const { linkTask, unlinkTask, linkNote, unlinkNote, addStep, toggleStep, updateStep, removeStep } = useFlowsStore();
  const { tasks, toggleTask, createTask } = useTasksStore();
  const { notes, createNote, setActiveNote } = useNotesStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picker, setPicker] = useState<"task" | "note" | null>(null);

  const linkedTasks = useMemo(
    () => flow.linkedTaskIds.map(id => tasks.find(t => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t && !t.deleted_at),
    [flow.linkedTaskIds, tasks]
  );
  const linkedNotes = useMemo(
    () => flow.linkedNoteIds.map(id => notes.find(n => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n && !n.deleted_at),
    [flow.linkedNoteIds, notes]
  );

  const total = linkedTasks.length + flow.steps.length;
  const done = linkedTasks.filter(t => t.completed).length + flow.steps.filter(s => s.done).length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const openNote = (id: string) => { setActiveNote(id); navigate("/notes"); };

  const handleNewTask = async () => {
    const id = await createTask("New task");
    linkTask(flow.id, id);
  };
  const handleNewNote = async () => {
    const id = await createNote();
    linkNote(flow.id, id);
    openNote(id);
  };

  return (
    <>
      {/* Header */}
      <header className="px-4 md:px-8 py-4 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={onBack} className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bg-hover text-text-secondary cursor-pointer">
            <ArrowLeft size={16} />
          </button>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-[20px]"
            style={{ background: `${flow.color}26`, border: `1px solid ${flow.color}40` }}>
            {flow.emoji || "✦"}
          </div>
          <input
            value={flow.title}
            onChange={e => onUpdate({ title: e.target.value })}
            className="flex-1 bg-transparent outline-none text-[20px] md:text-[22px] font-extrabold text-text-primary tracking-tight"
          />
          <button onClick={onTogglePin} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bg-hover text-text-secondary cursor-pointer" title={flow.pinned ? "Unpin" : "Pin"}>
            {flow.pinned ? <PinOff size={15} /> : <Pin size={15} />}
          </button>
          <button onClick={() => setConfirmDelete(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-danger/10 text-text-secondary hover:text-danger cursor-pointer" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>

        <textarea
          value={flow.description}
          onChange={e => onUpdate({ description: e.target.value })}
          placeholder="What's this project about?"
          rows={1}
          className="w-full bg-transparent outline-none text-[13px] text-text-secondary placeholder:text-text-tertiary resize-none mb-3"
        />

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            {FLOW_COLORS.map(c => (
              <button key={c} onClick={() => onUpdate({ color: c })}
                className={`w-5 h-5 rounded-full transition-all ${flow.color === c ? "ring-2 ring-offset-2 ring-offset-bg-primary ring-text-primary scale-110" : "hover:scale-110"}`}
                style={{ background: c }} aria-label={`Color ${c}`} />
            ))}
          </div>
          {total > 0 && (
            <div className="ml-auto flex items-center gap-2 text-[11px] font-bold">
              <div className="w-32 h-1.5 rounded-full bg-border/30 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: flow.color }} />
              </div>
              <span style={{ color: flow.color }}>{progress}%</span>
              <span className="text-text-tertiary">· {done}/{total} done</span>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
        {/* ── Tasks ── */}
        <Section icon={<ListTodo size={14} />} title="Tasks" count={linkedTasks.length} color={flow.color}
          onLink={() => setPicker("task")} onNew={handleNewTask} newLabel="New task">
          {linkedTasks.length === 0 ? (
            <EmptyRow text="No tasks linked. Create one or link existing tasks." />
          ) : (
            linkedTasks.map(t => (
              <div key={t.id} className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-hover/60 transition-colors">
                <button onClick={() => toggleTask(t.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${t.completed ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
                  {!!t.completed && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>
                <span className={`flex-1 text-[12.5px] truncate ${t.completed ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                  {t.title || "Untitled task"}
                </span>
                {t.due_date ? (
                  <span className="flex items-center gap-1 text-[10px] text-text-tertiary shrink-0">
                    <CalendarClock size={10} />
                    {new Date(t.due_date * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                ) : null}
                <button onClick={() => unlinkTask(flow.id, t.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger shrink-0" title="Unlink">
                  <X size={13} />
                </button>
              </div>
            ))
          )}
        </Section>

        {/* ── Notes ── */}
        <Section icon={<FileText size={14} />} title="Notes" count={linkedNotes.length} color={flow.color}
          onLink={() => setPicker("note")} onNew={handleNewNote} newLabel="New note">
          {linkedNotes.length === 0 ? (
            <EmptyRow text="No notes linked. Create one or link existing notes." />
          ) : (
            linkedNotes.map(n => (
              <div key={n.id} className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-hover/60 transition-colors">
                <button onClick={() => openNote(n.id)} className="flex-1 min-w-0 text-left cursor-pointer">
                  <p className="text-[12.5px] font-medium text-text-primary truncate">{n.title || "Untitled note"}</p>
                  {n.content_text ? (
                    <p className="text-[10.5px] text-text-tertiary truncate">{n.content_text.slice(0, 80)}</p>
                  ) : null}
                </button>
                <button onClick={() => unlinkNote(flow.id, n.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger shrink-0" title="Unlink">
                  <X size={13} />
                </button>
              </div>
            ))
          )}
        </Section>

        {/* ── Milestones ── */}
        <Section icon={<Flag size={14} />} title="Milestones" count={flow.steps.length} color={flow.color}>
          {flow.steps.map((s, idx) => (
            <div key={s.id} className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-hover/60 transition-colors">
              <button onClick={() => toggleStep(flow.id, s.id)}
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${s.done ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
                {s.done && <Check size={9} className="text-white" strokeWidth={3} />}
              </button>
              <span className="w-4 text-[10px] font-bold tabular-nums text-text-tertiary text-center shrink-0">{idx + 1}</span>
              <input value={s.text} onChange={e => updateStep(flow.id, s.id, e.target.value)}
                className={`flex-1 bg-transparent outline-none text-[12.5px] ${s.done ? "line-through text-text-tertiary" : "text-text-primary"}`} />
              <button onClick={() => removeStep(flow.id, s.id)}
                className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger shrink-0" title="Remove">
                <X size={13} />
              </button>
            </div>
          ))}
          <StepInput onAdd={(t) => addStep(flow.id, t)} />
        </Section>
      </div>

      {/* Link picker */}
      <AnimatePresence>
        {picker === "task" && (
          <LinkPicker title="Link tasks" emptyText="All your tasks are already linked."
            options={tasks.filter(t => !t.deleted_at && !flow.linkedTaskIds.includes(t.id))
              .map(t => ({ id: t.id, label: t.title || "Untitled task", sub: t.completed ? "Completed" : undefined }))}
            onPick={(id) => linkTask(flow.id, id)} onClose={() => setPicker(null)} />
        )}
        {picker === "note" && (
          <LinkPicker title="Link notes" emptyText="All your notes are already linked."
            options={notes.filter(n => !n.deleted_at && !flow.linkedNoteIds.includes(n.id))
              .map(n => ({ id: n.id, label: n.title || "Untitled note", sub: n.content_text?.slice(0, 50) }))}
            onPick={(id) => linkNote(flow.id, id)} onClose={() => setPicker(null)} />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="fixed z-[101] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2
                w-[min(360px,calc(100vw-32px))] p-5 rounded-2xl bg-bg-elevated border border-border/40 shadow-2xl">
              <p className="text-[14px] font-bold text-text-primary">Delete this flow?</p>
              <p className="text-[12px] text-text-tertiary mt-1">The flow is removed. Your linked tasks and notes are <strong>not</strong> deleted — only the project view.</p>
              <div className="flex items-center justify-end gap-2 mt-4">
                <button onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-text-secondary hover:bg-bg-hover cursor-pointer">Cancel</button>
                <button onClick={() => { setConfirmDelete(false); onDelete(); }}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-danger hover:opacity-90 cursor-pointer">Delete flow</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Section shell ── */
function Section({ icon, title, count, color, onLink, onNew, newLabel, children }: {
  icon: React.ReactNode; title: string; count: number; color: string;
  onLink?: () => void; onNew?: () => void; newLabel?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-bg-secondary/50 border border-border/30 overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}1f`, color }}>{icon}</div>
        <span className="text-[13px] font-bold text-text-primary flex-1">{title}</span>
        <span className="text-[10px] text-text-tertiary tabular-nums">{count}</span>
        {onLink && (
          <button onClick={onLink}
            className="px-2 py-1 rounded-lg text-[11px] font-bold text-text-secondary hover:bg-bg-hover cursor-pointer transition-colors">
            Link existing
          </button>
        )}
        {onNew && (
          <button onClick={onNew}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-accent hover:bg-accent/10 cursor-pointer transition-colors">
            <Plus size={12} /> {newLabel}
          </button>
        )}
      </header>
      <div className="px-3 py-2 space-y-0.5">{children}</div>
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-[12px] text-text-tertiary text-center py-3">{text}</p>;
}

function StepInput({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <Plus size={13} className="text-text-tertiary shrink-0" />
      <input value={v} onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && v.trim()) { onAdd(v); setV(""); } }}
        placeholder="Add a milestone..."
        className="flex-1 bg-transparent outline-none text-[12.5px] text-text-primary placeholder:text-text-tertiary" />
    </div>
  );
}

/* ── Link picker modal ── */
function LinkPicker({ title, options, emptyText, onPick, onClose }: {
  title: string;
  options: { id: string; label: string; sub?: string }[];
  emptyText: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 14 }}
        className="fixed z-[101] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2
          w-[min(420px,calc(100vw-24px))] max-h-[min(520px,calc(100vh-100px))] flex flex-col
          bg-bg-elevated border border-border/40 rounded-2xl shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <p className="text-[14px] font-bold text-text-primary">{title}</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-bg-hover cursor-pointer">
            <X size={15} />
          </button>
        </header>
        <div className="px-3 py-2 border-b border-border/20">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border/20">
            <Search size={13} className="text-text-tertiary" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search..."
              className="bg-transparent outline-none text-[12px] text-text-primary flex-1 placeholder:text-text-tertiary" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-[12px] text-text-tertiary text-center py-8">{q ? "No matches." : emptyText}</p>
          ) : (
            filtered.map(o => (
              <button key={o.id} onClick={() => { onPick(o.id); onClose(); }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-bg-hover transition-colors cursor-pointer">
                <p className="text-[12.5px] font-medium text-text-primary truncate">{o.label}</p>
                {o.sub ? <p className="text-[10.5px] text-text-tertiary truncate">{o.sub}</p> : null}
              </button>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}
