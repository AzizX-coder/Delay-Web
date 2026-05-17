import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Calendar, Flag, AlignLeft, Activity } from "lucide-react";
import { useKanbanStore, KanbanCard } from "@/stores/kanbanStore";

interface Props {
  boardId: string;
  colId: string;
  card: KanbanCard;
  onClose: () => void;
}

export function KanbanDetailDrawer({ boardId, colId, card, onClose }: Props) {
  const { updateCard, addActivity } = useKanbanStore();
  const [newActivity, setNewActivity] = useState("");

  const handleUpdate = (updates: Partial<KanbanCard>) => {
    updateCard(boardId, colId, card.id, updates);
  };

  const handleAddActivity = () => {
    if (!newActivity.trim()) return;
    addActivity(boardId, colId, card.id, newActivity);
    setNewActivity("");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-[400px] max-w-full bg-bg-primary border-l border-border/40 shadow-2xl z-[101] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <input
            value={card.title}
            onChange={(e) => handleUpdate({ title: e.target.value })}
            className="text-[18px] font-bold bg-transparent outline-none flex-1 mr-4"
          />
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-hover">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center"><AlignLeft size={16} className="text-text-tertiary" /></div>
              <h3 className="text-[13px] font-bold">Description</h3>
            </div>
            <div className="pl-11">
              <textarea
                value={card.desc}
                onChange={(e) => handleUpdate({ desc: e.target.value })}
                placeholder="Add a more detailed description..."
                className="w-full bg-bg-secondary p-3 rounded-xl border border-border/20 outline-none text-[13px] min-h-[100px] resize-y"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center"><Calendar size={16} className="text-text-tertiary" /></div>
              <h3 className="text-[13px] font-bold">Due Date</h3>
            </div>
            <div className="pl-11">
              <input
                type="date"
                value={card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""}
                onChange={(e) => handleUpdate({ dueDate: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                className="bg-bg-secondary px-3 py-2 rounded-lg border border-border/20 outline-none text-[13px]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center"><Flag size={16} className="text-text-tertiary" /></div>
              <h3 className="text-[13px] font-bold">Priority</h3>
            </div>
            <div className="pl-11 flex gap-2">
              {[0, 1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => handleUpdate({ priority: p })}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border ${card.priority === p ? "border-accent bg-accent/10 text-accent" : "border-border/30 text-text-tertiary hover:bg-bg-hover"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center"><Activity size={16} className="text-text-tertiary" /></div>
              <h3 className="text-[13px] font-bold">Activity</h3>
            </div>
            <div className="pl-11 space-y-3">
              <div className="flex gap-2">
                <input
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddActivity()}
                  placeholder="Write a comment..."
                  className="flex-1 bg-bg-secondary px-3 py-2 rounded-lg border border-border/20 outline-none text-[13px]"
                />
                <button onClick={handleAddActivity} className="px-3 py-2 bg-accent text-white rounded-lg text-[12px] font-bold">Save</button>
              </div>
              
              <div className="space-y-2 mt-4">
                {card.activity?.map((act) => (
                  <div key={act.id} className="text-[12px] pb-2 border-b border-border/10">
                    <p className="font-medium text-text-primary mb-1">{act.text}</p>
                    <p className="text-[10px] text-text-tertiary">{new Date(act.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
