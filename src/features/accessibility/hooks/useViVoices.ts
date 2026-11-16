import { useMemo, useSyncExternalStore } from "react";

/** Enumerate installed voices without changing their language. */
function getVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis.getVoices();
}

let cached: SpeechSynthesisVoice[] = [];
let cachedKey = "";

function getSnapshot(): SpeechSynthesisVoice[] {
  const voices = getVoices();
  const key = voices.map((v) => `${v.voiceURI}:${v.lang}`).join("|");
  if (key !== cachedKey) {
    cached = voices;
    cachedKey = key;
  }
  return cached;
}

function subscribe(onChange: () => void): () => void {
  if (typeof speechSynthesis === "undefined") return () => {};
  // Chrome nạp danh sách giọng bất đồng bộ — phải nghe voiceschanged.
  speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => speechSynthesis.removeEventListener("voiceschanged", onChange);
}

/** Danh sách giọng vi-VN hiện có trên máy; [] nghĩa là "chưa cài" — UI phải nói thẳng. */
export function useViVoices(): SpeechSynthesisVoice[] {
  const voices = useSyncExternalStore(subscribe, getSnapshot, () => cached);
  return useMemo(() => voices.filter((voice) => voice.lang.toLowerCase().startsWith("vi")), [voices]);
}

/** English voices available for the current English-only student interface. */
export function useEnglishVoices(): SpeechSynthesisVoice[] {
  const voices = useSyncExternalStore(subscribe, getSnapshot, () => cached);
  return useMemo(() => voices.filter((voice) => voice.lang.toLowerCase().startsWith("en")), [voices]);
}
