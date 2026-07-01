import { useCallback, useState } from "react";
import { isCloudflareConfigured, transcribeDeepgramFlux, askGemma } from "../gateway/cloudflare";
import { useSoundStore } from "../store/soundStore";
import { useScriptureStore } from "../store/scriptureStore";
import { useTTSStore } from "../store/ttsStore";
import { useTTS } from "./useTTS";
import { lookupEngine } from "../services/scriptureLookup";

const AI_SYSTEM_PROMPT = `You are a helpful scripture assistant. You help users understand Bible verses and find relevant scripture passages. Keep responses concise (2-3 sentences).`;

export function useCloudflareVoiceAI() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAIResponse, setLastAIResponse] = useState("");
  const tts = useTTS();

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    if (!isCloudflareConfigured()) {
      throw new Error("Cloudflare AI not configured");
    }
    return transcribeDeepgramFlux(audioBlob);
  }, []);

  const getGemmaResponse = useCallback(
    async (transcript: string, detectedVerse?: string): Promise<string> => {
      if (!isCloudflareConfigured()) {
        throw new Error("Cloudflare AI not configured");
      }

      const activeVerse = useScriptureStore.getState().activeVerse;
      const contextParts: string[] = [];

      if (detectedVerse) {
        contextParts.push(`Detected verse: ${detectedVerse}`);
      } else if (activeVerse) {
        contextParts.push(`Current verse: ${activeVerse.reference} - "${activeVerse.text}"`);
      }

      if (useSoundStore.getState().currentBook) {
        contextParts.push(
          `Current context: ${useSoundStore.getState().currentBook} ${useSoundStore.getState().currentChapter ?? ""}`,
        );
      }

      const contextStr = contextParts.length > 0 ? `\nContext:\n${contextParts.join("\n")}` : "";

      const prompt = `${AI_SYSTEM_PROMPT}${contextStr}\n\nUser said: "${transcript}"\n\nRespond helpfully about scripture:`;

      return askGemma(prompt, {
        system: AI_SYSTEM_PROMPT,
        maxTokens: 256,
        temperature: 0.7,
      });
    },
    [],
  );

  const processVoiceInput = useCallback(
    async (transcript: string, detectedVerse?: string): Promise<string> => {
      setIsProcessing(true);
      try {
        const response = await getGemmaResponse(transcript, detectedVerse);
        setLastAIResponse(response);

        if (useTTSStore.getState().enabled) {
          tts.speakText(response);
        }

        return response;
      } finally {
        setIsProcessing(false);
      }
    },
    [getGemmaResponse, tts],
  );

  const processAudioBlob = useCallback(
    async (audioBlob: Blob): Promise<{ transcript: string; aiResponse: string }> => {
      setIsProcessing(true);
      try {
        const transcript = await transcribeAudio(audioBlob);

        const detectedVerse = lookupEngine.reverseLookup(transcript, 70);
        const verseRef = detectedVerse
          ? `${detectedVerse.book} ${detectedVerse.chapter}:${detectedVerse.verse}`
          : undefined;

        const aiResponse = await getGemmaResponse(transcript, verseRef);
        setLastAIResponse(aiResponse);

        if (useTTSStore.getState().enabled) {
          tts.speakText(aiResponse);
        }

        return { transcript, aiResponse };
      } finally {
        setIsProcessing(false);
      }
    },
    [transcribeAudio, getGemmaResponse, tts],
  );

  return {
    transcribeAudio,
    getGemmaResponse,
    processVoiceInput,
    processAudioBlob,
    isProcessing,
    lastAIResponse,
    tts,
  };
}
