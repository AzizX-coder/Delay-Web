import { useState, useEffect, useRef } from "react";
import { useCaptureStore, CaptureItem } from "@/stores/captureStore";
import { motion, AnimatePresence } from "motion/react";
import {
  Send, Bookmark, Pin, PinOff, Trash2, Link2, CheckSquare,
  Search, X, ExternalLink, Filter, SmilePlus, Square, CheckSquare2,
} from "lucide-react";
import { EmptyState } from "@/shared/components/EmptyState";

const REACTIONS = ["👍", "❤️", "🔥", "⭐", "🎯", "💡", "✅", "🚀"];

const isUrl = (text: string) => /^https?:\/\//i.test(text);

export function CapturePage() {
  const { items, loading, loadItems, addItem, removeItem, togglePin, toggleComplete, addReaction } = useCaptureStore();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<"all" | "links" | "todos" | "pinned">("all");
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadItems(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [items.length]);

  const handleSend = () => {
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
  };

  const pinnedItems = items.filter(i => i.pinned);
  const regularItems = items.filter(i => !i.pinned);
  let all = [...pinnedItems, ...regularItems];

  if (filter === "links") all = all.filter(i => i.type === "link");
  if (filter === "todos") all = all.filter(i => i.type === "todo");
  if (filter === "pinned") all = all.filter(i => i.pinned);

  if (search) {
    all = all.filter(i => i.content.toLowerCase().includes(search.toLowerCase()));
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getDomain = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/30 bg-bg-secondary/30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Bookmark size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-text-primary">Capture</h1>
            <p className="text-[10px] text-text-tertiary">Quick capture inbox</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {showSearch ? (
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-bg-primary border border-border/30">
              <Search size={13} className="text-text-tertiary" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." autoFocus
                className="bg-transparent outline-none text-[12px] text-text-primary w-[100px] md:w-[160px]" />
              <button onClick={() => { setShowSearch(false); setSearch(""); }} className="text-text-tertiary cursor-pointer"><X size={13} /></button>
            </div>
          ) : (
            <button onClick={() => setShowSearch(true)} className="p-2 rounded-lg hover:bg-bg-hover text-text-tertiary cursor-pointer"><Search size={16} /></button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 px-4 md:px-6 py-2 border-b border-border/20 overflow-x-auto no-scrollbar shrink-0">
        {([
          { key: "all", label: "All" },
          { key: "pinned", label: "📌 Pinned" },
          { key: "links", label: "🔗 Links" },
          { key: "todos", label: "☑️ Todos" },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${filter === f.key ? "bg-accent text-white" : "bg-bg-secondary/50 text-text-tertiary hover:text-text-secondary"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-[12px]">Loading...</div>
        ) : all.length === 0 ? (
          <EmptyState type="capture" title="Capture inbox" description="Save links, thoughts, and todos. Use Ctrl+Shift+S from anywhere." />
        ) : (
          <AnimatePresence initial={false}>
            {all.map(item => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
                className={`group max-w-[90%] md:max-w-[65%] ml-auto rounded-2xl rounded-br-md p-3 border transition-all relative
                  ${item.pinned ? "bg-accent/5 border-accent/20" : "bg-bg-secondary/60 border-border/20 hover:border-border/40"}`}>
                {item.pinned && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <Pin size={10} className="text-white" />
                  </div>
                )}

                {/* Text */}
                {item.type === "text" && (
                  <p className="text-[13px] text-text-primary whitespace-pre-wrap break-words leading-relaxed">{item.content}</p>
                )}

                {/* Link with rich preview (favicon + domain + URL) */}
                {item.type === "link" && (
                  <a href={item.content} target="_blank" rel="noopener noreferrer" className="block group/link">
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-bg-primary/50 border border-border/20 hover:border-accent/30 hover:bg-bg-primary/70 transition-all">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${getDomain(item.content)}&sz=64`}
                        alt=""
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        className="w-9 h-9 rounded-lg bg-accent/10 shrink-0 mt-0.5 object-contain p-1.5 border border-border/20"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-extrabold text-accent truncate group-hover/link:underline">{getDomain(item.content)}</p>
                        <p className="text-[11px] text-text-tertiary truncate mt-0.5">{item.content}</p>
                      </div>
                      <ExternalLink size={12} className="text-text-tertiary shrink-0 mt-1.5" />
                    </div>
                  </a>
                )}

                {/* Todo */}
                {item.type === "todo" && (
                  <div className="flex items-start gap-2 cursor-pointer" onClick={() => toggleComplete(item.id)}>
                    {item.completed ? (
                      <CheckSquare2 size={16} className="text-success shrink-0 mt-0.5" />
                    ) : (
                      <Square size={16} className="text-text-tertiary shrink-0 mt-0.5" />
                    )}
                    <p className={`text-[13px] leading-relaxed ${item.completed ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                      {item.content}
                    </p>
                  </div>
                )}

                {/* Emoji reaction */}
                {item.emoji && (
                  <div className="mt-1.5">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-bg-hover text-[14px]">{item.emoji}</span>
                  </div>
                )}

                {/* Meta row — always visible on mobile, hover on desktop */}
                <div className="flex items-center justify-between mt-2 gap-2">
                  <span className="text-[9px] text-text-tertiary">{formatDate(item.created_at)}</span>
                  <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setShowReactions(showReactions === item.id ? null : item.id)} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-bg-hover cursor-pointer" aria-label="React"><SmilePlus size={12} /></button>
                    <button onClick={() => togglePin(item.id)} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-bg-hover cursor-pointer" aria-label={item.pinned ? "Unpin" : "Pin"}>{item.pinned ? <PinOff size={12} /> : <Pin size={12} />}</button>
                    <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 cursor-pointer" aria-label="Delete"><Trash2 size={12} /></button>
                  </div>
                </div>

                {/* Reaction picker */}
                <AnimatePresence>
                  {showReactions === item.id && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute bottom-full mb-1 right-0 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-bg-elevated border border-border/40 shadow-xl z-10">
                      {REACTIONS.map(e => (
                        <button key={e} onClick={() => { addReaction(item.id, e); setShowReactions(null); }}
                          className="text-[16px] hover:scale-125 transition-transform cursor-pointer p-0.5">{e}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border/30 bg-bg-secondary/30 backdrop-blur-md px-3 md:px-6 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Capture a thought, link, or [] todo..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-bg-primary border border-border/30 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent/40 transition-colors"
          />
          <button onClick={handleSend} disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
