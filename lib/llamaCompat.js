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
            // Extract system prompt (first message if role is 'system')
            let systemPrompt = '';
            let startIdx = 0;
            if (msgs[0].role === 'system') {
                systemPrompt = msgs[0].content;
                startIdx = 1;
            }
            // Split remaining into history (all but last) and last user message
            const remaining = msgs.slice(startIdx);
            if (remaining.length === 0) {
                return { text: '', content: '' };
            }
            const lastMsg = remaining[remaining.length - 1];
            const history = remaining.slice(0, -1);
            // Convert history to JSON for C API
            // Map 'assistant' → 'model' (Gemma format)
            const historyForApi = history.map(m => ({
                role: m.role === 'assistant' ? 'model' : m.role,
                content: m.content,
            }));
            const historyJson = JSON.stringify(historyForApi);
            // Call the native completionWithMessages
            return new Promise((resolve, reject) => {
                let fullText = '';
                try {
                    native.completionWithMessages(systemPrompt, historyJson, lastMsg.content, (token, done) => {
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
