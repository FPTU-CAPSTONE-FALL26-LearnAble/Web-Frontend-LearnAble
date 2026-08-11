import { useSyncExternalStore } from "react";

/**
 * Quyết định 7 (§9): liệt kê giọng đọc LÚC CHẠY, lọc vi-VN, KHÔNG BAO GIỜ
 * âm thầm rơi về giọng tiếng Anh — giọng Anh đọc tiếng Việt là "gibberish
 * nghe có vẻ tự tin", sinh viên khiếm thị không có cách nào tự chẩn đoán.
 */

function getViVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("vi"));
}

let cached: SpeechSynthesisVoice[] = [];
let cachedKey = "";

function getSnapshot(): SpeechSynthesisVoice[] {
  const voices = getViVoices();
  const key = voices.map((v) => v.voiceURI).join("|");
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
  return useSyncExternalStore(subscribe, getSnapshot, () => cached);
}
