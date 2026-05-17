/**
 * OpenRouter AI client — universal cloud AI fallback.
 * Used when Ollama is unavailable or the user chooses a cloud provider.
 */
export async function callOpenRouter(
  messages: { role: string; content: string }[],
  apiKey: string,
  model = 'anthropic/claude-haiku-4-5',
  onChunk?: (text: string) => void
): Promise<string> {
  if (!apiKey) throw new Error('OpenRouter API key is required')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Delay'
    },
    body: JSON.stringify({
      model,
      messages,
      stream: !!onChunk,
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${err}`)
  }

  if (onChunk) {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') return full
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content
          if (delta) {
            full += delta
            onChunk(delta)
          }
        } catch {}
      }
    }
    return full
  } else {
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }
}

/**
 * Detect whether Ollama is running locally.
 */
export async function detectAIBackend(): Promise<'ollama' | 'openrouter'> {
  try {
    await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
    return 'ollama'
  } catch {
    return 'openrouter'
  }
}
