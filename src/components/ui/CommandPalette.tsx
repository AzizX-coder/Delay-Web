import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Search, StickyNote, CheckSquare, Columns3, Archive,
  Bookmark, Calendar, Code2, PenTool, Mic, BarChart3,
  Sparkles, Timer, GitBranch, ArrowRight, X,
} from "lucide-react";
import Fuse from "fuse.js";
import { db } from "@/lib/database";
import { useSettingsStore } from "@/stores/settingsStore";

interface SearchItem {
  id: string;
  title: string;
  type: "note" | "task" | "event" | "snippet";
  path: string;
}

const TYPE_ICON: Record<string, any> = {
  note: StickyNote,
  task: CheckSquare,
  event: Calendar,
  snippet: Code2,
};

const TYPE_COLORS: Record<string, string> = {
  note: "text-accent",
  task: "text-success",
  event: "text-warning",
  snippet: "text-cyan-400",
};

const MODULES = [
  { id: "notes", label: "Docs", icon: StickyNote, path: "/notes" },
  { id: "tasks", label: "Planner", icon: CheckSquare, path: "/tasks" },
  { id: "calendar", label: "Schedule", icon: Calendar, path: "/calendar" },
  { id: "timer", label: "Focus", icon: Timer, path: "/timer" },
  { id: "saved", label: "Saved", icon: Bookmark, path: "/saved" },
  { id: "kanban", label: "Boards", icon: Columns3, path: "/kanban" },
  { id: "whiteboard", label: "Canvas", icon: PenTool, path: "/whiteboard" },
  { id: "code-studio", label: "Studio", icon: Code2, path: "/code-studio" },
  { id: "bucket", label: "Vault", icon: Archive, path: "/bucket" },
  { id: "voice-studio", label: "Voice", icon: Mic, path: "/voice-studio" },
  { id: "status", label: "Status", icon: BarChart3, path: "/status" },
  { id: "flows", label: "Flows", icon: GitBranch, path: "/flows" },
  { id: "ai", label: "Copilot", icon: Sparkles, path: "/ai" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { ai_enabled, enabled_modules } = useSettingsStore();

  const activeModules = useMemo(() => 
    MODULES.filter(m => {
      if (!enabled_modules.includes(m.id)) return false;
      if (m.id === "ai" && !ai_enabled) return false;
      return true;
    }),
  [enabled_modules, ai_enabled]);

  useEffect(() => {
    if (open) {
      loadItems();
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const loadItems = async () => {
    const [notes, tasks, events] = await Promise.all([
      db.notes.toArray(),
      db.tasks.toArray(),
      db.events.toArray(),
    ]);
    const all: SearchItem[] = [
      ...notes.filter(n => !n.deleted_at).map(n => ({
        id: n.id, title: n.title || "Untitled", type: "note" as const, path: "/notes",
      })),
      ...tasks.filter(t => !t.deleted_at).map(t => ({
        id: t.id, title: t.title, type: "task" as const, path: "/tasks",
      })),
      ...events.filter(e => !e.deleted_at).map(e => ({
        id: e.id, title: e.title, type: "event" as const, path: "/calendar",
      })),
    ];
    setItems(all);
  };

  const fuse = useMemo(() => new Fuse(items, {
    keys: ["title"],
    threshold: 0.4,
    minMatchCharLength: 1,
  }), [items]);

  const moduleFuse = useMemo(() => new Fuse(activeModules, {
    keys: ["label", "id"],
    threshold: 0.3,
  }), [activeModules]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show recent items
      return items.slice(0, 6).map(i => ({ ...i, isModule: false }));
    }
    const moduleResults = moduleFuse.search(query).slice(0, 3).map((r: any) => ({
      id: r.item.id,
      title: r.item.label,
      type: "module" as string,
      path: r.item.path,
      isModule: true,
    }));
    const itemResults = fuse.search(query).slice(0, 6).map((r: any) => ({
      ...r.item,
      isModule: false,
    }));
    return [...moduleResults, ...itemResults];
  }, [query, fuse, moduleFuse, items]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleSelect = (item: typeof results[number]) => {
    navigate(item.path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      handleSelect(results[selected]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="w-[min(520px,calc(100vw-32px))] bg-bg-elevated/98 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
            <Search size={18} className="text-text-tertiary shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search notes, tasks, modules..."
              className="flex-1 bg-transparent outline-none text-[15px] text-text-primary placeholder:text-text-tertiary"
            />
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-text-tertiary bg-bg-hover border border-border/30">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[360px] overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-tertiary text-[13px]">
                {query ? "No results found" : "Start typing to search..."}
              </div>
            ) : (
              results.map((item, i) => {
                const IconComponent = item.isModule
                  ? activeModules.find(m => m.id === item.id)?.icon || Sparkles
                  : TYPE_ICON[item.type] || StickyNote;
                const color = item.isModule ? "text-accent" : TYPE_COLORS[item.type] || "text-text-tertiary";

                return (
                  <button
                    key={`${item.id}-${i}`}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors
                      ${i === selected ? "bg-accent/10" : "hover:bg-bg-hover"}`}
                  >
                    <IconComponent size={16} className={color} />
                    <span className="flex-1 text-[13px] font-medium text-text-primary truncate">{item.title}</span>
                    <span className="text-[10px] text-text-tertiary uppercase font-bold">{item.isModule ? "Module" : item.type}</span>
                    {i === selected && <ArrowRight size={12} className="text-accent shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border/20 text-[10px] text-text-tertiary">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>ESC Close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
