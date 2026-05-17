import type { OllamaModel } from "@/types/ai";
import { useSettingsStore } from "@/stores/settingsStore";

const OLLAMA_BASE = "http://localhost:11434";

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const res = await fetch(OLLAMA_BASE, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listOllamaModels(): Promise<OllamaModel[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.models || [];
  } catch {
    return [];
  }
}

export async function* streamChat(
  model: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<string, void, unknown> {
  const settings = useSettingsStore.getState();
  const provider = settings.ai_provider || "ollama";
  const actualModel = settings.ai_model || model;

  if (provider === "ollama") {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: actualModel,
        messages,
        stream: true,
        options: { temperature: 0.4, top_p: 0.9, num_ctx: 4096 },
      }),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) yield parsed.message.content;
        } catch {}
      }
    }
    return;
  }

  // Common OpenAI-compatible stream handler
  let endpoint = "";
  let apiKey = "";
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  let body: any = { model: actualModel, messages, stream: true, temperature: 0.4 };

  if (provider === "openrouter") {
    endpoint = "https://openrouter.ai/api/v1/chat/completions";
    apiKey = settings.api_key_openrouter;
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["HTTP-Referer"] = "http://localhost:5173";
    headers["X-Title"] = "Delay Agentic IDE";
  } else if (provider === "groq") {
    endpoint = "https://api.groq.com/openai/v1/chat/completions";
    apiKey = settings.api_key_groq;
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (provider === "openai") {
    endpoint = "https://api.openai.com/v1/chat/completions";
    apiKey = settings.api_key_openai;
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (provider === "deepseek") {
    endpoint = "https://api.deepseek.com/chat/completions";
    apiKey = settings.api_key_deepseek;
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (provider === "gemini") {
    // Using Gemini's new OpenAI compat endpoint
    endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    apiKey = settings.api_key_gemini;
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (provider === "anthropic") {
    // Anthropic Messages API is different.
    endpoint = "https://api.anthropic.com/v1/messages";
    apiKey = settings.api_key_anthropic;
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
    
    // Extract system message
    const systemMsgs = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
    const otherMsgs = messages.filter(m => m.role !== "system");
    
    body = {
      model: actualModel,
      max_tokens: 4096,
      messages: otherMsgs,
      system: systemMsgs || undefined,
      stream: true
    };
  }

  if (!apiKey) {
    yield `[Error] No API Key provided for ${provider}. Please configure it in Settings.`;
    return;
  }

  try {
    const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const errText = await res.text();
      yield `[Error] ${res.status} ${res.statusText} - ${errText}`;
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim() || line.includes("[DONE]")) continue;
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (provider === "anthropic") {
              if (data.type === "content_block_delta" && data.delta?.text) {
                yield data.delta.text;
              }
            } else {
              if (data.choices?.[0]?.delta?.content) {
                yield data.choices[0].delta.content;
              }
            }
          } catch {}
        }
      }
    }
  } catch (error: any) {
    yield `[Network Error] Failed to connect to ${provider}: ${error.message}`;
  }
}
