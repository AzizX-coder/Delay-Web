import { useEffect, useState, useRef } from "react";
import { useAIStore } from "@/stores/aiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { listOllamaModels, checkOllamaStatus } from "@/lib/ollama";
import { useAIBackend } from "./aiBackend";
import { useThemeStore } from "@/stores/themeStore";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Send,
  Square,
  User,
  Trash2,
  ChevronDown,
  Wifi,
  WifiOff,
  MessageSquare,
  Mic,
  Sparkles,
  Zap,
  Smile,
  ChevronRight,
  Brain,
} from "lucide-react";
import type { OllamaModel, AIMessage } from "@/types/ai";
import { AgentMessage } from "./AgentMessage";
import { VoiceBadge } from "@/components/ui/VoiceBadge";
import { useT } from "@/lib/i18n";

// Gemini-style 4-pointed star icon
function GeminiStar({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AIChatPage() {
  const {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    streamingContent,
    model,
    mode,
    loadConversations,
    createConversation,
    deleteConversation,
    setActiveConversation,
    sendMessage,
    setModel,
    setMode,
    stopStreaming,
  } = useAIStore();
  const { theme } = useThemeStore();
  const t = useT();

  const [input, setInput] = useState("");
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { backend } = useAIBackend();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadConversations();
    checkOllamaStatus().then(setOllamaOnline);
    listOllamaModels().then(setModels);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim(), mode === "agent");
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "48px";
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stopVoice = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setIsRecording(false);
  };

  const toggleVoiceRecord = () => {
    if (isRecording) return stopVoice();

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    let transcript = "";
    const resetSilence = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {}
      }, 2000);
    };

    recognition.onstart = () => {
      setIsRecording(true);
      setLiveTranscript("");
      resetSilence();
    };
    recognition.onresult = (event: any) => {
      transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
      setLiveTranscript(transcript);
      resetSilence();
    };
    recognition.onerror = () => stopVoice();
    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsRecording(false);
      setLiveTranscript("");
      if (transcript.trim()) setInput(transcript.trim());
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  return (
    <div className="flex h-full bg-bg-primary relative">
      <VoiceBadge
        active={isRecording}
        transcript={liveTranscript}
        onStop={stopVoice}
        onSend={(text) => {
          stopVoice();
          setInput("");
          sendMessage(text, mode === "agent");
        }}
      />
      {/* Conversations sidebar */}
      <div className="w-64 h-full flex flex-col border-r border-border/40 bg-bg-secondary/40 backdrop-blur-md">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold text-text-primary tracking-tight">
              Intelligence
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={createConversation}
              className="w-8 h-8 flex items-center justify-center rounded-xl
                bg-accent text-bg-primary shadow-lg shadow-accent/20 cursor-pointer
                hover:opacity-90 transition-all"
            >
              <Plus size={18} />
            </motion.button>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium border
              ${backend === "ollama"
                  ? "bg-bg-primary/50 text-success border-success/20"
                  : backend === "cloud"
                  ? "bg-accent/8 text-accent border-accent/20"
                  : "bg-warning/5 text-warning border-warning/20"
              }`}
            title={backend === "none" ? "Add an API key in Settings to enable cloud AI, or install Ollama for local AI" : undefined}
          >
            <div className={`w-2 h-2 rounded-full ${backend === "ollama" ? "bg-success animate-pulse" : backend === "cloud" ? "bg-accent animate-pulse" : "bg-warning"}`} />
            {backend === "ollama" ? "Ollama · Local" : backend === "cloud" ? "Cloud AI" : "Not configured"}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          <AnimatePresence mode="popLayout">
            {conversations.map((convo) => (
              <motion.div
                key={convo.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => setActiveConversation(convo.id)}
                className={`group flex items-center gap-2.5 px-3 py-2.5 
                  rounded-xl cursor-pointer transition-all duration-200
                  ${activeConversationId === convo.id
                      ? "bg-accent/10 text-accent shadow-sm"
                      : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }`}
              >
                {convo.mode === "agent" ? <Zap size={14} className="shrink-0" /> : <MessageSquare size={14} className="shrink-0" />}
                <span className="text-[13px] font-medium truncate flex-1">
                  {convo.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(convo.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6
                    rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header with Mode Switcher */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-border/40 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center bg-bg-secondary/50 p-1 rounded-xl border border-border/30">
            <button
              onClick={() => setMode("chat")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer
                ${mode === "chat" ? "bg-bg-primary text-text-primary shadow-sm" : "text-text-tertiary hover:text-text-secondary"}`}
            >
              <MessageSquare size={14} />
              Chat
            </button>
            <button
              onClick={() => setMode("agent")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer
                ${mode === "agent" ? "bg-accent text-bg-primary shadow-sm" : "text-text-tertiary hover:text-text-secondary"}`}
            >
              <Zap size={14} />
              Agent
            </button>
          </div>

          <div className="h-6 w-px bg-border/40 mx-2" />

          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                bg-bg-secondary/50 border border-border/30 text-[12px] font-bold
                text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all cursor-pointer"
            >
              {model}
              <ChevronDown size={14} />
            </button>
            {showModelPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowModelPicker(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute top-full left-0 mt-2 w-72 max-h-64 overflow-y-auto
                    bg-bg-elevated border border-border/60 rounded-2xl shadow-2xl z-50 p-1.5 backdrop-blur-xl"
                >
                  {models.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => {
                        setModel(m.name);
                        setShowModelPicker(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-medium
                        transition-all cursor-pointer
                        ${model === m.name ? "bg-accent text-bg-primary" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"}`}
                    >
                      {m.name}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
          {messages.length === 0 && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-[32px] bg-gradient-to-tr from-accent to-accent/40 flex items-center justify-center mb-6 shadow-2xl shadow-accent/20"
              >
                <GeminiStar size={40} className="text-bg-primary" />
              </motion.div>
              <h2 className="text-[24px] font-bold text-text-primary tracking-tight mb-2 text-center">
                {t("chat.agent_title")}{" "}
                {mode === "agent" ? "Agent" : "Assistant"}
              </h2>
              <p className="text-[14px] text-text-tertiary text-center max-w-sm mb-8">
                {mode === "agent"
                  ? t("chat.agent_sub_agent")
                  : t("chat.agent_sub_chat")}
              </p>
            </div>
          ) : (
            <div className="space-y-8 max-w-4xl mx-auto">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} msg={msg} />
              ))}

              {isStreaming && streamingContent && (
                <ChatMessage 
                  msg={{ 
                    id: "streaming", 
                    role: "assistant", 
                    content: streamingContent, 
                    conversation_id: "", 
                    created_at: 0 
                  }} 
                  isStreaming={true} 
                />
              )}

              {isStreaming && !streamingContent && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center animate-pulse">
                    <Brain size={16} className="text-accent" />
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-bg-secondary/40 rounded-2xl border border-border/20">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">{t("chat.thinking")}</span>
                    <div className="flex gap-1">
                      {[0,1,2].map(i => <div key={i} className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Floating Input area */}
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <div className="relative p-1.5 rounded-[24px] bg-bg-secondary/80 backdrop-blur-xl border border-border/40 shadow-2xl transition-all duration-300 focus-within:border-accent/40 focus-within:ring-4 focus-within:ring-accent/5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording
                    ? t("chat.speak_now")
                    : `${t("chat.placeholder")} ${mode}…`
                }
                rows={1}
                className="w-full resize-none p-4 pr-32 bg-transparent text-[15px] font-medium text-text-primary placeholder:text-text-tertiary outline-none max-h-48"
                style={{ height: "48px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 192) + "px";
                }}
              />
              
              <div className="absolute right-3.5 bottom-3.5 flex items-center gap-2">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer
                    ${showEmojiPicker ? "bg-accent/10 text-accent" : "text-text-tertiary hover:bg-bg-hover hover:text-text-primary"}`}
                >
                  <Smile size={20} />
                </button>

                <button
                  onClick={toggleVoiceRecord}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer
                    ${isRecording ? "bg-danger/10 text-danger" : "bg-bg-hover text-text-tertiary hover:text-text-primary"}`}
                >
                  <Mic size={18} />
                </button>

                <button
                  onClick={isStreaming ? stopStreaming : handleSend}
                  disabled={!isStreaming && !input.trim()}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-lg cursor-pointer
                    ${isStreaming ? "bg-danger text-white" : "bg-accent text-bg-primary"}`}
                >
                  {isStreaming ? <Square size={16} fill="white" /> : <Send size={18} />}
                </button>
              </div>

              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-4 z-50">
                  <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                  <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-border/60">
                    <Picker
                      data={data}
                      set="native"
                      theme={theme === "dark" ? "dark" : "light"}
                      onEmojiSelect={(emoji: any) => {
                        setInput(prev => prev + emoji.native);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ msg, isStreaming = false }: { msg: Partial<AIMessage>; isStreaming?: boolean }) {
  const [expandedThoughts, setExpandedThoughts] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
    >
      <div className={`w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center text-bg-primary shadow-lg overflow-hidden
        ${msg.role === "user" ? "bg-text-secondary" : "bg-gradient-to-br from-accent to-accent/40"}`}>
        {msg.role === "user" ? <User size={18} /> : <GeminiStar size={20} />}
      </div>

      <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : ""}`}>
        {/* Thoughts (Glubs) */}
        {msg.thoughts && (
          <div className="mb-2 w-full">
            <button
              onClick={() => setExpandedThoughts(!expandedThoughts)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary/40 border border-border/20 text-[11px] font-bold text-text-tertiary hover:text-text-secondary transition-all cursor-pointer"
            >
              <Brain size={12} className={expandedThoughts ? "text-accent" : ""} />
              THOUGHTS (GLUB)
              <ChevronRight size={12} className={`transition-transform duration-200 ${expandedThoughts ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {expandedThoughts && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-bg-secondary/20 border-l-2 border-accent/20 ml-4 pl-4 mt-2"
                >
                  <p className="py-2 text-[12px] text-text-tertiary leading-relaxed font-medium italic">
                    {msg.thoughts}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className={`px-5 py-4 rounded-[24px] text-[15px] leading-relaxed shadow-sm
          ${msg.role === "user"
            ? "bg-text-primary text-bg-primary rounded-tr-sm"
            : "bg-bg-secondary/60 text-text-primary border border-border/20 rounded-tl-sm backdrop-blur-sm"}`}>
          {msg.role === "assistant" ? (
            <AgentMessage content={msg.content || ""} streaming={isStreaming} />
          ) : (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

