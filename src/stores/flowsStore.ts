import { create } from "zustand";

/**
 * Flows v2 — a Flow is a *project hub*. Instead of holding its own
 * throw-away checklist items (the old "blocks" model nobody used), a Flow
 * now LINKS to your real tasks and real notes, and keeps a small set of
 * flow-native milestones. The detail view reads tasksStore / notesStore
 * live, so toggling a task in a Flow toggles the actual task everywhere.
 */

export interface FlowStep {
  id: string;
  text: string;
  done: boolean;
}

export interface Flow {
  id: string;
  title: string;
  description: string;
  color: string;          // accent hex
  emoji?: string;
  linkedTaskIds: string[]; // real task ids (tasksStore)
  linkedNoteIds: string[]; // real note ids (notesStore)
  steps: FlowStep[];       // flow-native milestones
  pinned: boolean;
  created_at: number;
  updated_at: number;
}

interface FlowsState {
  flows: Flow[];
  loading: boolean;
  loadFlows: () => void;
  createFlow: (title: string) => string;
  updateFlow: (id: string, patch: Partial<Flow>) => void;
  removeFlow: (id: string) => void;
  togglePin: (id: string) => void;

  linkTask: (flowId: string, taskId: string) => void;
  unlinkTask: (flowId: string, taskId: string) => void;
  linkNote: (flowId: string, noteId: string) => void;
  unlinkNote: (flowId: string, noteId: string) => void;

  addStep: (flowId: string, text: string) => void;
  toggleStep: (flowId: string, stepId: string) => void;
  updateStep: (flowId: string, stepId: string, text: string) => void;
  removeStep: (flowId: string, stepId: string) => void;
}

const KEY = "delay_flows";
const COLORS = ["#6366F1", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];
const uid = () => crypto.randomUUID();
const now = () => Date.now();
const persist = (flows: Flow[]) => { try { localStorage.setItem(KEY, JSON.stringify(flows)); } catch {} };

// Migrate the old block-based model -> v2 linked model. Old flows stored
// `blocks: [{ type, items: [{ text, done }] }]`. Nothing is thrown away:
// every old item is flattened into `steps`, and the link arrays start empty.
function migrate(raw: any): Flow {
  if (Array.isArray(raw?.linkedTaskIds)) return raw as Flow; // already v2
  const steps: FlowStep[] = [];
  if (Array.isArray(raw?.blocks)) {
    for (const b of raw.blocks) {
      for (const it of b?.items ?? []) {
        steps.push({ id: it?.id ?? uid(), text: it?.text ?? "", done: !!it?.done });
      }
    }
  }
  return {
    id: raw?.id ?? uid(),
    title: raw?.title ?? "Untitled flow",
    description: raw?.description ?? "",
    color: raw?.color ?? COLORS[0],
    emoji: raw?.emoji,
    linkedTaskIds: [],
    linkedNoteIds: [],
    steps,
    pinned: !!raw?.pinned,
    created_at: raw?.created_at ?? now(),
    updated_at: raw?.updated_at ?? now(),
  };
}

const mapFlow = (flows: Flow[], id: string, fn: (f: Flow) => Flow) =>
  flows.map(f => (f.id === id ? { ...fn(f), updated_at: now() } : f));

export const useFlowsStore = create<FlowsState>((set, get) => ({
  flows: [],
  loading: true,

  loadFlows: () => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const flows = Array.isArray(parsed) ? parsed.map(migrate) : [];
      set({ flows, loading: false });
      persist(flows); // write the migrated shape back
    } catch {
      set({ loading: false });
    }
  },

  createFlow: (title) => {
    const flow: Flow = {
      id: uid(),
      title: title.trim() || "Untitled flow",
      description: "",
      color: COLORS[get().flows.length % COLORS.length],
      linkedTaskIds: [],
      linkedNoteIds: [],
      steps: [],
      pinned: false,
      created_at: now(),
      updated_at: now(),
    };
    const next = [flow, ...get().flows];
    set({ flows: next });
    persist(next);
    return flow.id;
  },

  updateFlow: (id, patch) => {
    const next = mapFlow(get().flows, id, f => ({ ...f, ...patch }));
    set({ flows: next }); persist(next);
  },

  removeFlow: (id) => {
    const next = get().flows.filter(f => f.id !== id);
    set({ flows: next }); persist(next);
  },

  togglePin: (id) => {
    const next = mapFlow(get().flows, id, f => ({ ...f, pinned: !f.pinned }));
    set({ flows: next }); persist(next);
  },

  linkTask: (flowId, taskId) => {
    const next = mapFlow(get().flows, flowId, f =>
      f.linkedTaskIds.includes(taskId) ? f : { ...f, linkedTaskIds: [...f.linkedTaskIds, taskId] });
    set({ flows: next }); persist(next);
  },
  unlinkTask: (flowId, taskId) => {
    const next = mapFlow(get().flows, flowId, f =>
      ({ ...f, linkedTaskIds: f.linkedTaskIds.filter(t => t !== taskId) }));
    set({ flows: next }); persist(next);
  },

  linkNote: (flowId, noteId) => {
    const next = mapFlow(get().flows, flowId, f =>
      f.linkedNoteIds.includes(noteId) ? f : { ...f, linkedNoteIds: [...f.linkedNoteIds, noteId] });
    set({ flows: next }); persist(next);
  },
  unlinkNote: (flowId, noteId) => {
    const next = mapFlow(get().flows, flowId, f =>
      ({ ...f, linkedNoteIds: f.linkedNoteIds.filter(n => n !== noteId) }));
    set({ flows: next }); persist(next);
  },

  addStep: (flowId, text) => {
    const t = text.trim(); if (!t) return;
    const step: FlowStep = { id: uid(), text: t, done: false };
    const next = mapFlow(get().flows, flowId, f => ({ ...f, steps: [...f.steps, step] }));
    set({ flows: next }); persist(next);
  },
  toggleStep: (flowId, stepId) => {
    const next = mapFlow(get().flows, flowId, f =>
      ({ ...f, steps: f.steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s) }));
    set({ flows: next }); persist(next);
  },
  updateStep: (flowId, stepId, text) => {
    const next = mapFlow(get().flows, flowId, f =>
      ({ ...f, steps: f.steps.map(s => s.id === stepId ? { ...s, text } : s) }));
    set({ flows: next }); persist(next);
  },
  removeStep: (flowId, stepId) => {
    const next = mapFlow(get().flows, flowId, f =>
      ({ ...f, steps: f.steps.filter(s => s.id !== stepId) }));
    set({ flows: next }); persist(next);
  },
}));

export const FLOW_COLORS = COLORS;
