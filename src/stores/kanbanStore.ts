import { create } from "zustand";

export interface KanbanCard {
  id: string;
  title: string;
  desc: string;
  color: string;
  dueDate?: number;
  priority?: number; // 0, 1, 2, 3
  labels?: string[];
  activity?: { id: string; text: string; timestamp: number }[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
  color: string;
}

interface KanbanState {
  boards: KanbanBoard[];
  activeBoardId: string | null;
  loadBoards: () => void;
  createBoard: (name: string, color: string) => void;
  deleteBoard: (id: string) => void;
  renameBoard: (id: string, name: string) => void;
  setActiveBoardId: (id: string | null) => void;
  addColumn: (boardId: string) => void;
  deleteColumn: (boardId: string, colId: string) => void;
  updateColumnTitle: (boardId: string, colId: string, title: string) => void;
  addCard: (boardId: string, colId: string) => void;
  deleteCard: (boardId: string, colId: string, cardId: string) => void;
  updateCard: (boardId: string, colId: string, cardId: string, updates: Partial<KanbanCard>) => void;
  moveCard: (boardId: string, card: KanbanCard, fromColId: string, toColId: string) => void;
  addActivity: (boardId: string, colId: string, cardId: string, text: string) => void;
}

const STORAGE_KEY = "delay_kanban_boards";

export const useKanbanStore = create<KanbanState>((set, get) => {
  const persist = (boards: KanbanBoard[]) => {
    set({ boards });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  };

  return {
    boards: [],
    activeBoardId: null,

    loadBoards: () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const boards = JSON.parse(raw);
          set({ boards, activeBoardId: boards[0]?.id || null });
        }
      } catch {}
    },

    createBoard: (name, color) => {
      const b: KanbanBoard = {
        id: crypto.randomUUID(),
        name,
        color,
        columns: [
          { id: crypto.randomUUID(), title: "To Do", cards: [] },
          { id: crypto.randomUUID(), title: "In Progress", cards: [] },
          { id: crypto.randomUUID(), title: "Done", cards: [] },
        ],
      };
      persist([...get().boards, b]);
      set({ activeBoardId: b.id });
    },

    deleteBoard: (id) => {
      const remaining = get().boards.filter((b) => b.id !== id);
      persist(remaining);
      if (get().activeBoardId === id) set({ activeBoardId: remaining[0]?.id || null });
    },

    renameBoard: (id, name) => {
      persist(get().boards.map((b) => (b.id === id ? { ...b, name } : b)));
    },

    setActiveBoardId: (id) => set({ activeBoardId: id }),

    addColumn: (boardId) => {
      persist(
        get().boards.map((b) =>
          b.id === boardId
            ? { ...b, columns: [...b.columns, { id: crypto.randomUUID(), title: "New Column", cards: [] }] }
            : b
        )
      );
    },

    deleteColumn: (boardId, colId) => {
      persist(
        get().boards.map((b) =>
          b.id === boardId
            ? { ...b, columns: b.columns.filter((c) => c.id !== colId) }
            : b
        )
      );
    },

    updateColumnTitle: (boardId, colId, title) => {
      persist(
        get().boards.map((b) =>
          b.id === boardId
            ? { ...b, columns: b.columns.map((c) => (c.id === colId ? { ...c, title } : c)) }
            : b
        )
      );
    },

    addCard: (boardId, colId) => {
      const COLORS = ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899"];
      const card: KanbanCard = {
        id: crypto.randomUUID(),
        title: "New Card",
        desc: "",
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        activity: [{ id: crypto.randomUUID(), text: "Created card", timestamp: Date.now() }],
      };
      persist(
        get().boards.map((b) =>
          b.id === boardId
            ? { ...b, columns: b.columns.map((c) => (c.id === colId ? { ...c, cards: [...c.cards, card] } : c)) }
            : b
        )
      );
    },

    deleteCard: (boardId, colId, cardId) => {
      persist(
        get().boards.map((b) =>
          b.id === boardId
            ? {
                ...b,
                columns: b.columns.map((c) =>
                  c.id === colId ? { ...c, cards: c.cards.filter((cd) => cd.id !== cardId) } : c
                ),
              }
            : b
        )
      );
    },

    updateCard: (boardId, colId, cardId, updates) => {
      persist(
        get().boards.map((b) =>
          b.id === boardId
            ? {
                ...b,
                columns: b.columns.map((c) =>
                  c.id === colId
                    ? { ...c, cards: c.cards.map((cd) => (cd.id === cardId ? { ...cd, ...updates } : cd)) }
                    : c
                ),
              }
            : b
        )
      );
    },

    moveCard: (boardId, card, fromColId, toColId) => {
      persist(
        get().boards.map((b) => {
          if (b.id !== boardId) return b;
          const cols = b.columns.map((c) => ({
            ...c,
            cards: c.id === fromColId ? c.cards.filter((cd) => cd.id !== card.id) : c.cards,
          }));
          return {
            ...b,
            columns: cols.map((c) =>
              c.id === toColId ? { ...c, cards: [...c.cards, card] } : c
            ),
          };
        })
      );
    },

    addActivity: (boardId, colId, cardId, text) => {
      persist(
        get().boards.map((b) =>
          b.id === boardId
            ? {
                ...b,
                columns: b.columns.map((c) =>
                  c.id === colId
                    ? {
                        ...c,
                        cards: c.cards.map((cd) =>
                          cd.id === cardId
                            ? {
                                ...cd,
                                activity: [{ id: crypto.randomUUID(), text, timestamp: Date.now() }, ...(cd.activity || [])],
                              }
                            : cd
                        ),
                      }
                    : c
                ),
              }
            : b
        )
      );
    },
  };
});
