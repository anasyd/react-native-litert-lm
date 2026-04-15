/**
 * llama.rn Compatibility Layer for LiteRT-LM
 *
 * Provides an API matching llama.rn's initLlama/context.completion interface
 * so apps can switch from llama.rn to LiteRT-LM with minimal code changes.
 *
 * Usage:
 *   import { initLiteRTAsLlama } from 'react-native-litert-lm/llamaCompat'
 *   const context = await initLiteRTAsLlama({ model: '/path/to/model.litertlm', n_ctx: 4096 })
 *   const result = await context.completion({ messages, n_predict: 512 }, onToken)
 *   await context.release()
 */

import { NitroModules } from 'react-native-nitro-modules'
import type { LiteRTLM } from './specs/LiteRTLM.nitro'

/**
 * Extract plain text from LiteRT-LM streaming JSON chunks.
 * The C API returns fragments like:
 *   {"role":"assistant","content":[{"type":"text","text":"Hello"}]}
 * We accumulate a JSON buffer and try to extract text values.
 */
function extractTextFromChunk(chunk: string, buffer: string): { text: string; buffer: string } {
  // If the chunk looks like plain text (no JSON structure), return as-is
  if (!chunk.includes('"role"') && !chunk.includes('"type"') && !chunk.includes('"text"')) {
    return { text: chunk, buffer: '' }
  }

  // Accumulate JSON fragments
  buffer += chunk

  // Try to extract "text":"..." values from complete JSON objects
  let extracted = ''
  const textPattern = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g
  let match
  while ((match = textPattern.exec(buffer)) !== null) {
    const val = match[1]
    // Skip structural values like "text" as a type identifier
    if (val !== 'text' && val !== 'assistant' && val !== 'model') {
      extracted += val.replace(/\\n/g, '\n').replace(/\\"/g, '"')
    }
  }

  // If we found complete JSON objects, clear the buffer
  if (buffer.includes('}]}')) {
    buffer = ''
  }

  return { text: extracted, buffer }
}

interface CompletionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface CompletionParams {
  messages: CompletionMessage[]
  n_predict?: number
  temperature?: number
  stop?: string[]
}

interface CompletionResult {
  text: string
  content: string
}

interface TokenCallback {
  (data: { token: string; content?: string }): void
}

export interface LlamaCompatContext {
  completion(
    params: CompletionParams,
    onToken?: TokenCallback,
  ): Promise<CompletionResult>
  release(): Promise<void>
}

export async function initLiteRTAsLlama(params: {
  model: string
  n_ctx?: number
  n_gpu_layers?: number
  use_mlock?: boolean
}): Promise<LlamaCompatContext> {
  const native = NitroModules.createHybridObject<LiteRTLM>('LiteRTLM')

  const backend = (params.n_gpu_layers ?? 0) > 0 ? 'gpu' as const : 'cpu' as const

  await native.loadModel(params.model, {
    backend,
    contextLength: params.n_ctx ?? 4096,
    maxTokens: 512,
  })

  return {
    async completion(cParams: CompletionParams, onToken?: TokenCallback): Promise<CompletionResult> {
      const msgs = cParams.messages
      if (!msgs || msgs.length === 0) {
        return { text: '', content: '' }
      }

      // Extract system prompt (first message if role is 'system')
      let systemPrompt = ''
      let startIdx = 0
      if (msgs[0].role === 'system') {
        systemPrompt = msgs[0].content
        startIdx = 1
      }

      // Split remaining into history (all but last) and last user message
      const remaining = msgs.slice(startIdx)
      if (remaining.length === 0) {
        return { text: '', content: '' }
      }

      const lastMsg = remaining[remaining.length - 1]
      const history = remaining.slice(0, -1)

      // Convert history to JSON for C API
      // Map 'assistant' → 'model' (Gemma format)
      const historyForApi = history.map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        content: m.content,
      }))
      const historyJson = JSON.stringify(historyForApi)

      // Call the native completionWithMessages
      // The C API streams JSON chunks like {"role":"assistant","content":[{"type":"text","text":"H"}]}
      // We need to extract just the text portion and accumulate it
      return new Promise<CompletionResult>((resolve, reject) => {
        let fullText = ''
        let jsonBuffer = ''
        try {
          native.completionWithMessages(
            systemPrompt,
            historyJson,
            lastMsg.content,
            (token: string, done: boolean) => {
              if (token) {
                // Try to extract text from JSON chunk
                const extracted = extractTextFromChunk(token, jsonBuffer)
                jsonBuffer = extracted.buffer
                if (extracted.text) {
                  fullText += extracted.text
                  if (onToken) {
                    onToken({ token: extracted.text })
                  }
                }
              }
              if (done) {
                resolve({ text: fullText, content: fullText })
              }
            }
          )
        } catch (e) {
          reject(e)
        }
      })
    },

    async release(): Promise<void> {
      native.close()
    },
  }
}
