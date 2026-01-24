import { NitroModules } from "react-native-nitro-modules";
import { Platform } from "react-native";
import type {
  LiteRTLM,
  LLMConfig,
  Message,
  Backend,
  Role,
  GenerationStats,
} from "./specs/LiteRTLM.nitro";

export type {
  LiteRTLM,
  LLMConfig,
  Message,
  Backend,
  Role,
  GenerationStats,
} from "./specs/LiteRTLM.nitro";

/**
 * Creates a new LiteRT-LM inference engine instance.
 *
 * @example
 * ```typescript
 * import { createLLM } from 'react-native-litert-lm';
 *
 * // Basic usage with Gemma 3n
 * const llm = createLLM();
 * llm.loadModel('/path/to/gemma-3n-e2b.litertlm', {
 *   backend: 'gpu',
 *   temperature: 0.7,
 *   maxTokens: 512
 * });
 *
 * // Simple text generation
 * const response = llm.sendMessage('Hello, how are you?');
 * console.log(response);
 *
 * // Streaming generation
 * llm.sendMessageAsync('Tell me about React Native', (token, done) => {
 *   process.stdout.write(token);
 *   if (done) console.log('\n--- Done ---');
 * });
 *
 * // Check stats
 * const stats = llm.getStats();
 * console.log(`Generated at ${stats.tokensPerSecond} tokens/sec`);
 *
 * // Cleanup
 * llm.close();
 * ```
 */
export function createLLM(): LiteRTLM {
  return NitroModules.createHybridObject<LiteRTLM>("LiteRTLM");
}

/**
 * Pre-defined model identifiers for common models.
 * Use with model download utilities or as reference.
 */
export const Models = {
  /** Gemma 3n E2B (2B parameters, efficient) */
  GEMMA_3N_E2B: "gemma-3n-E2B-it-litert-lm-preview",
  /** Gemma 3n E4B (4B parameters, higher quality) */
  GEMMA_3N_E4B: "gemma-3n-E4B-it-litert-lm-preview",
  /** Gemma 3 1B (smallest Gemma) */
  GEMMA_3_1B: "Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096",
  /** Phi-4 Mini Instruct */
  PHI_4_MINI: "Phi-4-mini-instruct_multi-prefill-seq_q8_ekv4096",
  /** Qwen 2.5 1.5B Instruct */
  QWEN_2_5_1_5B: "Qwen2.5-1.5B-Instruct_multi-prefill-seq_q8_ekv4096",
} as const;

export type ModelId = (typeof Models)[keyof typeof Models];

/**
 * Get the recommended backend for the current platform.
 * Returns 'gpu' for most devices as it provides the best balance of speed and compatibility.
 *
 * @returns The recommended backend ('gpu' for most cases)
 *
 * @example
 * ```typescript
 * const backend = getRecommendedBackend();
 * llm.loadModel(path, { backend });
 * ```
 */
export function getRecommendedBackend(): Backend {
  // GPU is the recommended default for all platforms
  // It provides good performance and broad compatibility
  return "gpu";
}

/**
 * Check if a backend configuration is supported on the current platform.
 * Returns a warning message if the configuration may have issues.
 *
 * @param backend The backend to check
 * @returns Warning message if there may be issues, undefined if OK
 *
 * @example
 * ```typescript
 * const warning = checkBackendSupport('npu');
 * if (warning) {
 *   console.warn(warning);
 * }
 * ```
 */
export function checkBackendSupport(backend: Backend): string | undefined {
  if (backend === "npu") {
    if (Platform.OS === "android") {
      return "NPU backend requires compatible hardware (Qualcomm Hexagon, MediaTek APU, etc.). Will fall back to GPU if unavailable.";
    }
    if (Platform.OS === "ios") {
      return "NPU/CoreML is not yet supported on iOS. LiteRT-LM iOS support is pending.";
    }
  }

  if (Platform.OS === "ios" && backend !== "cpu") {
    return "LiteRT-LM iOS is not yet released. Only CPU backend may work via fallback.";
  }

  return undefined;
}
