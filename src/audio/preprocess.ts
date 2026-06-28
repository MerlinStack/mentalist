export interface PreprocessConfig {
  preEmphasis: number;
  targetRms: number;
  noiseGateThreshold: number;
  noiseProfileFrames: number;
  trimSilence: boolean;
  silenceThreshold: number;
  silenceMinDuration: number;
}

const DEFAULT_CONFIG: PreprocessConfig = {
  preEmphasis: 0.97,
  targetRms: 0.063,
  noiseGateThreshold: 0.015,
  noiseProfileFrames: 10,
  trimSilence: true,
  silenceThreshold: 0.008,
  silenceMinDuration: 0.05,
};

function removeDC(signal: Float32Array): Float32Array {
  let mean = 0;
  for (let i = 0; i < signal.length; i++) mean += signal[i];
  mean /= signal.length;
  if (Math.abs(mean) < 1e-7) return signal;
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) out[i] = signal[i] - mean;
  return out;
}

function applyPreEmphasis(signal: Float32Array, coeff: number): Float32Array {
  const out = new Float32Array(signal.length);
  out[0] = signal[0];
  for (let i = 1; i < signal.length; i++) out[i] = signal[i] - coeff * signal[i - 1];
  return out;
}

function rmsNormalize(signal: Float32Array, targetRms: number): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < signal.length; i++) sumSq += signal[i] * signal[i];
  const currentRms = Math.sqrt(sumSq / signal.length);
  if (currentRms < 1e-10) return signal;
  const gain = Math.min(targetRms / currentRms, 10);
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) out[i] = Math.max(-1, Math.min(1, signal[i] * gain));
  return out;
}

function lowNoiseGate(
  signal: Float32Array,
  sampleRate: number,
  threshold: number,
  profileFrames: number,
): Float32Array {
  const frameSize = Math.max(1, Math.round(sampleRate * 0.025));
  const hopLength = Math.max(1, Math.round(frameSize * 0.5));
  const numFrames = Math.max(1, Math.floor((signal.length - frameSize) / hopLength) + 1);

  const profileLen = Math.min(profileFrames, Math.max(1, Math.floor(numFrames * 0.1)));
  let noiseFloor = 0;
  for (let f = 0; f < profileLen; f++) {
    const start = f * hopLength;
    let sumSq = 0;
    for (let i = 0; i < frameSize && start + i < signal.length; i++) {
      sumSq += signal[start + i] * signal[start + i];
    }
    noiseFloor += Math.sqrt(sumSq / frameSize);
  }
  noiseFloor = (noiseFloor / profileLen) * 1.5;

  const out = new Float32Array(signal.length);
  const overlap = new Float32Array(signal.length);
  const window = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
  }

  for (let f = 0; f < numFrames; f++) {
    const start = f * hopLength;
    let rms = 0;
    for (let i = 0; i < frameSize && start + i < signal.length; i++) {
      rms += signal[start + i] * signal[start + i];
    }
    rms = Math.sqrt(rms / frameSize);

    const gain = rms > noiseFloor ? 1 : rms / noiseFloor;
    const smoothGain = gain;

    for (let i = 0; i < frameSize && start + i < signal.length; i++) {
      const idx = start + i;
      out[idx] += signal[idx] * window[i] * smoothGain;
      overlap[idx] += window[i];
    }
  }

  for (let i = 0; i < out.length; i++) {
    out[i] = overlap[i] > 0.01 ? out[i] / overlap[i] : 0;
  }

  return out;
}

function trimSilence(
  signal: Float32Array,
  sampleRate: number,
  threshold: number,
  minDurationSec: number,
): Float32Array {
  const frameSize = Math.max(1, Math.round(sampleRate * minDurationSec));
  const numFrames = Math.max(1, Math.floor(signal.length / frameSize));
  let firstActive = -1;
  let lastActive = -1;

  for (let f = 0; f < numFrames; f++) {
    const start = f * frameSize;
    const end = Math.min(start + frameSize, signal.length);
    let peak = 0;
    for (let i = start; i < end; i++) {
      const abs = Math.abs(signal[i]);
      if (abs > peak) peak = abs;
    }
    if (peak > threshold) {
      if (firstActive === -1) firstActive = f;
      lastActive = f;
    }
  }

  if (firstActive === -1) return signal;
  const trimStart = firstActive * frameSize;
  const trimEnd = Math.min((lastActive + 1) * frameSize, signal.length);
  const trimmedLen = trimEnd - trimStart;
  const out = new Float32Array(trimmedLen);
  for (let i = 0; i < trimmedLen; i++) out[i] = signal[trimStart + i];
  return out;
}

export function preprocessAudio(
  signal: Float32Array,
  sampleRate: number,
  config: Partial<PreprocessConfig> = {},
): Float32Array {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  let processed = removeDC(signal);

  processed = lowNoiseGate(processed, sampleRate, cfg.noiseGateThreshold, cfg.noiseProfileFrames);

  processed = applyPreEmphasis(processed, cfg.preEmphasis);

  processed = rmsNormalize(processed, cfg.targetRms);

  if (cfg.trimSilence) {
    processed = trimSilence(processed, sampleRate, cfg.silenceThreshold, cfg.silenceMinDuration);
  }

  return processed;
}
