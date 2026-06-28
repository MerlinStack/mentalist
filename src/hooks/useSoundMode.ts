import { useEffect, useRef } from 'react';
import { useSoundStore } from '../store/soundStore';
import { useScriptureStore } from '../store/scriptureStore';
import { parseScriptureReference, formatReference } from '../utils/scriptureParser';
import { lookupEngine } from '../services/scriptureLookup';

export function useSoundMode(opts?: { utteranceRef?: { current: ((text: string) => void) | undefined } }) {
  const isListening = useSoundStore((state) => state.isListening);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceRef = useRef<((text: string) => void) | undefined>(undefined);
  utteranceRef.current = opts?.utteranceRef?.current;

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser framework.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      useSoundStore.setState({ isListening: true });
    };

    recognition.onresult = async (event: any) => {
      let interimText = '';
      let finalText = '';

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
        transcript: useSoundStore.getState().transcript + (finalText ? ' ' + finalText : '')
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
                  translation: 'KJV'
                }
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
      console.error("Speech Recognition runtime error:", err.error);
      const fatalErrors = ["not-allowed", "service-not-allowed", "aborted"];
      if (fatalErrors.includes(err.error)) {
        useSoundStore.setState({ isListening: false });
      }
    };

    recognition.onend = () => {
      if (useSoundStore.getState().isListening) {
        restartTimeoutRef.current = setTimeout(() => {
          startListening();
        }, 300);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    useSoundStore.setState({ isListening: false });
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return { startListening, stopListening };
}
