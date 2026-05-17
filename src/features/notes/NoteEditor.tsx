import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import FontFamily from "@tiptap/extension-font-family";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useEffect, useRef, useState, useMemo } from "react";
import { useNotesStore } from "@/stores/notesStore";
import { useAIStore } from "@/stores/aiStore";
import { useThemeStore } from "@/stores/themeStore";
import { useT } from "@/lib/i18n";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, ListChecks,
  Quote, Code2, Highlighter, Smile, Mic, AlignLeft, AlignCenter,
  AlignRight, Minus, Table as TableIcon, Sparkles, Download,
  FileText, FileCode, Type, Send, Loader2, Share2, Copy, Check, Globe, EyeOff,
} from "lucide-react";
import { VoiceBadge } from "@/components/ui/VoiceBadge";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { nanoid } from "nanoid";

interface NoteEditorProps { noteId: string; }

/* ── Slash command definitions ── */
const SLASH_COMMANDS = [
  { id: "h1", label: "Heading 1", icon: Heading1, keywords: "heading title h1" },
  { id: "h2", label: "Heading 2", icon: Heading2, keywords: "heading subtitle h2" },
  { id: "h3", label: "Heading 3", icon: Heading3, keywords: "heading small h3" },
  { id: "bullet", label: "Bullet List", icon: List, keywords: "list bullet unordered" },
  { id: "numbered", label: "Numbered List", icon: ListOrdered, keywords: "list numbered ordered" },
  { id: "todo", label: "Task List", icon: ListChecks, keywords: "task todo checklist" },
  { id: "quote", label: "Blockquote", icon: Quote, keywords: "quote blockquote" },
  { id: "code", label: "Code Block", icon: Code2, keywords: "code block snippet" },
  { id: "divider", label: "Divider", icon: Minus, keywords: "divider line separator hr" },
  { id: "table", label: "Insert Table", icon: TableIcon, keywords: "table grid" },
  { id: "emoji", label: "Emoji", icon: Smile, keywords: "emoji smiley" },
  { id: "ai", label: "Ask AI", icon: Sparkles, keywords: "ai write generate", accent: true },
  { id: "export", label: "Export Document", icon: Download, keywords: "export download save" },
];

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { notes, updateNote } = useNotesStore();
  const { sendMessage } = useAIStore();
  const { theme } = useThemeStore();
  const t = useT();
  const note = notes.find((n) => n.id === noteId);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ x: number; y: number } | null>(null);
  const [slashFilter, setSlashFilter] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSharePopover, setShowSharePopover] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { isProOrAbove } = usePlanLimits();
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS;
    const q = slashFilter.toLowerCase();
    return SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(q) || c.keywords.includes(q));
  }, [slashFilter]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: t("notes.start_writing") }),
      Highlight.configure({ multicolor: true }),
      TaskList, TaskItem.configure({ nested: true }), Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle, FontFamily, Color, Typography,
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
    ],
    editorProps: {
      attributes: {
        class: "tiptap outline-none min-h-full px-12 py-10 max-w-4xl mx-auto prose dark:prose-invert prose-sm sm:prose-base focus:outline-none",
        spellcheck: "false",
      },
    },
    content: note?.content ? tryParseJSON(note.content) : "",
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const json = JSON.stringify(editor.getJSON());
        const text = editor.getText();
        const title = extractTitle(editor.getJSON());
        updateNote(noteId, { content: json, content_text: text, title });
      }, 500);
    },
  });

  /* ── Voice dictation ── */
  const stopRecording = () => {
    try { recognitionRef.current?.stop(); } catch {}
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) return stopRecording();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported."); return; }
    const recognition = new SR();
    recognition.continuous = true; recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    let fullTranscript = "";
    const resetSilence = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => { try { recognition.stop(); } catch {} }, 2000);
    };
    recognition.onstart = () => { setIsRecording(true); setLiveTranscript(""); resetSilence(); };
    recognition.onresult = (event: any) => {
      fullTranscript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setLiveTranscript(fullTranscript); resetSilence();
    };
    recognition.onerror = () => stopRecording();
    recognition.onend = async () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsRecording(false); setLiveTranscript("");
      if (fullTranscript.trim()) {
        try { setIsProcessing(true);
          await sendMessage(`Convert this voice dictation into a beautifully formatted note for "${note?.title}": ${fullTranscript}`, true);
        } finally { setIsProcessing(false); }
      }
    };
    recognitionRef.current = recognition; recognition.start();
  };

  useEffect(() => {
    if (editor && note) {
      const currentJSON = JSON.stringify(editor.getJSON());
      if (note.content && note.content !== currentJSON) {
        const parsed = tryParseJSON(note.content);
        if (parsed) editor.commands.setContent(parsed);
      }
    }
  }, [noteId]);

  useEffect(() => () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  /* ── Slash command detection ── */
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { state, view } = editor;
      const { from } = state.selection;
      // Look back for "/" character
      const textBefore = state.doc.textBetween(Math.max(0, from - 20), from);
      const slashIdx = textBefore.lastIndexOf("/");
      if (slashIdx >= 0) {
        const afterSlash = textBefore.slice(slashIdx + 1);
        if (/^[a-zA-Z0-9]*$/.test(afterSlash)) {
          const coords = view.coordsAtPos(from - textBefore.length + slashIdx);
          const box = view.dom.getBoundingClientRect();
          setSlashMenu({ x: coords.left - box.left, y: coords.top - box.top + 24 });
          setSlashFilter(afterSlash);
          return;
        }
      }
      setSlashMenu(null); setSlashFilter("");
    };
    editor.on("update", handler); editor.on("selectionUpdate", handler);
    return () => { editor.off("update", handler); editor.off("selectionUpdate", handler); };
  }, [editor]);

  /* ── Execute a slash command ── */
  const runSlash = (id: string) => {
    if (!editor) return;
    // Delete the "/" and any filter text
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from);
    const slashIdx = textBefore.lastIndexOf("/");
    if (slashIdx >= 0) {
      const deleteFrom = from - textBefore.length + slashIdx;
      editor.commands.deleteRange({ from: deleteFrom, to: from });
    }
    setSlashMenu(null); setSlashFilter("");

    switch (id) {
      case "h1": editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case "h2": editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case "h3": editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case "bullet": editor.chain().focus().toggleBulletList().run(); break;
      case "numbered": editor.chain().focus().toggleOrderedList().run(); break;
      case "todo": editor.chain().focus().toggleTaskList().run(); break;
      case "quote": editor.chain().focus().toggleBlockquote().run(); break;
      case "code": editor.chain().focus().toggleCodeBlock().run(); break;
      case "divider": editor.chain().focus().setHorizontalRule().run(); break;
      case "table": editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
      case "emoji": setShowEmojiPicker(true); break;
      case "ai": {
        setShowAIPanel(true);
        setTimeout(() => aiInputRef.current?.focus(), 100);
        break;
      }
      case "export": setShowExportMenu(true); break;
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPromptInput.trim() || !editor) return;
    const prompt = aiPromptInput;
    setShowAIPanel(false);
    setAiPromptInput("");
    setAiGenerating(true);
    
    try {
      editor.chain().focus().insertContent(`\n*Generating: ${prompt}...*\n`).run();
      await sendMessage(`Please write content directly as beautifully formatted markdown based on this instruction: ${prompt}`, true);
    } finally {
      setAiGenerating(false);
    }
  };

  /* ── Export helpers ── */
  const downloadFile = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  };

  const exportMarkdown = () => {
    if (!editor) return;
    const md = tiptapToMarkdown(editor.getJSON());
    downloadFile(md, `${note?.title || "note"}.md`, "text/markdown");
    setShowExportMenu(false);
  };
  const exportHTML = () => {
    if (!editor) return;
    downloadFile(editor.getHTML(), `${note?.title || "note"}.html`, "text/html");
    setShowExportMenu(false);
  };
  const enableShare = async () => {
    if (!isProOrAbove) { setShowUpgrade(true); return; }
    const slug = nanoid(10);
    await updateNote(noteId, { is_public: 1, public_slug: slug });
    setShowSharePopover(true);
  };

  const disableShare = async () => {
    await updateNote(noteId, { is_public: 0, public_slug: null });
    setShowSharePopover(false);
  };

  const shareUrl = note?.public_slug
    ? `${window.location.origin}${window.location.pathname}#/share/note/${note.public_slug}`
    : "";

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const exportText = () => {
    if (!editor) return;
    downloadFile(editor.getText(), `${note?.title || "note"}.txt`, "text/plain");
    setShowExportMenu(false);
  };

  if (!editor || !note) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-bg-primary relative">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-center p-3 border-b border-border/40 backdrop-blur-md sticky top-0 z-40 gap-1.5 flex-wrap">
        <Cluster>
          <TB active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={<Bold size={15} />} tooltip="Bold" />
          <TB active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<Italic size={15} />} tooltip="Italic" />
          <TB active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} icon={<UnderlineIcon size={15} />} tooltip="Underline" />
          <TB active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} icon={<Strikethrough size={15} />} tooltip="Strikethrough" />
          <TB active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} icon={<Highlighter size={15} />} tooltip="Highlight" />
        </Cluster>
        <Cluster>
          <TB active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 size={15} />} tooltip="H1" />
          <TB active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 size={15} />} tooltip="H2" />
          <TB active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} icon={<Heading3 size={15} />} tooltip="H3" />
        </Cluster>
        <Cluster>
          <TB active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<List size={15} />} tooltip="Bullet list" />
          <TB active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={<ListOrdered size={15} />} tooltip="Numbered list" />
          <TB active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} icon={<ListChecks size={15} />} tooltip="Checklist" />
        </Cluster>
        <Cluster>
          <TB active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} icon={<Quote size={15} />} tooltip="Quote" />
          <TB active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon={<Code2 size={15} />} tooltip="Code block" />
          <TB active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={<Minus size={15} />} tooltip="Divider" />
        </Cluster>
        <Cluster>
          <TB active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} icon={<AlignLeft size={15} />} tooltip="Align left" />
          <TB active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} icon={<AlignCenter size={15} />} tooltip="Align center" />
          <TB active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} icon={<AlignRight size={15} />} tooltip="Align right" />
        </Cluster>
        <Cluster>
          <TB active={false} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} icon={<TableIcon size={15} />} tooltip="Insert table" />
          <TB active={showEmojiPicker} onClick={() => setShowEmojiPicker(!showEmojiPicker)} icon={<Smile size={15} />} tooltip="Emoji" />
          <TB active={isRecording} onClick={toggleRecording} icon={<Mic size={15} />} tooltip="Voice dictation" danger={isRecording} />
        </Cluster>

        {/* Export button */}
        <div className="relative">
          <Cluster>
            <TB active={showExportMenu} onClick={() => setShowExportMenu(!showExportMenu)} icon={<Download size={15} />} tooltip="Export" />
          </Cluster>
          <AnimatePresence>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full right-0 mt-2 z-50 w-48 bg-bg-elevated border border-border-light rounded-2xl shadow-2xl p-1.5">
                  <button onClick={exportMarkdown} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-left">
                    <FileText size={14} className="text-text-tertiary" /> Markdown (.md)
                  </button>
                  <button onClick={exportHTML} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-left">
                    <FileCode size={14} className="text-text-tertiary" /> HTML (.html)
                  </button>
                  <button onClick={exportText} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-left">
                    <Type size={14} className="text-text-tertiary" /> Plain Text (.txt)
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Share button */}
        <div className="relative ml-auto">
          <Cluster>
            <TB
              active={!!note?.is_public}
              onClick={() => note?.is_public ? setShowSharePopover(v => !v) : enableShare()}
              icon={<Share2 size={15} />}
              tooltip={note?.is_public ? "Shared — manage" : "Share note"}
            />
          </Cluster>
          <AnimatePresence>
            {showSharePopover && note?.is_public && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSharePopover(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full right-0 mt-2 z-50 w-[280px] bg-bg-elevated border border-border-light rounded-2xl shadow-2xl p-3"
                >
                  <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe size={11} /> Public Link
                  </p>
                  <div className="flex items-center gap-1.5 mb-3">
                    <input
                      readOnly value={shareUrl}
                      className="flex-1 text-[11px] text-text-secondary bg-bg-primary px-2.5 py-1.5 rounded-lg border border-border/30 outline-none truncate"
                    />
                    <button
                      onClick={copyShareLink}
                      className="px-2.5 py-1.5 rounded-lg bg-accent text-white text-[11px] font-bold cursor-pointer hover:bg-accent/90 transition-all flex items-center gap-1"
                    >
                      {shareCopied ? <Check size={12} /> : <Copy size={12} />}
                      {shareCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <button
                    onClick={disableShare}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer text-left"
                  >
                    <EyeOff size={12} /> Revoke public link
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {showEmojiPicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
            <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
            <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-border/60">
              <Picker data={data} set="native" theme={theme === "dark" ? "dark" : "light"}
                onEmojiSelect={(emoji: any) => { editor.chain().focus().insertContent(emoji.native).run(); setShowEmojiPicker(false); }} />
            </div>
          </div>
        )}
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} feature="Public Sharing" reason="Share notes publicly with a link — available on Pro and Max plans." />

      {/* ── Editor area ── */}
      <div className="flex-1 relative overflow-y-auto bg-bg-primary">
        <EditorContent editor={editor} className="min-h-full" />

        {/* Slash command menu */}
        <AnimatePresence>
          {slashMenu && filteredCommands.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute z-50 flex flex-col gap-0.5 p-1.5 bg-bg-elevated border border-border shadow-2xl rounded-2xl min-w-[200px] max-h-[320px] overflow-y-auto"
              style={{ top: slashMenu.y, left: slashMenu.x }}>
              <p className="px-2 pb-1 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                {slashFilter ? `"${slashFilter}"` : "Slash Commands"}
              </p>
              {filteredCommands.map(cmd => (
                <button key={cmd.id} onClick={() => runSlash(cmd.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-colors text-left ${
                    cmd.accent ? "text-accent bg-accent/10 hover:bg-accent/20 font-bold" : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"}`}>
                  <cmd.icon size={15} className={cmd.accent ? "" : "text-text-tertiary"} /> {cmd.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline AI Panel */}
        <AnimatePresence>
          {showAIPanel && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, pointerEvents: "none" }}
              className="absolute z-50 flex flex-col p-2 bg-bg-elevated border border-accent/30 shadow-2xl rounded-2xl w-[400px] left-1/2 -translate-x-1/2 mt-4"
              style={{ top: slashMenu ? slashMenu.y : "20%" }}
            >
              <div className="flex items-center gap-2 relative z-10 px-2 py-1">
                <div className="w-7 h-7 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                  <Sparkles size={14} />
                </div>
                <input
                  ref={aiInputRef}
                  value={aiPromptInput}
                  onChange={(e) => setAiPromptInput(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === 'Escape') setShowAIPanel(false);
                     if (e.key === 'Enter') handleAIGenerate();
                  }}
                  placeholder="Instruct AI to write, rewrite, or summarize..."
                  className="flex-1 bg-transparent border-none outline-none text-[14px] 
                    text-text-primary placeholder:text-text-tertiary font-medium py-2"
                  disabled={aiGenerating}
                />
                <button
                  onClick={handleAIGenerate}
                  disabled={!aiPromptInput.trim() || aiGenerating}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-accent text-white 
                    disabled:opacity-50 disabled:bg-bg-secondary disabled:text-text-tertiary transition-all"
                >
                  {aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing overlay */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary/40 backdrop-blur-md">
              <div className="flex flex-col items-center gap-4 p-8 rounded-[32px] bg-bg-elevated/80 border border-border/40 shadow-2xl">
                <div className="relative">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-14 h-14 rounded-full border-2 border-accent/20 border-t-accent" />
                  <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="text-accent" size={20} /></div>
                </div>
                <p className="text-[13px] font-semibold text-text-primary tracking-tight">Formatting your thoughts…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <VoiceBadge active={isRecording} transcript={liveTranscript} onStop={stopRecording} />
    </motion.div>
  );
}

/* ── Toolbar sub-components ── */
function Cluster({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center bg-bg-secondary/50 p-1 rounded-xl border border-border/40 shadow-sm gap-0.5">{children}</div>;
}

function TB({ active, onClick, icon, tooltip, danger }: { active: boolean; onClick: () => void; icon: React.ReactNode; tooltip?: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={tooltip}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
        danger ? "bg-danger text-white animate-pulse" : active ? "bg-accent text-bg-primary shadow-sm" : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"}`}>
      {icon}
    </button>
  );
}

/* ── Helpers ── */
function tryParseJSON(str: string): object | string {
  try { return JSON.parse(str); } catch { return str || ""; }
}

function extractTitle(doc: Record<string, unknown>): string {
  const content = doc.content as Array<Record<string, unknown>> | undefined;
  if (!content) return "";
  for (const node of content) {
    if (node.type === "heading" || node.type === "paragraph") {
      const innerContent = node.content as Array<{ text?: string }> | undefined;
      if (innerContent) {
        const text = innerContent.map((c) => c.text || "").join("");
        if (text.trim()) return text.trim().slice(0, 50);
      }
    }
  }
  return "";
}

/* ── TipTap JSON → Markdown converter ── */
function tiptapToMarkdown(doc: any): string {
  if (!doc?.content) return "";
  return doc.content.map((node: any) => nodeToMd(node)).join("\n\n");
}

function nodeToMd(node: any): string {
  switch (node.type) {
    case "heading":
      return "#".repeat(node.attrs?.level || 1) + " " + inlineToMd(node.content);
    case "paragraph":
      return inlineToMd(node.content);
    case "bulletList":
      return (node.content || []).map((li: any) => "- " + inlineToMd(li.content?.[0]?.content)).join("\n");
    case "orderedList":
      return (node.content || []).map((li: any, i: number) => `${i + 1}. ` + inlineToMd(li.content?.[0]?.content)).join("\n");
    case "taskList":
      return (node.content || []).map((ti: any) => {
        const checked = ti.attrs?.checked ? "x" : " ";
        return `- [${checked}] ` + inlineToMd(ti.content?.[0]?.content);
      }).join("\n");
    case "blockquote":
      return (node.content || []).map((c: any) => "> " + nodeToMd(c)).join("\n");
    case "codeBlock":
      return "```\n" + inlineToMd(node.content) + "\n```";
    case "horizontalRule":
      return "---";
    case "table":
      return tableToMd(node);
    default:
      return inlineToMd(node.content);
  }
}

function inlineToMd(content: any[] | undefined): string {
  if (!content) return "";
  return content.map((n: any) => {
    if (n.type === "text") {
      let t = n.text || "";
      const marks = n.marks || [];
      for (const m of marks) {
        if (m.type === "bold") t = `**${t}**`;
        if (m.type === "italic") t = `*${t}*`;
        if (m.type === "strike") t = `~~${t}~~`;
        if (m.type === "code") t = "`" + t + "`";
      }
      return t;
    }
    return "";
  }).join("");
}

function tableToMd(node: any): string {
  const rows = node.content || [];
  if (rows.length === 0) return "";
  const out: string[] = [];
  rows.forEach((row: any, ri: number) => {
    const cells = (row.content || []).map((cell: any) => inlineToMd(cell.content?.[0]?.content));
    out.push("| " + cells.join(" | ") + " |");
    if (ri === 0) out.push("| " + cells.map(() => "---").join(" | ") + " |");
  });
  return out.join("\n");
}
