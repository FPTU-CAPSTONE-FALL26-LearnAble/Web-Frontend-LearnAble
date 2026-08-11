import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Tinh chỉnh TTS cá nhân (FR-02) — Zustand + localStorage (§8.1).
 * Chúng điều chỉnh trải nghiệm, không bao giờ là điều kiện truy cập.
 */
interface TtsState {
  voiceUri: string | null;
  rate: number;
  setVoiceUri: (uri: string | null) => void;
  setRate: (rate: number) => void;
}

export const useTtsStore = create<TtsState>()(
  persist(
    (set) => ({
      voiceUri: null,
      rate: 1,
      setVoiceUri: (voiceUri) => set({ voiceUri }),
      setRate: (rate) => set({ rate }),
    }),
    { name: "learnable.tts" },
  ),
);
