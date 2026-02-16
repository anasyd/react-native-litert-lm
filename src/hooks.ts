import { useState, useEffect, useRef, useCallback } from "react";
import { LiteRTLM, LLMConfig } from "./index";
import { createLLM } from "./modelFactory";

export interface UseModelConfig extends LLMConfig {
  autoLoad?: boolean;
}

export interface UseModelResult {
  model: LiteRTLM | null;
  isReady: boolean;
  isGenerating: boolean;
  downloadProgress: number;
  error: string | null;
  generate: (prompt: string) => Promise<string>;
  reset: () => void;
  deleteModel: (fileName: string) => Promise<void>;
  load: () => Promise<void>;
}

export function useModel(
  pathOrUrl: string,
  config?: UseModelConfig,
): UseModelResult {
  const modelRef = useRef<LiteRTLM | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Extract autoLoad (default true)
  const autoLoad = config?.autoLoad ?? true;

  // Initialize the model instance
  useEffect(() => {
    modelRef.current = createLLM();
    let isMounted = true;

    // Cleanup on unmount
    return () => {
      isMounted = false;
      try {
        modelRef.current?.close();
      } catch (e) {
        console.warn("Failed to close model", e);
      }
    };
  }, []);

  const load = useCallback(async () => {
    setIsReady(false);
    setError(null);
    setDownloadProgress(0);

    try {
      let modelPath = pathOrUrl;

      // Handle URL download manually to capture progress
      if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
        const fileName = pathOrUrl.split("/").pop() || "model.bin";

        if (modelRef.current) {
          modelPath = await modelRef.current.downloadModel(
            pathOrUrl,
            fileName,
            (progress) => {
              setDownloadProgress(progress);
            },
          );
        }
      }

      if (modelRef.current) {
        // Create a clean config object for native loadModel (excluding autoLoad)
        const nativeConfig: LLMConfig = { ...config };
        delete (nativeConfig as any).autoLoad;

        await modelRef.current.loadModel(modelPath, nativeConfig);
        setIsReady(true);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load model");
      console.error(e);
    }
  }, [pathOrUrl, config]);

  useEffect(() => {
    if (autoLoad) {
      load();
    }
  }, [autoLoad, load]);

  const generate = useCallback(
    async (prompt: string): Promise<string> => {
      if (!modelRef.current || !isReady) {
        throw new Error("Model not ready");
      }

      setIsGenerating(true);
      try {
        return new Promise<string>((resolve, reject) => {
          let fullResponse = "";
          try {
            modelRef.current?.sendMessageAsync(
              prompt,
              (token: string, done: boolean) => {
                fullResponse += token;
                if (done) {
                  resolve(fullResponse);
                }
              },
            );
          } catch (e: any) {
            reject(e);
          }
        });
      } catch (e: any) {
        setError(e.message || "Generation failed");
        throw e;
      } finally {
        setIsGenerating(false);
      }
    },
    [isReady],
  );

  const reset = useCallback(() => {
    if (modelRef.current) {
      modelRef.current.resetConversation();
    }
  }, []);

  const deleteModel = useCallback(async (fileName: string): Promise<void> => {
    if (modelRef.current) {
      await modelRef.current.deleteModel(fileName);
      setIsReady(false);
      setDownloadProgress(0);
    }
  }, []);

  return {
    model: modelRef.current,
    isReady,
    isGenerating,
    downloadProgress,
    error,
    generate,
    reset,
    deleteModel,
    load,
  };
}
