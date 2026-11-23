import { useEffect, useMemo, useRef } from "react";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { sentenceAtTime, splitNarration } from "./narrationTiming";

type Props = {
  value: string;
  audioText?: string;
  currentTime: number;
  duration: number;
  pageLabel: string;
  onChange: (value: string) => void;
  onPause: () => void;
};

export function NarrationFollowAlong({ value, audioText, currentTime, duration, pageLabel, onChange, onPause }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLPreElement>(null);
  const activeRef = useRef<HTMLElement>(null);
  const matchesAudio = Boolean(audioText && value.trim() === audioText.trim());
  const sentences = useMemo(() => splitNarration(value), [value]);
  const activeIndex = matchesAudio ? sentenceAtTime(sentences, currentTime, duration) : -1;
  const activeSentence = activeIndex >= 0 ? sentences[activeIndex] : undefined;

  useEffect(() => {
    const textarea = textareaRef.current;
    const backdrop = backdropRef.current;
    const active = activeRef.current;
    if (!textarea || !backdrop || !active) return;
    const target = Math.max(0, active.offsetTop - backdrop.offsetTop - textarea.clientHeight / 2);
    textarea.scrollTop = target;
    backdrop.scrollTop = target;
  }, [activeIndex, value]);

  return <div className="space-y-2">
    <label htmlFor="tts-text" className="text-sm font-semibold text-foreground">Text spoken by TTS · {pageLabel}</label>
    <div className="relative">
      <pre ref={backdropRef} aria-hidden="true" className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words rounded-md border border-transparent px-2.5 py-2 font-sans text-base leading-relaxed text-foreground [scrollbar-gutter:stable] md:text-sm">
        {activeSentence ? <>{value.slice(0, activeSentence.start)}<mark ref={activeRef} className="rounded-sm bg-primary/25 font-semibold text-foreground ring-1 ring-primary">{value.slice(activeSentence.start, activeSentence.end)}</mark>{value.slice(activeSentence.end)}{"\n"}</> : <>{value}{"\n"}</>}
      </pre>
      <Textarea
        ref={textareaRef}
        id="tts-text"
        variant="narration-overlay"
        aria-label={`Editable narration text for ${pageLabel}`}
        className="relative h-56 min-h-56 resize-y overflow-auto [field-sizing:fixed] [scrollbar-gutter:stable]"
        value={value}
        maxLength={100000}
        onChange={(event) => onChange(event.target.value)}
        onPointerDown={onPause}
        onFocus={onPause}
        onScroll={(event) => { if (backdropRef.current) backdropRef.current.scrollTop = event.currentTarget.scrollTop; }}
      />
    </div>
    {audioText && !matchesAudio && <p role="status" className="text-xs text-muted-foreground">This audio was created from earlier text. The highlight will match again after you regenerate it.</p>}
    {matchesAudio && <p className="text-xs text-muted-foreground">The highlighted position is an estimate based on playback time. Edit directly in this box.</p>}
  </div>;
}
