import { create } from "zustand";
import { db, generateId, now } from "@/lib/database";
import type { Note } from "@/types/note";
import { enqueueSync } from "@/lib/sync";

interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  openNoteIds: string[];
  searchQuery: string;
  loading: boolean;
  loadNotes: () => Promise<void>;
  createNote: () => Promise<string>;
  updateNote: (
    id: string,
    data: Partial<Pick<Note, "title" | "content" | "content_text" | "color" | "pinned" | "is_public" | "public_slug">>
  ) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;
  addOpenNote: (id: string) => void;
  removeOpenNote: (id: string) => void;
  setSearchQuery: (query: string) => void;
  searchNotes: (query: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  openNoteIds: [],
  searchQuery: "",
  loading: true,

  loadNotes: async () => {
    try {
      const notes = await db.notes
        .where("deleted_at")
        .equals(0)
        .reverse()
        .sortBy("updated_at");
      // Sort pinned first
      notes.sort((a, b) => b.pinned - a.pinned);
      set({ notes, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createNote: async () => {
    const id = generateId();
    const timestamp = now();
    const note: Note = {
      id,
      title: "",
      content: "",
      content_text: "",
      color: null,
      pinned: 0,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: 0,
    };

    set((state) => ({
      notes: [note, ...state.notes],
      activeNoteId: id,
      openNoteIds: [...new Set([...state.openNoteIds, id])],
    }));

    try {
      await db.notes.add(note);
      enqueueSync("notes", id, "upsert", note);
      import("./gamificationStore").then(m => {
        m.useGamificationStore.getState().addXP(5, "Note created");
      });
    } catch {
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        activeNoteId: null,
      }));
    }

    return id;
  },

  updateNote: async (id, data) => {
    const timestamp = now();
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, ...data, updated_at: timestamp } : n
      ),
    }));

    try {
      await db.notes.update(id, { ...data, updated_at: timestamp });
      const note = get().notes.find((n) => n.id === id);
      if (note) enqueueSync("notes", id, "upsert", { ...note, ...data, updated_at: timestamp });
    } catch {
      // silent
    }
  },

  deleteNote: async (id) => {
    set((state) => {
      const remainingOpen = state.openNoteIds.filter((nid) => nid !== id);
      const newActive = state.activeNoteId === id
        ? remainingOpen[remainingOpen.length - 1] || null
        : state.activeNoteId;

      return {
        notes: state.notes.filter((n) => n.id !== id),
        activeNoteId: newActive,
        openNoteIds: remainingOpen,
      };
    });

    try {
      const deletedAt = now();
      await db.notes.update(id, { deleted_at: deletedAt });
      const note = get().notes.find((n) => n.id === id);
      if (note) enqueueSync("notes", id, "upsert", { ...note, deleted_at: deletedAt });
    } catch {
      // silent
    }
  },

  setActiveNote: (id) => {
    set((state) => ({
      activeNoteId: id,
      openNoteIds: id && !state.openNoteIds.includes(id) 
        ? [...state.openNoteIds, id] 
        : state.openNoteIds,
    }));
  },

  addOpenNote: (id) => {
    set((state) => ({
      openNoteIds: state.openNoteIds.includes(id) 
        ? state.openNoteIds 
        : [...state.openNoteIds, id],
    }));
  },

  removeOpenNote: (id) => {
    set((state) => {
      const remaining = state.openNoteIds.filter((nid) => nid !== id);
      return {
        openNoteIds: remaining,
        activeNoteId: state.activeNoteId === id 
          ? remaining[remaining.length - 1] || null 
          : state.activeNoteId,
      };
    });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    if (query.trim()) {
      get().searchNotes(query);
    } else {
      get().loadNotes();
    }
  },

  searchNotes: async (query) => {
    try {
      const all = await db.notes.where("deleted_at").equals(0).toArray();
      const q = query.toLowerCase();
      const filtered = all.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.content_text || "").toLowerCase().includes(q)
      );
      filtered.sort((a, b) => b.pinned - a.pinned || b.updated_at - a.updated_at);
      set({ notes: filtered });
    } catch {
      // silent
    }
  },
}));
