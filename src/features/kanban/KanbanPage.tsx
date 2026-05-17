import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, GripVertical, Edit3, LayoutGrid, ChevronLeft } from "lucide-react";
import { useKanbanStore, KanbanCard } from "@/stores/kanbanStore";
import { KanbanDetailDrawer } from "./KanbanDetailDrawer";
import { EmptyState } from "@/shared/components/EmptyState";

const COLORS = ["#6366F1","#F59E0B","#10B981","#EF4444","#8B5CF6","#06B6D4","#EC4899"];

export function KanbanPage() {
  const { boards, activeBoardId, loadBoards, createBoard, deleteBoard, renameBoard, setActiveBoardId, addColumn, deleteColumn, updateColumnTitle, addCard, deleteCard, updateCard, moveCard } = useKanbanStore();
  const [dragCard, setDragCard] = useState<{card: KanbanCard; fromCol: string} | null>(null);
  const [editingBoard, setEditingBoard] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<{colId: string, card: KanbanCard} | null>(null);

  useEffect(() => { loadBoards(); }, []);

  const activeBoard = boards.find(b => b.id === activeBoardId);

  const handleCreateBoard = () => {
    createBoard("New Board", COLORS[boards.length % COLORS.length]);
  };

  const handleDrop = (targetColId: string) => {
    if (!dragCard || !activeBoardId) return;
    moveCard(activeBoardId, dragCard.card, dragCard.fromCol, targetColId);
    setDragCard(null);
    setDragOverCol(null);
  };

  // No boards — show welcome
  if (boards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-bg-primary">
        <EmptyState type="kanban" title="No Kanban Boards" description="Create your first board to start organizing." action={{ label: "Create Board", onClick: handleCreateBoard }} />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-bg-primary relative">
      {/* Boards sidebar */}
      <div className={`shrink-0 border-r border-border/40 bg-bg-secondary/30 flex flex-col h-full ${activeBoardId ? 'hidden md:flex w-56' : 'w-full md:w-56 flex'}`}>
        <div className="p-3 flex items-center justify-between border-b border-border/20">
          <h2 className="text-[11px] font-extrabold text-text-tertiary uppercase tracking-widest">Boards</h2>
          <button onClick={handleCreateBoard} className="w-7 h-7 flex items-center justify-center rounded-lg bg-accent text-white cursor-pointer">
            <Plus size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {boards.map(b => (
            <div key={b.id} className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all
              ${activeBoardId === b.id ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-bg-hover"}`}>
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: b.color }} onClick={() => setActiveBoardId(b.id)} />
              {editingBoard === b.id ? (
                <input autoFocus value={b.name} onChange={e => renameBoard(b.id, e.target.value)}
                  onBlur={() => setEditingBoard(null)} onKeyDown={e => { if (e.key === "Enter") setEditingBoard(null); }}
                  className="flex-1 bg-transparent text-[12px] font-bold outline-none" />
              ) : (
                <span className="flex-1 text-[12px] font-bold truncate" onClick={() => setActiveBoardId(b.id)}>{b.name}</span>
              )}
              <button onClick={() => setEditingBoard(b.id)} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-accent cursor-pointer"><Edit3 size={10} /></button>
              <button onClick={() => deleteBoard(b.id)} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger cursor-pointer"><Trash2 size={10} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Board content */}
      {activeBoard ? (
        <div className={`flex-1 flex flex-col overflow-hidden ${!activeBoardId ? 'hidden md:flex' : 'flex'}`}>
          <div className="md:hidden flex items-center p-3 border-b border-border/20 gap-2 shrink-0">
            <button onClick={() => setActiveBoardId(null)} className="p-1.5 rounded-lg bg-bg-secondary text-text-secondary hover:text-text-primary">
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-text-primary text-[13px]">{activeBoard.name}</span>
          </div>
          <div className="flex-1 flex overflow-x-auto p-5 gap-4 items-start">
          <AnimatePresence mode="popLayout">
            {activeBoard.columns.map(col => (
              <motion.div key={col.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className={`w-[280px] shrink-0 flex flex-col rounded-2xl border overflow-hidden transition-all duration-200
                  ${dragOverCol === col.id ? "bg-accent/5 border-accent/30 scale-[1.01]" : "bg-bg-secondary/30 border-border/30"}`}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col.id)}>
                <div className="flex items-center gap-2 p-3 border-b border-border/20">
                  <input value={col.title} onChange={e => updateColumnTitle(activeBoardId!, col.id, e.target.value)}
                    className="flex-1 bg-transparent font-bold text-[13px] text-text-primary outline-none" />
                  <span className="text-[10px] font-bold text-text-tertiary bg-bg-hover px-1.5 py-0.5 rounded-md">{col.cards.length}</span>
                  <button onClick={() => deleteColumn(activeBoardId!, col.id)} className="text-text-tertiary hover:text-danger cursor-pointer"><Trash2 size={12} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[80px]">
                  {col.cards.map(card => (
                    <motion.div key={card.id} layout draggable onDragStart={() => setDragCard({ card, fromCol: col.id })} onDragEnd={() => setDragOverCol(null)}
                      onClick={() => setSelectedCard({ colId: col.id, card })}
                      className={`bg-bg-primary rounded-xl p-3 border border-border/20 cursor-grab active:cursor-grabbing hover:border-accent/30 hover:shadow-lg transition-all group
                        ${dragCard?.card.id === card.id ? "opacity-30 scale-95" : ""}`}>
                      <div className="flex items-start gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: card.color }} />
                        <span className="flex-1 text-[12px] font-bold text-text-primary truncate">{card.title}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteCard(activeBoardId!, col.id, card.id); }}
                          className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger cursor-pointer"><Trash2 size={11} /></button>
                      </div>
                      <p className="w-full text-[11px] text-text-tertiary truncate leading-relaxed">
                        {card.desc || "No description"}
                      </p>
                    </motion.div>
                  ))}
                </div>
                <button onClick={() => addCard(activeBoardId!, col.id)}
                  className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-text-tertiary hover:text-accent hover:bg-accent/5 transition-all cursor-pointer border-t border-border/10">
                  <Plus size={12} /> Add Card
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <button onClick={() => addColumn(activeBoardId!)}
            className="w-[280px] shrink-0 h-fit flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-border/30
              text-text-tertiary hover:text-accent hover:border-accent/40 transition-all cursor-pointer font-bold text-[12px]">
            <Plus size={14} /> Add Column
          </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState type="kanban" title="No Kanban Boards" description="Select a board from the sidebar to view your tasks." />
        </div>
      )}

      {selectedCard && activeBoardId && (
        <KanbanDetailDrawer
          boardId={activeBoardId}
          colId={selectedCard.colId}
          card={boards.find(b => b.id === activeBoardId)?.columns.find(c => c.id === selectedCard.colId)?.cards.find(c => c.id === selectedCard.card.id) || selectedCard.card}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
