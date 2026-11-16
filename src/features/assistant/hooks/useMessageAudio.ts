import { useCallback, useEffect, useRef, useState } from "react";
import { getAssistantMessageAudio } from "@/api/learningAssistant";

/**
 * Plays the Backend's audio for one answer at a time. The audio of a message is
 * fetched once and kept for the life of the page.
 */
export function useMessageAudio(conversationId: string | null) {
  const cache = useRef(new Map<string, string>());
  const element = useRef<HTMLAudioElement | null>(null);
  const settle = useRef<((finished: boolean) => void) | null>(null);
  const request = useRef(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  const stop = useCallback(() => {
    request.current += 1;
    element.current?.pause();
    element.current = null;
    settle.current?.(false);
    settle.current = null;
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  /** Resolves `true` when the audio played to the end, `false` when it was stopped or failed. */
  const play = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!conversationId) return false;
      stop();
      const mine = ++request.current;
      setFailedId(null);
      setLoadingId(messageId);
      try {
        let url = cache.current.get(messageId);
        if (!url) {
          url = await getAssistantMessageAudio(conversationId, messageId);
          cache.current.set(messageId, url);
        }
        if (mine !== request.current) return false;
        const audio = new Audio(url);
        element.current = audio;
        const finished = new Promise<boolean>((resolve) => {
          settle.current = resolve;
          audio.onended = () => resolve(true);
          audio.onerror = () => resolve(false);
        });
        setLoadingId(null);
        setPlayingId(messageId);
        await audio.play();
        const completed = await finished;
        if (mine === request.current) {
          settle.current = null;
          element.current = null;
          setPlayingId(null);
          if (!completed && audio.error) setFailedId(messageId);
        }
        return completed;
      } catch {
        if (mine === request.current) {
          setLoadingId(null);
          setPlayingId(null);
          setFailedId(messageId);
        }
        return false;
      }
    },
    [conversationId, stop],
  );

  useEffect(() => {
    const urls = cache.current;
    return () => {
      stop();
      urls.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      urls.clear();
    };
  }, [conversationId, stop]);

  return { play, stop, playingId, loadingId, failedId };
}
