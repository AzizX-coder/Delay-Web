import { useEffect } from "react";
import { useNotesStore } from "@/stores/notesStore";
import { NotesList } from "./NotesList";
import { NoteEditor } from "./NoteEditor";
import { StickyNote, X, ChevronLeft } from "lucide-react";
import { EmptyState } from "@/shared/components/EmptyState";
import { motion, AnimatePresence } from "motion/react";

export function NotesPage() {
  const { notes, openNoteIds, activeNoteId, loadNotes, setActiveNote, removeOpenNote } = useNotesStore();

  useEffect(() => {
    loadNotes();
  }, []);

  return (
    <div className="flex h-full relative">
      <div className={`h-full shrink-0 ${activeNoteId ? 'hidden md:block' : 'w-full md:w-auto'}`}>
        <NotesList />
      </div>
      <div className={`flex-1 h-full flex flex-col overflow-hidden bg-bg-primary ${!activeNoteId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* IDE-style Tab Bar */}
        {openNoteIds.length > 0 && (
          <div className="flex items-center h-10 border-b border-border-light bg-bg-secondary/30 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveNote(null)}
              className="md:hidden flex shrink-0 items-center justify-center h-full px-3 border-r border-border-light text-text-tertiary hover:text-text-primary"
            >
              <ChevronLeft size={16} />
            </button>
            <AnimatePresence initial={false}>
              {openNoteIds.map((id) => {
                const note = notes.find(n => n.id === id);
                if (!note) return null;
                const isActive = id === activeNoteId;
                
                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <div
                      onClick={() => setActiveNote(id)}
                      className={`group flex items-center h-10 px-3 min-w-[120px] max-w-[200px] border-r border-border-light cursor-pointer
                        transition-colors duration-150
                        ${isActive ? "bg-bg-primary" : "hover:bg-bg-hover"}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-tab-indicator"
                          className="absolute top-0 left-0 w-full h-[2px] bg-accent"
                          initial={false}
                        />
                      )}
                      <span className={`text-[12px] truncate flex-1 ${isActive ? "text-text-primary font-medium" : "text-text-secondary group-hover:text-text-primary"}`}>
                        {note.title || "Untitled"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOpenNote(id);
                        }}
                        className={`w-4 h-4 ml-2 rounded-sm flex items-center justify-center transition-colors
                          ${isActive ? "text-text-tertiary hover:bg-bg-secondary hover:text-text-primary" : "opacity-0 group-hover:opacity-100 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary"}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeNoteId ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeNoteId}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                <NoteEditor noteId={activeNoteId} />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                type="notes"
                title="Select a note or create a new one"
                description="Your thoughts, beautifully organized."
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
