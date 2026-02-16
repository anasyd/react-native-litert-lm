import { NitroModules } from "react-native-nitro-modules";
import { LiteRTLM, LLMConfig } from "./specs/LiteRTLM.nitro";

/**
 * Creates a new LiteRT-LM inference engine instance.
 */
export function createLLM(): LiteRTLM {
  const native = NitroModules.createHybridObject<LiteRTLM>("LiteRTLM");

  return {
    ...native,
    loadModel: async (pathOrUrl: string, config?: LLMConfig) => {
      let modelPath = pathOrUrl;

      // Check if it's a URL
      if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
        // Extract filename from URL
        const fileName = pathOrUrl.split("/").pop();
        if (!fileName) {
          throw new Error(`Invalid model URL: ${pathOrUrl}`);
        }

        console.log(`Checking model at ${pathOrUrl}...`);
        modelPath = await native.downloadModel(
          pathOrUrl,
          fileName,
          (progress) => {
            console.log(`Download progress: ${progress}`);
          },
        );
        console.log(`Model downloaded to: ${modelPath}`);
      }

      return native.loadModel(modelPath, config);
    },
    // Bind valid methods to native instance
    sendMessage: native.sendMessage.bind(native),
    sendMessageAsync: native.sendMessageAsync.bind(native),
    sendMessageWithImage: native.sendMessageWithImage.bind(native),
    sendMessageWithAudio: native.sendMessageWithAudio.bind(native),
    getHistory: native.getHistory.bind(native),
    resetConversation: native.resetConversation.bind(native),
    isReady: native.isReady.bind(native),
    getStats: native.getStats.bind(native),
    close: native.close.bind(native),
    downloadModel: native.downloadModel.bind(native),
    deleteModel: native.deleteModel.bind(native),
  };
}
