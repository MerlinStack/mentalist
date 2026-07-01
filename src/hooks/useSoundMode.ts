import { useEffect, useRef } from "react";
import { useSoundStore } from "../store/soundStore";
import { useScriptureStore } from "../store/scriptureStore";
import { parseScriptureReference, formatReference } from "../utils/scriptureParser";
import { lookupEngine } from "../services/scriptureLookup";

const RESTART_DELAY = 800;
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_WINDOW_MS = 10000;

export function useSoundMode(opts?: {
  utteranceRef?: { current: ((text: string) => void) | undefined };
}) {
  const isListening = useSoundStore((state) => state.isListening);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartCountRef = useRef(0);
  const restartWindowStartRef = useRef(0);
  const activeRecognitionRef = useRef<any>(null);
  const utteranceRef = useRef<((text: string) => void) | undefined>(undefined);
  utteranceRef.current = opts?.utteranceRef?.current;

  const isRestartThrottled = (): boolean => {
    const now = Date.now();
    if (now - restartWindowStartRef.current > RESTART_WINDOW_MS) {
      restartCountRef.current = 0;
      restartWindowStartRef.current = now;
    }
    restartCountRef.current++;
    return restartCountRef.current > MAX_RESTART_ATTEMPTS;
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser framework.");
      return;
    }

    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.stop();
      } catch {}
      activeRecognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      useSoundStore.setState({ isListening: true });
    };

    recognition.onresult = async (event: any) => {
      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const textToken = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += textToken;
        } else {
          interimText += textToken;
        }
      }

      useSoundStore.setState({
        recentChunk: interimText || finalText,
        transcript: useSoundStore.getState().transcript + (finalText ? " " + finalText : ""),
      });

      if (finalText.trim()) {
        const parsed = parseScriptureReference(finalText);
        if (parsed && parsed.length > 0) {
          try {
            const ref = parsed[0];
            const refStr = formatReference(ref.book, ref.chapter, ref.verse);
            const v = lookupEngine.getVerseByRef(refStr);
            if (v) {
              useScriptureStore.setState({
                activeVerse: {
                  reference: refStr,
                  text: v.t,
                  book: v.b,
                  chapter: v.c,
                  verse: v.v,
                  translation: "KJV",
                },
              });
            }
          } catch (err) {
            console.error("Failed auto-fetching verse match:", err);
          }
        } else if (utteranceRef.current) {
          utteranceRef.current(finalText);
        }
      }
    };

    recognition.onerror = (err: any) => {
      const fatalErrors = ["not-allowed", "service-not-allowed", "aborted"];
      const transientErrors = ["no-speech", "audio-capture", "network"];
      if (fatalErrors.includes(err.error)) {
        useSoundStore.setState({ isListening: false });
      } else if (transientErrors.includes(err.error)) {
        if (isRestartThrottled()) {
          useSoundStore.setState({ isListening: false });
        }
      }
    };

    recognition.onend = () => {
      if (activeRecognitionRef.current !== recognition) return;
      if (useSoundStore.getState().isListening) {
        if (isRestartThrottled()) {
          useSoundStore.setState({ isListening: false });
          return;
        }
        restartTimeoutRef.current = setTimeout(() => {
          startListening();
        }, RESTART_DELAY);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    activeRecognitionRef.current = recognition;
  };

  const stopListening = () => {
    useSoundStore.setState({ isListening: false });
    restartCountRef.current = 0;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
      activeRecognitionRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  return { startListening, stopListening };
}
