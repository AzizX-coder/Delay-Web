import { motion, AnimatePresence } from "motion/react";
import { useNotesStore } from "@/stores/notesStore";
import {
  Plus,
  Search,
  Pin,
  Trash2,
  Palette,
  StickyNote,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRef, useState, useEffect } from "react";
import { NOTE_COLORS } from "@/types/note";
import { EmptyState } from "@/shared/components/EmptyState";
import { NOTE_TEMPLATES } from "@/lib/noteTemplates";
import { DelayIcon } from "@/components/ui/DelayIcon";

export function NotesList() {
  const {
    notes,
    activeNoteId,
    searchQuery,
    createNote,
    deleteNote,
    updateNote,
    setActiveNote,
    setSearchQuery,
  } = useNotesStore();

  const [colorPickerNoteId, setColorPickerNoteId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const templatesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTemplates) return;
    const onClick = (e: MouseEvent) => {
      if (
        templatesRef.current &&
        !templatesRef.current.contains(e.target as Node)
      ) {
        setShowTemplates(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showTemplates]);

  const createFromTemplate = async (templateId: string) => {
    const tpl = NOTE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const { title, content } = tpl.build();
    const id = await createNote();
    const text = extractText(content);
    await updateNote(id, {
      title,
      content: JSON.stringify(content),
      content_text: text,
    });
    setShowTemplates(false);
  };

  return (
    <div className="w-full md:w-72 h-full flex flex-col border-r border-border-light bg-bg-secondary/40 backdrop-blur-xl shrink-0">
      {/* Header */}
      <div className="px-3 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-text-primary tracking-[-0.01em]">
            Notes
          </h2>
          <div ref={templatesRef} className="relative flex items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              onClick={createNote}
              className="h-7 pl-2 pr-1.5 flex items-center gap-1 rounded-l-lg
                bg-accent text-text-inverse cursor-pointer
                hover:bg-accent-hover transition-colors
                shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
              title="New blank note"
            >
              <Plus size={15} />
            </motion.button>
            <button
              onClick={() => setShowTemplates((v) => !v)}
              className="h-7 w-6 flex items-center justify-center rounded-r-lg
                bg-accent text-text-inverse cursor-pointer border-l border-white/25
                hover:bg-accent-hover transition-colors
                shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
              title="Templates"
            >
              <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-64 z-50
                    rounded-2xl bg-bg-elevated border border-border-light
                    shadow-2xl p-1.5 backdrop-blur-xl"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                    Templates
                  </div>
                  {NOTE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => createFromTemplate(tpl.id)}
                      className="w-full flex items-start gap-3 px-2.5 py-2 rounded-xl
                        text-left cursor-pointer hover:bg-bg-hover transition-colors"
                    >
                      <div className="shrink-0 mt-0.5">
                        <DelayIcon name={tpl.icon} size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-text-primary">
                          {tpl.name}
                        </p>
                        <p className="text-[11px] text-text-tertiary truncate">
                          {tpl.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-3 bg-bg-primary/70 border border-border-light
              rounded-xl text-[13px] text-text-primary placeholder:text-text-tertiary
              outline-none focus:border-border/40 focus:ring-2 focus:ring-text-secondary/10
              transition-all"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <AnimatePresence mode="popLayout">
          {notes.length === 0 ? (
              <EmptyState
                type="notes"
                title="No notes yet"
                description="Tap + to create your first note."
              />
          ) : (
            notes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={() => setActiveNote(note.id)}
                className={`group relative p-3 mb-1.5 rounded-xl cursor-pointer
                  transition-all duration-150
                  ${
                    activeNoteId === note.id
                      ? "bg-accent/10 border border-accent/25 shadow-[0_2px_12px_rgba(0,122,255,0.08)]"
                      : "hover:bg-bg-hover border border-transparent hover:border-border-light"
                  }`}
                style={
                  note.color
                    ? { backgroundColor: `var(--color-note-${note.color})` }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-text-primary truncate">
                      {note.title || "Untitled"}
                    </p>
                    <p className="text-[12px] text-text-tertiary truncate mt-0.5">
                      {note.content_text?.slice(0, 60) || "No content"}
                    </p>
                    <p className="text-[11px] text-text-tertiary mt-1">
                      {formatDistanceToNow(note.updated_at * 1000, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {note.pinned ? (
                    <Pin
                      size={12}
                      className="text-accent mt-0.5 shrink-0"
                      fill="currentColor"
                    />
                  ) : null}
                </div>

                {/* Hover actions */}
                <div
                  className="absolute top-2 right-2 flex items-center gap-0.5
                    opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0
                    transition-all duration-150
                    bg-bg-glass-heavy backdrop-blur-md rounded-lg p-0.5 border border-border-light
                    shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() =>
                      updateNote(note.id, { pinned: note.pinned ? 0 : 1 })
                    }
                    className="w-6 h-6 flex items-center justify-center rounded-md
                      text-text-tertiary hover:text-accent hover:bg-accent/10
                      transition-colors"
                    title={note.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin size={12} />
                  </button>
                  <button
                    onClick={() =>
                      setColorPickerNoteId(
                        colorPickerNoteId === note.id ? null : note.id
                      )
                    }
                    className="w-6 h-6 flex items-center justify-center rounded-md
                      text-text-tertiary hover:text-warning hover:bg-warning/10
                      transition-colors"
                    title="Color"
                  >
                    <Palette size={12} />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-md
                      text-text-tertiary hover:text-danger hover:bg-danger/10
                      transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Color picker popup */}
                {colorPickerNoteId === note.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full right-2 mt-1 z-10 flex items-center gap-1
                      bg-bg-elevated p-2 rounded-xl border border-border shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        updateNote(note.id, { color: null });
                        setColorPickerNoteId(null);
                      }}
                      className="w-6 h-6 rounded-full border-2 border-border bg-bg-primary
                        hover:scale-110 transition-transform"
                      title="Default"
                    />
                    {Object.entries(NOTE_COLORS).map(([name, color]) => (
                      <button
                        key={name}
                        onClick={() => {
                          updateNote(note.id, { color: name });
                          setColorPickerNoteId(null);
                        }}
                        className="w-6 h-6 rounded-full hover:scale-110 transition-transform
                          border border-border-light"
                        style={{ backgroundColor: color }}
                        title={name}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function extractText(node: any): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (!Array.isArray(node.content)) return "";
  return node.content.map(extractText).join(" ").trim();
}

