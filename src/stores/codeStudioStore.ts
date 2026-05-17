import { create } from "zustand";

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: string;
}

interface CodeStudioState {
  workspacePath: string | null;
  fileTree: FileNode[];
  openFiles: OpenFile[];
  activeFilePath: string | null;
  loading: boolean;
  terminalOutput: string;

  setWorkspacePath: (path: string | null) => void;
  loadFileTree: () => Promise<void>;
  openFile: (path: string, name: string) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  saveActiveFile: () => Promise<void>;
  appendTerminalOutput: (text: string) => void;
  clearTerminal: () => void;
}

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx': return 'javascript';
    case 'ts':
    case 'tsx': return 'typescript';
    case 'py': return 'python';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'rs': return 'rust';
    case 'go': return 'go';
    case 'sh':
    case 'bat': return 'shell';
    default: return 'plaintext';
  }
}

export const useCodeStudioStore = create<CodeStudioState>((set, get) => ({
  workspacePath: localStorage.getItem("delay_workspace_path") || null,
  fileTree: [],
  openFiles: [],
  activeFilePath: null,
  loading: false,
  terminalOutput: "",

  setWorkspacePath: (path) => {
    if (path) {
      localStorage.setItem("delay_workspace_path", path);
    } else {
      localStorage.removeItem("delay_workspace_path");
    }
    set({ workspacePath: path, openFiles: [], activeFilePath: null, fileTree: [] });
    if (path) get().loadFileTree();
  },

  loadFileTree: async () => {
    const { workspacePath } = get();
    if (!workspacePath) return;
    set({ loading: true });
    
    // We'll build a simple 2-level deep scan for now, or use fsList recursively if needed.
    // For large projects, recursive in renderer is slow. We'll do 1 level for root, and fetch on demand if we build a proper tree.
    // To keep it simple for the IDE, let's load all files up to depth 3 in `fs-list` if supported, or just flat list mapped to tree.
    // For now we'll do a 1 level scan and let the component handle expansion, or we just do a flat list.
    try {
      if ((window as any).electronAPI?.codeStudio?.fsList) {
        const rootEntries = await (window as any).electronAPI.codeStudio.fsList(workspacePath);
        if (!rootEntries.error) {
           // Sort dirs first
           rootEntries.sort((a: any, b: any) => {
             if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
             return a.isDir ? -1 : 1;
           });
           set({ fileTree: rootEntries });
        }
      }
    } catch {}
    set({ loading: false });
  },

  openFile: async (path, name) => {
    const { openFiles } = get();
    const existing = openFiles.find(f => f.path === path);
    
    if (existing) {
      set({ activeFilePath: path });
      return;
    }

    try {
      const resp = await (window as any).electronAPI.codeStudio.fsRead(path);
      if (resp && !resp.error) {
        const newFile: OpenFile = {
          path,
          name,
          content: resp.content,
          isDirty: false,
          language: detectLanguage(name),
        };
        set({ 
          openFiles: [...openFiles, newFile],
          activeFilePath: path
        });
      }
    } catch {}
  },

  closeFile: (path) => {
    const { openFiles, activeFilePath } = get();
    const newFiles = openFiles.filter(f => f.path !== path);
    
    let newActive = activeFilePath;
    if (activeFilePath === path) {
      newActive = newFiles.length > 0 ? newFiles[newFiles.length - 1].path : null;
    }
    
    set({ openFiles: newFiles, activeFilePath: newActive });
  },

  setActiveFile: (path) => set({ activeFilePath: path }),

  updateFileContent: (path, content) => {
    set((state) => ({
      openFiles: state.openFiles.map(f => 
        f.path === path ? { ...f, content, isDirty: true } : f
      )
    }));
  },

  saveActiveFile: async () => {
    const { activeFilePath, openFiles } = get();
    if (!activeFilePath) return;
    const file = openFiles.find(f => f.path === activeFilePath);
    if (!file || !file.isDirty) return;

    try {
      const res = await (window as any).electronAPI.codeStudio.fsWrite(file.path, file.content);
      if (res && res.ok) {
        set((state) => ({
          openFiles: state.openFiles.map(f => 
            f.path === activeFilePath ? { ...f, isDirty: false } : f
          )
        }));
      }
    } catch {}
  },

  appendTerminalOutput: (text) => set((state) => ({ 
    terminalOutput: state.terminalOutput + text 
  })),

  clearTerminal: () => set({ terminalOutput: "" }),
}));
