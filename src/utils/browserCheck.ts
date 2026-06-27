export function checkBrowserSupport(): {
  supported: boolean;
  webWorkers: boolean;
  webAudio: boolean;
  mediaRecorder: boolean;
  broadcastChannel: boolean;
  webSpeech: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  const webWorkers = typeof Worker !== "undefined";
  if (!webWorkers) warnings.push("Web Workers not supported");

  const webAudio =
    typeof AudioContext !== "undefined" ||
    typeof (window as any).webkitAudioContext !== "undefined";
  if (!webAudio) warnings.push("Web Audio API not supported");

  const mediaRecorder = typeof MediaRecorder !== "undefined";
  if (!mediaRecorder) warnings.push("MediaRecorder not supported");

  const broadcastChannel = typeof BroadcastChannel !== "undefined";
  if (!broadcastChannel) warnings.push("BroadcastChannel not supported");

  const webSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!webSpeech) warnings.push("Web Speech API not supported (Sound Mode unavailable)");

  const supported = webWorkers && webAudio;
  const supportedBrowser = !warnings.length || (webWorkers && webAudio);

  return {
    supported: supportedBrowser,
    webWorkers,
    webAudio,
    mediaRecorder,
    broadcastChannel,
    webSpeech,
    warnings,
  };
}

export function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  return "Unknown";
}
