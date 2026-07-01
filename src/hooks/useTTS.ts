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
  const enabled = useTTSStore((s) => s.enabled);
  const provider = useTTSStore((s) => s.provider);
  const isSpeaking = useTTSStore((s) => s.isSpeaking);
  const isPaused = useTTSStore((s) => s.isPaused);
  const queue = useTTSStore((s) => s.queue);
  const setEnabled = useTTSStore((s) => s.setEnabled);
  const setProvider = useTTSStore((s) => s.setProvider);
  const setRate = useTTSStore((s) => s.setRate);
  const setPitch = useTTSStore((s) => s.setPitch);
  const setVolume = useTTSStore((s) => s.setVolume);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const processingRef = useRef(false);

  const stopBrowserSpeech = useCallback(() => {
    try {
      speechSynthesis?.cancel();
    } catch {}
    currentUtteranceRef.current = null;
    useTTSStore.getState().setIsSpeaking(false);
    useTTSStore.getState().setIsPaused(false);
  }, []);

  const speakWithBrowser = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        try {
          if (!speechSynthesis) {
            resolve();
            return;
          }
          speechSynthesis.cancel();

          const s = useTTSStore.getState();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = s.rate;
          utterance.pitch = s.pitch;
          utterance.volume = s.volume;

          if (s.voice) {
            const found = getVoices().find((v) => v.name === s.voice);
            if (found) utterance.voice = found;
          }

          currentUtteranceRef.current = utterance;
          s.setIsSpeaking(true);

          utterance.onend = () => {
            useTTSStore.getState().setIsSpeaking(false);
            currentUtteranceRef.current = null;
            resolve();
          };

          utterance.onerror = () => {
            useTTSStore.getState().setIsSpeaking(false);
            currentUtteranceRef.current = null;
            resolve();
          };

          speechSynthesis.speak(utterance);
        } catch {
          useTTSStore.getState().setIsSpeaking(false);
          resolve();
        }
      });
    },
    [],
  );

  const speakWithCloudflare = useCallback(
    async (text: string): Promise<void> => {
      try {
        if (!isCloudflareConfigured()) {
          console.warn("Cloudflare not configured, falling back to browser TTS");
          await speakWithBrowser(text);
          return;
        }

        useTTSStore.getState().setIsSpeaking(true);
        const blob = await synthesizeViaCloudflare(text);

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            useTTSStore.getState().setIsSpeaking(false);
            audioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            useTTSStore.getState().setIsSpeaking(false);
            audioRef.current = null;
            resolve();
          };
          audio.play().catch(() => {
            URL.revokeObjectURL(url);
            useTTSStore.getState().setIsSpeaking(false);
            audioRef.current = null;
            resolve();
          });
        });
      } catch {
        useTTSStore.getState().setIsSpeaking(false);
      }
    },
    [speakWithBrowser],
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!text) return;

      if (provider === "cloudflare-aura") {
        await speakWithCloudflare(text);
      } else {
        await speakWithBrowser(text);
      }
    },
    [provider, speakWithBrowser, speakWithCloudflare],
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (!enabled) return;

    processingRef.current = true;
    try {
      while (useTTSStore.getState().queue.length > 0) {
        const item = useTTSStore.getState().shiftQueue();
        if (!item) break;
        await speak(item.text);
      }
    } finally {
      processingRef.current = false;
    }
  }, [enabled, speak]);

  const speakText = useCallback(
    (text: string, verseRef?: string) => {
      if (!enabled || !text) return;

      const item = { id: crypto.randomUUID?.() ?? `${Date.now()}`, text, verseRef };
      useTTSStore.getState().addToQueue(item);
    },
    [enabled],
  );

  const stop = useCallback(() => {
    stopBrowserSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    useTTSStore.getState().setIsSpeaking(false);
    useTTSStore.getState().setIsPaused(false);
  }, [stopBrowserSpeech]);

  const pause = useCallback(() => {
    try {
      speechSynthesis?.pause();
    } catch {}
    useTTSStore.getState().setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    try {
      speechSynthesis?.resume();
    } catch {}
    useTTSStore.getState().setIsPaused(false);
  }, []);

  useEffect(() => {
    if (enabled && queue.length > 0 && !isSpeaking) {
      processQueue();
    }
  }, [enabled, queue.length, isSpeaking, processQueue]);

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
    isSpeaking,
    isPaused,
    enabled,
    provider,
    queue,
    setEnabled,
    setProvider,
    setRate,
    setPitch,
    setVolume,
    voices: getVoices(),
  };
}
