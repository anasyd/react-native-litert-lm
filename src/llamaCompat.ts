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

      // Build a single prompt from the messages array
      // Include system prompt and recent context as a single user message
      // This avoids the buggy completionWithMessages history pre-loading
      const parts: string[] = []
      for (const msg of msgs) {
        if (msg.role === 'system') {
          parts.push(`[System Instructions]\n${msg.content}\n`)
        } else if (msg.role === 'user') {
          parts.push(`User: ${msg.content}`)
        } else if (msg.role === 'assistant') {
          parts.push(`Assistant: ${msg.content}`)
        }
      }
      const fullPrompt = parts.join('\n')

      // Reset conversation to clear any stale state
      native.resetConversation()

      // Use sendMessageAsync with the full prompt
      return new Promise<CompletionResult>((resolve, reject) => {
        let fullText = ''
        try {
          native.sendMessageAsync(fullPrompt, (token: string, done: boolean) => {
            if (token) {
              fullText += token
              if (onToken) {
                onToken({ token })
              }
            }
            if (done) {
              resolve({ text: fullText, content: fullText })
            }
          })
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
