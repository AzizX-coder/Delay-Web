import { create } from "zustand";

export interface VaultFile {
  id: string;
  name: string;
  folderId: string | null;
  fileData: string;  // base64
  fileType: string;
  size: number;
  created_at: number;
}

export interface VaultFolder {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

interface BucketState {
  files: VaultFile[];
  folders: VaultFolder[];
  loading: boolean;
  loadVault: () => void;
  addFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  removeFolder: (id: string) => void;
  addFile: (file: Omit<VaultFile, "id" | "created_at">) => void;
  removeFile: (id: string) => void;
  moveFile: (fileId: string, folderId: string | null) => void;
}

const STORAGE_KEY = "delay_vault";
const FOLDER_COLORS = ["#6366F1","#EF4444","#10B981","#F59E0B","#8B5CF6","#06B6D4","#EC4899","#14B8A6"];

const persist = (files: VaultFile[], folders: VaultFolder[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ files, folders }));
  } catch {}
};

export const useBucketStore = create<BucketState>((set, get) => ({
  files: [],
  folders: [],
  loading: true,

  loadVault: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ files: data.files || [], folders: data.folders || [], loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  addFolder: (name) => {
    const folder: VaultFolder = {
      id: crypto.randomUUID(),
      name,
      color: FOLDER_COLORS[get().folders.length % FOLDER_COLORS.length],
      created_at: Date.now(),
    };
    const next = [...get().folders, folder];
    set({ folders: next });
    persist(get().files, next);
  },

  renameFolder: (id, name) => {
    const next = get().folders.map(f => f.id === id ? { ...f, name } : f);
    set({ folders: next });
    persist(get().files, next);
  },

  removeFolder: (id) => {
    const nextFolders = get().folders.filter(f => f.id !== id);
    const nextFiles = get().files.map(f => f.folderId === id ? { ...f, folderId: null } : f);
    set({ folders: nextFolders, files: nextFiles });
    persist(nextFiles, nextFolders);
  },

  addFile: (partial) => {
    const file: VaultFile = {
      ...partial,
      id: crypto.randomUUID(),
      created_at: Date.now(),
    };
    const next = [file, ...get().files];
    set({ files: next });
    persist(next, get().folders);
  },

  removeFile: (id) => {
    const next = get().files.filter(f => f.id !== id);
    set({ files: next });
    persist(next, get().folders);
  },

  moveFile: (fileId, folderId) => {
    const next = get().files.map(f => f.id === fileId ? { ...f, folderId } : f);
    set({ files: next });
    persist(next, get().folders);
  },
}));
