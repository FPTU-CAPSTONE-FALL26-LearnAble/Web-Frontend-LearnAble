import { useCallback, useRef } from "react";

type Tone = "listen" | "waiting" | "error";
const TONES: Record<Tone, { frequency: number; seconds: number }> = {
  listen: { frequency: 880, seconds: 0.12 },
  waiting: { frequency: 523, seconds: 0.12 },
  error: { frequency: 220, seconds: 0.25 },
};

/** A short, quiet cue for voice mode. Silent where Web Audio is missing. */
export function useBeep() {
  const context = useRef<AudioContext | null>(null);
  return useCallback((tone: Tone) => {
    try {
      const Constructor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      context.current ??= new Constructor();
      const audio = context.current;
      const { frequency, seconds } = TONES[tone];
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.08;
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + seconds);
    } catch {
      // A cue that cannot play must never break the conversation.
    }
  }, []);
}
