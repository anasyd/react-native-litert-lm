"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initLiteRTAsLlama = initLiteRTAsLlama;
const react_native_nitro_modules_1 = require("react-native-nitro-modules");
async function initLiteRTAsLlama(params) {
    const native = react_native_nitro_modules_1.NitroModules.createHybridObject('LiteRTLM');
    const backend = (params.n_gpu_layers ?? 0) > 0 ? 'gpu' : 'cpu';
    await native.loadModel(params.model, {
        backend,
        contextLength: params.n_ctx ?? 4096,
        maxTokens: 512,
    });
    return {
        async completion(cParams, onToken) {
            const msgs = cParams.messages;
            if (!msgs || msgs.length === 0) {
                return { text: '', content: '' };
            }
            // Build a single prompt from the messages array
            // Include system prompt and recent context as a single user message
            // This avoids the buggy completionWithMessages history pre-loading
            const parts = [];
            for (const msg of msgs) {
                if (msg.role === 'system') {
                    parts.push(`[System Instructions]\n${msg.content}\n`);
                }
                else if (msg.role === 'user') {
                    parts.push(`User: ${msg.content}`);
                }
                else if (msg.role === 'assistant') {
                    parts.push(`Assistant: ${msg.content}`);
                }
            }
            const fullPrompt = parts.join('\n');
            // Reset conversation to clear any stale state
            native.resetConversation();
            // Use sendMessageAsync with the full prompt
            return new Promise((resolve, reject) => {
                let fullText = '';
                try {
                    native.sendMessageAsync(fullPrompt, (token, done) => {
                        if (token) {
                            fullText += token;
                            if (onToken) {
                                onToken({ token });
                            }
                        }
                        if (done) {
                            resolve({ text: fullText, content: fullText });
                        }
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        },
        async release() {
            native.close();
        },
    };
}
