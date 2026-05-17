/**
 * AI backend detection — picks between local Ollama and cloud (OpenRouter).
 * Used by AIChatPage to show the active backend badge and the "Connect AI"
 * empty state when neither is available.
 */
import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

export type AIBackend = "ollama" | "cloud" | "none";

const OLLAMA_PROBE_URL = "http://localhost:11434/api/tags";

async function probeOllama(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(OLLAMA_PROBE_URL, { signal: ctrl.signal });
    clearTimeout(id);
    return r.ok;
  } catch {
    return false;
  }
}

function hasCloudKey(): boolean {
  const s = useSettingsStore.getState();
  return Boolean(
    s.api_key_openrouter ||
      s.api_key_groq ||
      s.api_key_openai ||
      s.api_key_anthropic ||
      s.api_key_deepseek ||
      s.api_key_gemini ||
      import.meta.env.VITE_OPENROUTER_API_KEY,
  );
}

export async function detectBackend(): Promise<AIBackend> {
  if (await probeOllama()) return "ollama";
  if (hasCloudKey()) return "cloud";
  return "none";
}

export function useAIBackend() {
  const [backend, setBackend] = useState<AIBackend>("none");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    detectBackend().then((b) => {
      if (alive) {
        setBackend(b);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  return { backend, loading };
}

export const CLOUD_MODEL_OPTIONS = [
  { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "openrouter" },
  { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "openrouter" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini", provider: "openrouter" },
  { id: "google/gemini-flash-1.5", label: "Gemini Flash 1.5", provider: "openrouter" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek Chat", provider: "openrouter" },
  { id: "meta-llama/llama-3.1-70b-instruct", label: "Llama 3.1 70B", provider: "openrouter" },
] as const;
