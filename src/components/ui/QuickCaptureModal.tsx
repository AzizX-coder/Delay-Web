import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCaptureStore } from "@/stores/captureStore";

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
}

const isUrl = (text: string) => /^https?:\/\//i.test(text);

export function QuickCaptureModal({ open, onClose }: QuickCaptureModalProps) {
  const [input, setInput] = useState("");
  const { addItem } = useCaptureStore();

  const handleQuickCapture = () => {
    const text = input.trim();
    if (!text) return;
    
    if (text.startsWith("[] ") || text.startsWith("[ ] ")) {
      addItem({ type: "todo", content: text.replace(/^\[[\s]?\]\s*/, ""), completed: false });
    } else if (isUrl(text)) {
      addItem({ type: "link", content: text });
    } else {
      addItem({ type: "text", content: text });
    }
    
    setInput("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
              width: "100%", maxWidth: 480, background: "var(--color-bg-secondary)",
              borderRadius: 16, border: "1px solid var(--color-border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              padding: 20, zIndex: 100
            }}
          >
            <p className="text-[11px] text-text-tertiary uppercase tracking-wider font-bold mb-2">QUICK CAPTURE</p>
            <textarea
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What's on your mind? Paste a link or start with [] for a todo..."
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickCapture(); }
                if (e.key === 'Escape') onClose();
              }}
              style={{ width: "100%", minHeight: 80, background: "var(--color-bg-primary)",
                       border: "1px solid var(--color-border)", borderRadius: 8,
                       padding: 12, color: "var(--color-text-primary)", fontSize: 14,
                       resize: "none", fontFamily: "inherit" }}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-[12px] text-text-tertiary">Enter to save · Esc to close</span>
              <button onClick={handleQuickCapture} disabled={!input.trim()}
                className="px-4 py-2 bg-accent text-white rounded-lg text-[13px] font-bold disabled:opacity-50 hover:bg-accent-hover cursor-pointer border-none transition-colors">
                Capture ↵
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
