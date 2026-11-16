import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { getQuestionAudio, getQuestionOptionAudio } from "@/api/lecturer";

const LINK_STALE_MS = 8 * 60 * 1000;

/** One-play experience backed by separately editable question and option audio files. */
export function QuestionSequenceAudio({ questionId, optionIds }: { questionId: string; optionIds: string[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const continuePlaying = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const sources = useMemo(
    () => [
      { kind: "question" as const, id: questionId, label: "Question" },
      ...optionIds.map((id, index) => ({ kind: "option" as const, id, label: `Answer ${String.fromCharCode(65 + index)}` })),
    ],
    [optionIds, questionId],
  );
  const links = useQueries({
    queries: sources.map((source) => ({
      queryKey: ["question-audio-link", source.kind, source.id],
      queryFn: () => source.kind === "question" ? getQuestionAudio(source.id) : getQuestionOptionAudio(source.id),
      staleTime: LINK_STALE_MS,
      retry: false,
      meta: { silent: true },
    })),
  });
  const pending = links.some((link) => link.isPending);
  const playable = sources.flatMap((source, index) => {
    const url = links[index]?.data?.url;
    return url ? [{ ...source, url }] : [];
  });
  const missing = sources.length - playable.length;
  const current = playable[Math.min(currentIndex, Math.max(0, playable.length - 1))];
  const currentUrl = current?.url;

  useEffect(() => {
    setCurrentIndex(0);
    continuePlaying.current = false;
  }, [questionId]);

  useEffect(() => {
    if (!continuePlaying.current || !currentUrl) return;
    const player = audioRef.current;
    if (!player) return;
    player.load();
    void player.play().catch(() => { continuePlaying.current = false; });
  }, [currentUrl]);

  if (pending) return <p role="status" className="mt-3 text-sm text-muted-foreground">Loading the complete audio…</p>;
  if (!current) return <p className="mt-3 text-sm text-muted-foreground">No audio is ready for this question yet.</p>;

  return (
    <section aria-label="Complete question audio" className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <strong>Listen to the complete question</strong>
        <span aria-live="polite" className="text-muted-foreground">Now playing: {current.label}</span>
      </div>
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        aria-label="Question and all answer options"
        src={currentUrl}
        className="w-full"
        onPlay={() => { continuePlaying.current = true; }}
        onEnded={() => {
          if (currentIndex < playable.length - 1) {
            continuePlaying.current = true;
            setCurrentIndex((index) => index + 1);
          } else {
            continuePlaying.current = false;
            setCurrentIndex(0);
          }
        }}
      >
        <track kind="captions" />
      </audio>
      <p className="mt-2 text-xs text-muted-foreground">
        {optionIds.length ? `Plays the question, then answers A–${String.fromCharCode(64 + optionIds.length)} in order.` : "Plays the complete question audio."}
        {missing ? ` ${missing} audio segment${missing === 1 ? " is" : "s are"} not ready and will be skipped.` : ""}
      </p>
    </section>
  );
}
