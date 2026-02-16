import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useMemo, useRef } from "react";
import {
  useModel,
  GEMMA_3N_E2B_IT_INT4,
  checkMultimodalSupport,
  checkBackendSupport,
  applyGemmaTemplate,
  type ChatMessage,
} from "react-native-litert-lm";

// Model path - update this to your model location
const TEST_IMAGE_PATH = "/data/local/tmp/test.jpeg";
const TEST_AUDIO_PATH = "/data/local/tmp/test.wav";

export default function App() {
  // Memoize config to prevent re-initialization loops
  const config = useMemo(
    () => ({
      backend: "cpu" as const,
      systemPrompt: "You are a helpful assistant.",
      maxTokens: 1024,
      autoLoad: false,
    }),
    [],
  );

  // Initialize model via hook
  const { model, isReady, downloadProgress, error, deleteModel, load } =
    useModel(GEMMA_3N_E2B_IT_INT4, config);

  const [log, setLog] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const appendLog = useCallback((msg: string) => {
    console.log(msg);
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const clearLog = () => setLog([]);

  const runFullTest = async () => {
    if (isRunning || !isReady) return;
    setIsRunning(true);
    clearLog();

    try {
      appendLog("=== Starting Full Test Suite ===");

      // Test 1: Check hook state
      appendLog("\nTest 1: Hook state...");
      appendLog(`Model instance exists: ${!!model}`);
      appendLog(`isReady: ${isReady}`);

      // Test 2: Backend support utilities
      appendLog("\nTest 2: Backend support utilities...");
      const cpuWarning = checkBackendSupport("cpu");
      const gpuWarning = checkBackendSupport("gpu");
      const npuWarning = checkBackendSupport("npu");
      appendLog(`CPU backend: ${cpuWarning ?? "✅ OK"}`);
      appendLog(`GPU backend: ${gpuWarning ?? "✅ OK"}`);
      appendLog(`NPU backend: ${npuWarning ?? "⚠️ " + npuWarning}`);

      // Test 3: Multimodal support check
      appendLog("\nTest 3: Multimodal support check...");
      const multimodalError = checkMultimodalSupport();
      if (multimodalError) {
        appendLog(`⚠️ Multimodal: ${multimodalError}`);
      } else {
        appendLog("✅ Multimodal supported on this platform");
      }

      // Test 4: Prompt template utilities
      appendLog("\nTest 4: Prompt template utilities...");
      const testHistory: ChatMessage[] = [
        { role: "user", content: "Hello!" },
        { role: "model", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ];

      const gemmaPrompt = applyGemmaTemplate(testHistory, "You are helpful.");
      appendLog(`Gemma template length: ${gemmaPrompt.length} chars`);

      // Test 5: Verify Model Loaded
      appendLog("\nTest 5: Verifying Model Loaded...");
      appendLog(`Target: ${GEMMA_3N_E2B_IT_INT4}`);
      if (isReady && model) {
        appendLog("✅ Model is ready and loaded (handled by hook)");
      } else {
        throw new Error("Model is not ready despite isReady=true");
      }

      // Test 6: Simple inference
      appendLog("\nTest 6: Simple inference...");
      const startInfer = Date.now();

      const response = await model!.sendMessage(
        "What is 2+2? Answer with just the number.",
      );
      const inferTime = ((Date.now() - startInfer) / 1000).toFixed(2);
      appendLog(`Response: "${response}"`);
      appendLog(`⏱️ Inference time: ${inferTime}s`);

      // Test 7: Get stats
      appendLog("\nTest 7: Performance stats...");
      const stats = model!.getStats();
      appendLog(`Speed: ${stats.tokensPerSecond.toFixed(1)} tok/s`);

      // Test 8: Conversation context
      appendLog("\nTest 8: Conversation context...");
      await model!.sendMessage("My name is TestUser.");
      const nameResponse = await model!.sendMessage("What is my name?");
      appendLog(`Context test response: "${nameResponse}"`);

      // Test 9: Reset conversation
      appendLog("\nTest 9: Reset conversation...");
      model!.resetConversation();
      appendLog("✅ Conversation reset");

      // Test 10: Streaming
      appendLog("\nTest 10: Streaming inference...");
      let streamedTokens = 0;
      await new Promise<void>((resolve) => {
        model!.sendMessageAsync(
          "Count from 1 to 5.",
          (token: string, done: boolean) => {
            streamedTokens++;
            if (done) {
              appendLog(`✅ Streaming complete (${streamedTokens} callbacks)`);
              resolve();
            }
          },
        );
      });

      // Test 11: Image Inference
      appendLog("\nTest 11: Image Inference...");
      const multimodalCheck = checkMultimodalSupport();
      if (!multimodalCheck) {
        try {
          // We can't easily check file existence in /data/local/tmp from JS, so we rely on the native call throwing
          const imageResponse = await model!.sendMessageWithImage(
            "Describe this image.",
            TEST_IMAGE_PATH,
          );
          appendLog(`Image Response: "${imageResponse}"`);
        } catch (e: any) {
          appendLog(`⚠️ Image test failed: ${e.message}`);
        }
      } else {
        appendLog(`Skipping Image Test: ${multimodalCheck}`);
      }

      // Test 12: Audio Inference
      appendLog("\nTest 12: Audio Inference...");
      if (!multimodalCheck) {
        try {
          const audioResponse = await model!.sendMessageWithAudio(
            "Transcribe this audio.",
            TEST_AUDIO_PATH,
          );
          appendLog(`Audio Response: "${audioResponse}"`);
        } catch (e: any) {
          appendLog(`⚠️ Audio test failed: ${e.message}`);
        }
      } else {
        appendLog("Skipping Audio Test (Not supported)");
      }

      // Cleanup happens on unmount via hook
      appendLog("\n=== All Tests Complete ===");
      appendLog("(Model stays loaded for interaction)");
    } catch (error) {
      appendLog(
        `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  const getButtonText = () => {
    if (error) return "Error";
    if (isRunning) return "Running...";
    if (!isReady) {
      if (downloadProgress > 0 && downloadProgress < 1) {
        return `Downloading ${(downloadProgress * 100).toFixed(0)}%`;
      }
      if (downloadProgress === 1) {
        return "Loading Model...";
      }
      return "Load Model";
    }
    return "Run Full Test";
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.title}>LiteRT-LM Test</Text>
        <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>

        {error && <Text style={styles.errorText}>Error: {error}</Text>}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              !isReady && downloadProgress <= 0
                ? {} // Enable if explicitly needing load
                : (!isReady || isRunning) && styles.disabledButton,
            ]}
            onPress={isReady ? runFullTest : load}
            disabled={(!isReady && downloadProgress > 0) || isRunning}
          >
            <Text style={styles.buttonText}>{getButtonText()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={clearLog}>
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
          {isReady && (
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={async () => {
                try {
                  // Delete the model file
                  const fileName = "gemma-3n-E2B-it-int4.litertlm";
                  await deleteModel(fileName);
                  appendLog(`🗑️ Deleted model: ${fileName}`);
                } catch (e: any) {
                  appendLog(`❌ Failed to delete: ${e.message}`);
                }
              }}
            >
              <Text style={styles.buttonText}>Delete Model</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.logContainer}
          contentContainerStyle={styles.logContent}
          onContentSizeChange={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
        >
          {log.map((line, i) => (
            <Text key={i} style={styles.logLine}>
              {line}
            </Text>
          ))}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#16213e",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#0f3460",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  logContainer: {
    flex: 1,
    backgroundColor: "#0f0f1a",
    borderRadius: 8,
  },
  logContent: {
    padding: 12,
  },
  logLine: {
    color: "#a0ffa0",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 8,
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: "#2a2a3a",
    opacity: 0.7,
  },
  dangerButton: {
    backgroundColor: "#600f0f",
  },
});
