import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  Cpu,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

type Segment =
  | { kind: "text"; text: string }
  | { kind: "thought"; text: string }
  | { kind: "tool"; name: string; args: Record<string, unknown> }
  | { kind: "status"; text: string };

const TOOL_LABELS: Record<string, string> = {
  createNote: "Created note",
  updateNote: "Updated note",
  deleteNote: "Deleted note",
  createTask: "Scheduled task",
  updateTask: "Modified task",
  deleteTask: "Removed task",
  getTasks: "Read tasks",
  searchWeb: "Searched web",
  createCalendarEvent: "Added calendar event",
  saveMemory: "Saved to memory",
  recallMemories: "Recalled memories",
};

function parseMessage(raw: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  const pushText = (text: string) => {
    if (!text.trim()) return;
    segments.push({ kind: "text", text });
  };

  while (cursor < raw.length) {
    const rest = raw.slice(cursor);

    // <think>...</think>
    const thinkStart = rest.indexOf("<think>");
    // ```json ... ```
    const jsonMatch = rest.match(/```json\s*([\s\S]*?)```/);
    // *Working: tool...*
    const workingMatch = rest.match(/\*Working:\s*([^*\n]+?)\*/);

    const candidates: { idx: number; kind: "think" | "json" | "working" }[] = [];
    if (thinkStart !== -1) candidates.push({ idx: thinkStart, kind: "think" });
    if (jsonMatch && jsonMatch.index !== undefined)
      candidates.push({ idx: jsonMatch.index, kind: "json" });
    if (workingMatch && workingMatch.index !== undefined)
      candidates.push({ idx: workingMatch.index, kind: "working" });

    if (candidates.length === 0) {
      pushText(rest);
      break;
    }

    candidates.sort((a, b) => a.idx - b.idx);
    const first = candidates[0];

    if (first.idx > 0) pushText(rest.slice(0, first.idx));

    if (first.kind === "think") {
      const end = rest.indexOf("</think>", first.idx + 7);
      if (end === -1) {
        segments.push({ kind: "thought", text: rest.slice(first.idx + 7) });
        break;
      }
      segments.push({ kind: "thought", text: rest.slice(first.idx + 7, end) });
      cursor += end + "</think>".length;
      continue;
    }

    if (first.kind === "json" && jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed?.tool_call?.name) {
          segments.push({
            kind: "tool",
            name: String(parsed.tool_call.name),
            args: parsed.tool_call.arguments ?? {},
          });
        }
      } catch {}
      cursor += jsonMatch.index! + jsonMatch[0].length;
      continue;
    }

    if (first.kind === "working" && workingMatch) {
      segments.push({ kind: "status", text: workingMatch[1].trim() });
      cursor += workingMatch.index! + workingMatch[0].length;
      continue;
    }
  }

  return segments;
}

export function AgentMessage({
  content,
  streaming,
}: {
  content: string;
  streaming?: boolean;
}) {
  const segments = parseMessage(content);
  const hasText = segments.some((s) => s.kind === "text" && s.text.trim());
  const thoughts = segments.filter((s) => s.kind === "thought") as { kind: "thought", text: string }[];
  const tools = segments.filter((s) => s.kind === "tool") as { kind: "tool", name: string, args: any }[];
  const activeStatus = [...segments].reverse().find((s) => s.kind === "status") as { kind: "status", text: string } | undefined;

  // Render minimal logic trace if there are thoughts, tools, or status
  const showTrace = thoughts.length > 0 || tools.length > 0 || (streaming && activeStatus);

  return (
    <div className="space-y-4 w-full">
      {/* Minimal Logic Trace (Expandable) */}
      {showTrace && (
        <LogicTrace
          thoughts={thoughts}
          tools={tools}
          activeStatus={activeStatus}
          streaming={streaming}
        />
      )}

      {/* Actual markdown content fragments */}
      <div className="space-y-3">
        {segments.map((seg, i) => {
          if (seg.kind === "text") {
            return (
              <motion.div
                key={`text-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-[14.5px] text-text-primary leading-relaxed"
              >
                <MarkdownRenderer content={seg.text} />
              </motion.div>
            );
          }
          return null;
        })}
      </div>

      {streaming && !hasText && (
        <div className="flex gap-1 items-center py-1.5 pl-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-text-tertiary"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LogicTrace({
  thoughts,
  tools,
  activeStatus,
  streaming
}: {
  thoughts: { text: string }[];
  tools: { name: string; args: any }[];
  activeStatus?: { text: string };
  streaming?: boolean;
}) {
  const [open, setOpen] = useState(false);
  
  // Condense all thoughts together
  const rawThoughts = thoughts.map(t => t.text.trim()).join("\n\n").trim();
  
  // Decide header
  let headerText = "Reasoning & Process";
  if (streaming && activeStatus) {
    headerText = activeStatus.text;
  } else if (streaming && !activeStatus && rawThoughts.length > 0) {
    headerText = "Analyzing context...";
  } else if (tools.length > 0) {
    headerText = `Completed ${tools.length} tasks`;
  }

  return (
    <div className="rounded-xl border border-border/60 bg-bg-secondary/20 overflow-hidden text-[12px]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover/50 transition-colors cursor-pointer"
      >
        <div className="w-5 h-5 flex items-center justify-center text-text-tertiary shrink-0">
          {streaming ? (
             <Cpu size={14} className="text-accent animate-pulse" />
          ) : (
             <Terminal size={12} />
          )}
        </div>
        <span className="flex-1 font-medium text-text-secondary truncate">
          {headerText}
        </span>
        <ChevronRight
          size={14}
          className={`text-text-tertiary transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/40 bg-bg-secondary/10"
          >
            <div className="p-4 space-y-4">
              {/* Tool Execution List */}
              {tools.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Executed Actions</h4>
                  <div className="grid gap-2">
                    {tools.map((tool, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <CheckCircle2 size={14} className="text-success mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-text-primary">{TOOL_LABELS[tool.name] || tool.name}</p>
                          <p className="text-[11px] text-text-tertiary font-mono truncate max-w-sm mt-0.5">
                            {JSON.stringify(tool.args)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thoughts / Reasoning block */}
              {rawThoughts && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Logic Trace</h4>
                  <p className="text-[12px] leading-relaxed text-text-secondary whitespace-pre-wrap font-mono opacity-80 border-l-2 border-border/60 pl-3">
                    {rawThoughts}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
