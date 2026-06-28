import { useRef, useCallback, useState } from "react";
import { useSoundStore } from "../store/soundStore";

const CHUNK_INTERVAL = 5000;

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
  const chunksRef = useRef([]);

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
      const source = audioContext.createMediaStreamSource(micStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
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
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (chunksRef.current.length > 0 && onChunkRef.current) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          onChunkRef.current(blob);
          chunksRef.current = [];
        }
      };

      recorder.start(CHUNK_INTERVAL);
      recorder.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0) {
          onChunkRef.current?.(e.data);
        }
      });
    } catch {
      throw new Error("Microphone access denied");
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setAudioLevel(0);
    mediaRecorderRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  return {
    stream,
    audioLevel,
    frequencyData,
    startCapture,
    stopCapture,
  };
}
