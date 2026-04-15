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
interface CompletionMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
interface CompletionParams {
    messages: CompletionMessage[];
    n_predict?: number;
    temperature?: number;
    stop?: string[];
}
interface CompletionResult {
    text: string;
    content: string;
}
interface TokenCallback {
    (data: {
        token: string;
        content?: string;
    }): void;
}
export interface LlamaCompatContext {
    completion(params: CompletionParams, onToken?: TokenCallback): Promise<CompletionResult>;
    release(): Promise<void>;
}
export declare function initLiteRTAsLlama(params: {
    model: string;
    n_ctx?: number;
    n_gpu_layers?: number;
    use_mlock?: boolean;
}): Promise<LlamaCompatContext>;
export {};
