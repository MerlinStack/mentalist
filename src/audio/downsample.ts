import { preprocessAudio } from "./preprocess";

const TARGET_RATE = 16000;

export function downsampleTo16kHz(audioData: Float32Array, sourceRate: number): Float32Array {
  if (sourceRate === TARGET_RATE) return audioData;
  const ratio = sourceRate / TARGET_RATE;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, audioData.length - 1);
    const frac = srcIdx - lo;
    result[i] = audioData[lo] * (1 - frac) + audioData[hi] * frac;
  }

  return result;
}

export function floatTo16BitPCM(float32: Float32Array): Int16Array {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = s * 0x7fff;
  }
  return pcm;
}

export function audioBlobToFloat32(blob: Blob): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const audioCtx = new AudioContext({ sampleRate: TARGET_RATE });
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const downsampled = downsampleTo16kHz(channelData, audioBuffer.sampleRate);
        await audioCtx.close();

        const processed = preprocessAudio(downsampled, TARGET_RATE);

        for (let i = 0; i < processed.length; i++) {
          processed[i] = Math.max(-1, Math.min(1, processed[i]));
        }
        resolve(processed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsArrayBuffer(blob);
  });
}

export function createWavBlob(float32: Float32Array): Blob {
  const pcm = floatTo16BitPCM(float32);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = TARGET_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length * (bitsPerSample / 8);
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < pcm.length; i++) {
    view.setInt16(headerSize + i * 2, pcm[i], true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
