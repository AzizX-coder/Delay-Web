import { create } from "zustand";
import { db, generateId, now } from "@/lib/database";
import { streamChat } from "@/lib/ollama";
import { processAgentRequest } from "@/lib/agent";
import type { AIConversation, AIMessage } from "@/types/ai";

interface AIState {
  conversations: AIConversation[];
  activeConversationId: string | null;
  messages: AIMessage[];
  isStreaming: boolean;
  streamingContent: string;
  model: string;
  mode: "chat" | "agent";
  loading: boolean;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  createConversation: () => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  sendMessage: (content: string, useAgent?: boolean) => Promise<void>;
  setModel: (model: string) => void;
  setMode: (mode: "chat" | "agent") => void;
  stopStreaming: () => void;
}

let abortController: AbortController | null = null;

export const useAIStore = create<AIState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  model: "glm-5:cloud",
  mode: "agent",
  loading: true,

  loadConversations: async () => {
    try {
      const convos = await db.aiConversations.orderBy("updated_at").reverse().toArray();
      set({ conversations: convos, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMessages: async (conversationId) => {
    try {
      const messages = await db.aiMessages
        .where("conversation_id")
        .equals(conversationId)
        .sortBy("created_at");
      const conversation = get().conversations.find(c => c.id === conversationId);
      set({ 
        messages, 
        activeConversationId: conversationId,
        mode: conversation?.mode || "agent"
      });
    } catch {
      // silent
    }
  },

  createConversation: async () => {
    const id = generateId();
    const timestamp = now();
    const { model, mode } = get();
    const convo: AIConversation = {
      id,
      title: "New Chat",
      model,
      mode,
      created_at: timestamp,
      updated_at: timestamp,
    };

    set((state) => ({
      conversations: [convo, ...state.conversations],
      activeConversationId: id,
      messages: [],
    }));

    try {
      await db.aiConversations.add(convo);
    } catch {
      // silent
    }
    return id;
  },

  deleteConversation: async (id) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
      messages: state.activeConversationId === id ? [] : state.messages,
    }));

    try {
      await db.aiMessages.where("conversation_id").equals(id).delete();
      await db.aiConversations.delete(id);
    } catch {
      // silent
    }
  },

  setActiveConversation: (id) => {
    if (!id) {
      set({ activeConversationId: null, messages: [] });
      return;
    }
    get().loadMessages(id);
  },

  sendMessage: async (content, useAgent = false) => {
    const { activeConversationId, messages, model } = get();
    let convoId = activeConversationId;

    if (!convoId) {
      convoId = await get().createConversation();
    }

    // Determine actual user content (strip prefix from UI)
    const prefix = "[AGENT MODE] You are Delay Agent. You can create notes, tasks, and help the user organize. Respond with structured, clear answers. ";
    const isAgentFromPrefix = content.startsWith(prefix);
    const actualContent = isAgentFromPrefix ? content.slice(prefix.length) : content;
    const isAgentMode = useAgent || isAgentFromPrefix;

    const userMsg: AIMessage = {
      id: generateId(),
      conversation_id: convoId,
      role: "user",
      content: actualContent,
      created_at: now(),
    };

    const updatedMessages = [...messages, userMsg];
    set({ messages: updatedMessages, isStreaming: true, streamingContent: "" });

    try {
      await db.aiMessages.add(userMsg);

      // Update conversation title from first message
      if (updatedMessages.filter((m) => m.role === "user").length === 1) {
        const title = actualContent.slice(0, 50) + (actualContent.length > 50 ? "..." : "");
        await db.aiConversations.update(convoId, { title, updated_at: now() });
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convoId ? { ...c, title } : c
          ),
        }));
      }
    } catch {
      // silent
    }

    let fullContent = "";
    let fullThoughts = "";
    abortController = new AbortController();

    try {
      if (isAgentMode) {
        // Run agent loop
        await processAgentRequest(
          actualContent,
          (chunk, thoughtChunk) => {
            if (abortController?.signal.aborted) return;
            if (chunk) {
              fullContent += chunk;
              set({ streamingContent: fullContent });
            }
            if (thoughtChunk) {
              fullThoughts += thoughtChunk;
              // We'll store thoughts in state if needed, or just append to the message at the end
            }
          },
          async (prompt, onV) => {
            const chatMessages = [
              ...updatedMessages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user" as const, content: prompt }
            ];
            let reasoning = "";
            for await (const token of streamChat(model, chatMessages)) {
              if (abortController?.signal.aborted) throw new Error("Aborted");
              onV(token);
              reasoning += token;
            }
            return reasoning;
          }
        );
      } else {
        // Standard chat - force "ChatGPT" style (no complexity)
        const chatMessages = [
          { role: "system", content: "You are a helpful AI assistant. Keep your responses clear and concise. Use standard text formatting. Avoid using tables or complex structures unless absolutely necessary." },
          ...updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }))
        ];

        for await (const token of streamChat(model, chatMessages)) {
          if (abortController?.signal.aborted) break;
          fullContent += token;
          set({ streamingContent: fullContent });
        }
      }

      const assistantMsg: AIMessage = {
        id: generateId(),
        conversation_id: convoId,
        role: "assistant",
        content: fullContent,
        thoughts: fullThoughts || undefined,
        created_at: now(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isStreaming: false,
        streamingContent: "",
      }));

      await db.aiMessages.add(assistantMsg);
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Failed to get response";
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: generateId(),
            conversation_id: convoId!,
            role: "assistant" as const,
            content: `Error: ${errMsg}. Make sure Ollama is running.`,
            created_at: now(),
          },
        ],
        isStreaming: false,
        streamingContent: "",
      }));
    }
  },

  setModel: (model) => set({ model }),

  setMode: (mode) => {
    const { activeConversationId } = get();
    set({ mode });
    if (activeConversationId) {
      db.aiConversations.update(activeConversationId, { mode });
      set(state => ({
        conversations: state.conversations.map(c => c.id === activeConversationId ? { ...c, mode } : c)
      }));
    }
  },

  stopStreaming: async () => {
    abortController?.abort();
    const { streamingContent, activeConversationId } = get();
    if (streamingContent && activeConversationId) {
      const assistantMsg: AIMessage = {
        id: generateId(),
        conversation_id: activeConversationId,
        role: "assistant",
        content: streamingContent,
        created_at: now(),
      };
      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isStreaming: false,
        streamingContent: "",
      }));
      try {
        await db.aiMessages.add(assistantMsg);
      } catch {
        // silent
      }
    } else {
      set({ isStreaming: false, streamingContent: "" });
    }
  },
}));
