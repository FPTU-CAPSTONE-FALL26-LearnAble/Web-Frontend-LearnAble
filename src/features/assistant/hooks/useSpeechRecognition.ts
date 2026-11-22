import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech to text behind one small interface. Today it is the browser's Web
 * Speech API, because the Backend has no speech-to-text endpoint for students;
 * swapping in a Backend call later only changes this file.
 */

export type SpeechLanguage = "vi-VN" | "en-US";
export type SpeechFailure = "denied" | "no-speech" | "failed";

type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const host = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export const isSpeechRecognitionSupported = () => recognitionConstructor() !== null;

type ListenOptions = {
  language: SpeechLanguage;
  onResult: (transcript: string) => void;
  onError: (failure: SpeechFailure) => void;
};

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const active = useRef<Recognition | null>(null);

  const stop = useCallback(() => {
    const recognition = active.current;
    active.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    }
    setListening(false);
  }, []);

  const listen = useCallback(
    ({ language, onResult, onError }: ListenOptions) => {
      const Constructor = recognitionConstructor();
      if (!Constructor) {
        onError("failed");
        return;
      }
      stop();
      const recognition = new Constructor();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;
      let settled = false;
      const finish = (report: () => void) => {
        if (settled) return;
        settled = true;
        if (active.current === recognition) active.current = null;
        setListening(false);
        report();
      };
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        finish(() => (transcript ? onResult(transcript) : onError("no-speech")));
      };
      recognition.onerror = (event) =>
        finish(() =>
          onError(
            event.error === "not-allowed" || event.error === "service-not-allowed"
              ? "denied"
              : event.error === "no-speech"
                ? "no-speech"
                : "failed",
          ),
        );
      // Ending without a result means nothing was said.
      recognition.onend = () => finish(() => onError("no-speech"));
      active.current = recognition;
      setListening(true);
      try {
        recognition.start();
      } catch {
        finish(() => onError("failed"));
      }
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { supported: isSpeechRecognitionSupported(), listening, listen, stop };
}
