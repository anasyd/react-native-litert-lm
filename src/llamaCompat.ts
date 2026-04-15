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

import { createLLM } from './modelFactory'
import type { LiteRTLMInstance } from './index'

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
  const llm = createLLM()

  const backend = (params.n_gpu_layers ?? 0) > 0 ? 'gpu' as const : 'cpu' as const

  await llm.loadModel(params.model, {
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
      return new Promise<CompletionResult>((resolve, reject) => {
        let fullText = ''
        try {
          ;(llm as any).completionWithMessages(
            systemPrompt,
            historyJson,
            lastMsg.content,
            (token: string, done: boolean) => {
              if (token) {
                fullText += token
                if (onToken) {
                  onToken({ token })
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
      llm.close()
    },
  }
}
