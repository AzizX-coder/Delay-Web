import { create } from "zustand";

export type ToolType = "select" | "pen" | "sticky" | "rect" | "circle" | "diamond" | "line" | "text" | "arrow" | "connector";
export type BgMode = "blank" | "dots" | "grid";
export type DashStyle = "solid" | "dashed" | "dotted";

export interface WBObject {
  id: string;
  type: ToolType | "path";
  x: number; y: number;
  w?: number; h?: number;
  x2?: number; y2?: number; // for lines/arrows
  text?: string;
  color: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  dash?: DashStyle;
  points?: number[][];
  fontSize?: number;
  fontFamily?: string;
  opacity?: number;
  borderRadius?: number;
  locked?: boolean;
  hidden?: boolean;
  textAlign?: "left" | "center" | "right";
}

export interface Connector {
  id: string;
  fromId: string;
  toId: string;
  color: string;
  strokeWidth?: number;
  dash?: DashStyle;
}

export interface Board {
  id: string;
  name: string;
  objects: WBObject[];
  connectors: Connector[];
}

interface WhiteboardState {
  boards: Board[];
  activeBoardId: string;
  tool: ToolType;
  color: string;
  bgMode: BgMode;
  selectedId: string | null;
  pan: { x: number; y: number };
  zoom: number;
  history: WBObject[][];
  
  // Actions
  loadBoards: () => void;
  createBoard: (name: string) => void;
  switchBoard: (id: string) => void;
  deleteBoard: (id: string) => void;
  renameBoard: (id: string, newName: string) => void;
  
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setBgMode: (mode: BgMode) => void;
  setSelectedId: (id: string | null) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  
  // Object manipulation
  updateObjects: (updater: (objs: WBObject[]) => WBObject[]) => void;
  pushHistory: () => void;
  undo: () => void;
  deleteSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;

  // Connectors
  addConnector: (fromId: string, toId: string, color: string) => void;
  removeConnector: (id: string) => void;
}

const LS_KEY = "delay-whiteboard-v3";

function uid() { return Math.random().toString(36).slice(2, 10); }

function saveToLS(boards: Board[], activeId: string) {
  localStorage.setItem(LS_KEY, JSON.stringify({ boards, activeBoardId: activeId }));
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  boards: [],
  activeBoardId: "",
  tool: "select",
  color: "#6366F1",
  bgMode: "dots",
  selectedId: null,
  pan: { x: 0, y: 0 },
  zoom: 1,
  history: [],

  loadBoards: () => {
    try {
      const d = localStorage.getItem(LS_KEY);
      if (d) {
        const { boards, activeBoardId } = JSON.parse(d);
        if (boards && boards.length > 0) {
          set({ boards, activeBoardId: activeBoardId || boards[0].id, history: [] });
          return;
        }
      }
    } catch {}
    
    // Default board
    const id = uid();
    const defaultBoards: Board[] = [{ id, name: "Untitled Board", objects: [], connectors: [] }];
    saveToLS(defaultBoards, id);
    set({ boards: defaultBoards, activeBoardId: id, history: [] });
  },

  createBoard: (name) => {
    const id = uid();
    const newBoard: Board = { id, name, objects: [], connectors: [] };
    const { boards } = get();
    const nextBoards = [...boards, newBoard];
    saveToLS(nextBoards, id);
    set({ boards: nextBoards, activeBoardId: id, history: [], pan: { x: 0, y: 0 }, zoom: 1 });
  },

  switchBoard: (id) => {
    const { boards } = get();
    saveToLS(boards, id);
    set({ activeBoardId: id, history: [], selectedId: null });
  },

  deleteBoard: (id) => {
    const { boards, activeBoardId } = get();
    if (boards.length <= 1) return;
    const nextBoards = boards.filter(b => b.id !== id);
    const nextActive = activeBoardId === id ? nextBoards[0].id : activeBoardId;
    saveToLS(nextBoards, nextActive);
    set({ boards: nextBoards, activeBoardId: nextActive, history: [], selectedId: null });
  },

  renameBoard: (id, newName) => {
    const { boards, activeBoardId } = get();
    const nextBoards = boards.map(b => b.id === id ? { ...b, name: newName } : b);
    saveToLS(nextBoards, activeBoardId);
    set({ boards: nextBoards });
  },

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setBgMode: (bgMode) => set({ bgMode }),
  setSelectedId: (selectedId) => set({ selectedId }),
  
  setPan: (panUpdater) => set(state => ({
    pan: typeof panUpdater === "function" ? panUpdater(state.pan) : panUpdater
  })),
  
  setZoom: (zoomUpdater) => set(state => ({
    zoom: typeof zoomUpdater === "function" ? zoomUpdater(state.zoom) : zoomUpdater
  })),

  updateObjects: (updater) => {
    const { boards, activeBoardId } = get();
    const board = boards.find(b => b.id === activeBoardId);
    if (!board) return;
    
    const newObjects = updater(board.objects);
    const nextBoards = boards.map(b => b.id === activeBoardId ? { ...b, objects: newObjects } : b);
    
    saveToLS(nextBoards, activeBoardId);
    set({ boards: nextBoards });
  },

  pushHistory: () => {
    const { boards, activeBoardId, history } = get();
    const board = boards.find(b => b.id === activeBoardId);
    if (!board) return;
    set({ history: [...history.slice(-30), board.objects] });
  },

  undo: () => {
    const { history, boards, activeBoardId } = get();
    if (history.length === 0) return;
    
    const previousState = history[history.length - 1];
    const nextBoards = boards.map(b => b.id === activeBoardId ? { ...b, objects: previousState } : b);
    
    saveToLS(nextBoards, activeBoardId);
    set({ 
      boards: nextBoards, 
      history: history.slice(0, -1),
      selectedId: null 
    });
  },

  deleteSelected: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    get().pushHistory();
    get().updateObjects(objs => objs.filter(o => o.id !== selectedId));
    set({ selectedId: null });
  },

  bringForward: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    get().pushHistory();
    get().updateObjects(objs => {
      const idx = objs.findIndex(o => o.id === selectedId);
      if (idx === -1 || idx === objs.length - 1) return objs;
      const next = [...objs];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      return next;
    });
  },

  sendBackward: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    get().pushHistory();
    get().updateObjects(objs => {
      const idx = objs.findIndex(o => o.id === selectedId);
      if (idx <= 0) return objs;
      const next = [...objs];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      return next;
    });
  },

  addConnector: (fromId, toId, color) => {
    const { boards, activeBoardId } = get();
    const connector: Connector = { id: uid(), fromId, toId, color };
    const nextBoards = boards.map(b =>
      b.id === activeBoardId ? { ...b, connectors: [...(b.connectors || []), connector] } : b
    );
    saveToLS(nextBoards, activeBoardId);
    set({ boards: nextBoards });
  },

  removeConnector: (id) => {
    const { boards, activeBoardId } = get();
    const nextBoards = boards.map(b =>
      b.id === activeBoardId ? { ...b, connectors: (b.connectors || []).filter(c => c.id !== id) } : b
    );
    saveToLS(nextBoards, activeBoardId);
    set({ boards: nextBoards });
  }
}));
