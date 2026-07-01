import { useRef, useCallback, useState } from "react";
import { useSoundStore } from "../store/soundStore";

const CHUNK_INTERVAL = 200;

function ensureAudioContextRunning(ctx) {
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

export function useAudioCapture() {
  const [stream, setStream] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(0));
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const onChunkRef = useRef(null);

  const startCapture = useCallback(async (onChunk) => {
    if (streamRef.current) return;

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48000,
        },
      });
      streamRef.current = micStream;
      setStream(micStream);
      onChunkRef.current = onChunk;

      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;
      ensureAudioContextRunning(audioContext);

      const source = audioContext.createMediaStreamSource(micStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const level = Math.min(Math.round((sum / dataArray.length / 255) * 200), 100);
        setAudioLevel(level);
        setFrequencyData(new Uint8Array(dataArray));
        useSoundStore.getState().setAudioLevel(level);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      const recorder = new MediaRecorder(micStream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && onChunkRef.current) {
          onChunkRef.current(event.data);
        }
      };

      recorder.onerror = () => {
        console.error("MediaRecorder error:", recorder.error?.name || "unknown");
        useSoundStore.getState().setError("Microphone recording error");
      };

      recorder.start(CHUNK_INTERVAL);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        throw new Error("Microphone access denied");
      }
      throw err;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;

    const ctx = audioContextRef.current;
    if (ctx) {
      ctx.close().catch(() => {});
    }
    audioContextRef.current = null;
    analyserRef.current = null;

    const trackStream = streamRef.current;
    if (trackStream) {
      trackStream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setStream(null);
    setAudioLevel(0);
  }, []);

  return {
    stream,
    audioLevel,
    frequencyData,
    startCapture,
    stopCapture,
  };
}
