import { useState, useEffect, useRef } from "react";

export function useAudioMeter(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current || !dataRef.current) return;
      const buf: any = dataRef.current;
      analyserRef.current.getByteFrequencyData(buf);
      const sum = Array.from(buf as Uint8Array).reduce((a: number, b: number) => a + b, 0);
      const avg = sum / (buf as Uint8Array).length;
      const newLevel = (avg / 255) * 100;
      setLevel(newLevel);
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContext.close();
    };
  }, [stream]);

  return { audioLevel: level };
}
