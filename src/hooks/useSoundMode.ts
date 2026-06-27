import { useEffect, useRef } from 'react';
import { useSoundStore } from '../store/soundStore';
import { useScriptureStore } from '../store/scriptureStore';
import { parseScriptureReference } from '../utils/scriptureParser';
import { fetchVerse } from '../api/bible';

export function useSoundMode() {
  const isListening = useSoundStore((state) => state.isListening);
  const recognitionRef = useRef<any>(null);

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
            const data = await fetchVerse(parsed[0], 'kjv');
            if (data) {
              useScriptureStore.setState({
                activeVerse: {
                  reference: data.reference,
                  text: data.text,
                  book: data.book,
                  chapter: data.chapter,
                  verse: data.verse,
                  translation: data.translation || 'KJV'
                }
              });
            }
          } catch (err) {
            console.error("Failed auto-fetching verse match:", err);
          }
        }
      }
    };

    recognition.onerror = (err: any) => {
      console.error("Speech Recognition runtime error:", err.error);
    };

    recognition.onend = () => {
      if (useSoundStore.getState().isListening) {
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    useSoundStore.setState({ isListening: false });
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return { startListening, stopListening };
}
