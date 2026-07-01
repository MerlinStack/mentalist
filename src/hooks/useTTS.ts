import { useCallback, useEffect, useRef } from "react";
import { useTTSStore } from "../store/ttsStore";
import { isCloudflareConfigured, synthesizeViaCloudflare } from "../gateway/cloudflare";

let speechSynthesis: SpeechSynthesis | null = null;
try {
  speechSynthesis = window.speechSynthesis;
} catch {}

function getVoices(): SpeechSynthesisVoice[] {
  try {
    return speechSynthesis?.getVoices() ?? [];
  } catch {
    return [];
  }
}

export function useTTS() {
  const store = useTTSStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const processingRef = useRef(false);

  const stopBrowserSpeech = useCallback(() => {
    try {
      speechSynthesis?.cancel();
    } catch {}
    currentUtteranceRef.current = null;
    store.setIsSpeaking(false);
    store.setIsPaused(false);
  }, [store]);

  const speakWithBrowser = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        try {
          if (!speechSynthesis) {
            resolve();
            return;
          }
          speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = store.rate;
          utterance.pitch = store.pitch;
          utterance.volume = store.volume;

          if (store.voice) {
            const found = getVoices().find((v) => v.name === store.voice);
            if (found) utterance.voice = found;
          }

          currentUtteranceRef.current = utterance;
          store.setIsSpeaking(true);

          utterance.onend = () => {
            store.setIsSpeaking(false);
            currentUtteranceRef.current = null;
            resolve();
          };

          utterance.onerror = () => {
            store.setIsSpeaking(false);
            currentUtteranceRef.current = null;
            resolve();
          };

          speechSynthesis.speak(utterance);
        } catch {
          store.setIsSpeaking(false);
          resolve();
        }
      });
    },
    [store],
  );

  const speakWithCloudflare = useCallback(
    async (text: string): Promise<void> => {
      try {
        if (!isCloudflareConfigured()) {
          console.warn("Cloudflare not configured, falling back to browser TTS");
          await speakWithBrowser(text);
          return;
        }

        store.setIsSpeaking(true);
        const blob = await synthesizeViaCloudflare(text);

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            store.setIsSpeaking(false);
            audioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            store.setIsSpeaking(false);
            audioRef.current = null;
            resolve();
          };
          audio.play().catch(() => {
            URL.revokeObjectURL(url);
            store.setIsSpeaking(false);
            audioRef.current = null;
            resolve();
          });
        });
      } catch {
        store.setIsSpeaking(false);
      }
    },
    [store, speakWithBrowser],
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!text) return;

      if (store.provider === "cloudflare-aura") {
        await speakWithCloudflare(text);
      } else {
        await speakWithBrowser(text);
      }
    },
    [store.provider, speakWithBrowser, speakWithCloudflare],
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (!store.enabled) return;

    processingRef.current = true;
    try {
      while (store.queue.length > 0) {
        const item = useTTSStore.getState().shiftQueue();
        if (!item) break;
        await speak(item.text);
      }
    } finally {
      processingRef.current = false;
    }
  }, [store.enabled, store.queue.length, speak]);

  const speakText = useCallback(
    (text: string, verseRef?: string) => {
      if (!store.enabled || !text) return;

      const item = { id: crypto.randomUUID?.() ?? `${Date.now()}`, text, verseRef };
      useTTSStore.getState().addToQueue(item);
    },
    [store.enabled],
  );

  const stop = useCallback(() => {
    stopBrowserSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    store.setIsSpeaking(false);
    store.setIsPaused(false);
  }, [stopBrowserSpeech, store]);

  const pause = useCallback(() => {
    try {
      speechSynthesis?.pause();
    } catch {}
    store.setIsPaused(true);
  }, [store]);

  const resume = useCallback(() => {
    try {
      speechSynthesis?.resume();
    } catch {}
    store.setIsPaused(false);
  }, [store]);

  useEffect(() => {
    if (store.enabled && store.queue.length > 0 && !store.isSpeaking) {
      processQueue();
    }
  }, [store.enabled, store.queue.length, store.isSpeaking, processQueue]);

  useEffect(() => {
    return () => {
      stopBrowserSpeech();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [stopBrowserSpeech]);

  return {
    speakText,
    speak,
    stop,
    pause,
    resume,
    isSpeaking: store.isSpeaking,
    isPaused: store.isPaused,
    enabled: store.enabled,
    provider: store.provider,
    queue: store.queue,
    setEnabled: store.setEnabled,
    setProvider: store.setProvider,
    setRate: store.setRate,
    setPitch: store.setPitch,
    setVolume: store.setVolume,
    voices: getVoices(),
  };
}
