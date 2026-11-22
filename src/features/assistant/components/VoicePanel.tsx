import { Ear, Loader, Mic, MicOff, Square, TriangleAlert, Volume2 } from "lucide-react";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";
import { Button } from "@/shared/ui/primitives/button";
import type { SpeechLanguage } from "@/features/assistant/hooks/useSpeechRecognition";
import { ASSISTANT_SHORTCUTS } from "@/features/assistant/hooks/useAssistantShortcuts";
import { FIELD, TARGET } from "@/features/assistant/ui";

const t = vi.assistant.voice;

export type VoiceState = "idle" | "listening" | "waiting" | "speaking" | "error";

const STATE: Record<VoiceState, { Icon: typeof Mic; className: string }> = {
  idle: { Icon: Mic, className: "border-border" },
  listening: { Icon: Ear, className: "border-foreground bg-accent" },
  waiting: { Icon: Loader, className: "border-foreground" },
  speaking: { Icon: Volume2, className: "border-success-border bg-success text-success-foreground" },
  error: { Icon: TriangleAlert, className: "border-destructive text-destructive" },
};

type Props = {
  state: VoiceState;
  error: string | null;
  transcript: string | null;
  handsFree: boolean;
  onHandsFreeChange: (value: boolean) => void;
  language: SpeechLanguage;
  onLanguageChange: (language: SpeechLanguage) => void;
  onToggleListening: () => void;
  onStopAll: () => void;
  /** Live voice holds the microphone; turn-based listening waits until it ends. */
  liveActive?: boolean;
};

/** Voice mode: speak a question, hear the answer. State is always shown in large words. */
export function VoicePanel({
  state,
  error,
  transcript,
  handsFree,
  onHandsFreeChange,
  language,
  onLanguageChange,
  onToggleListening,
  onStopAll,
  liveActive = false,
}: Props) {
  const { Icon, className } = STATE[state];
  const listening = state === "listening";
  const busy = liveActive || (state !== "idle" && state !== "error");
  return (
    <section aria-label={t.panelLabel} className="flex flex-col gap-4">
      <div className={cn("flex items-center gap-3 rounded-xl border-2 p-4", className)}>
        <Icon
          aria-hidden
          className={cn("size-8 shrink-0", state === "waiting" && "motion-safe:animate-spin")}
        />
        <p className="text-2xl font-semibold">{state === "error" && error ? error : t.state[state]}</p>
      </div>

      {transcript ? (
        <p className="rounded-xl border border-border p-4 text-lg">
          <span className="font-semibold">{t.transcript}: </span>
          {transcript}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          className={TARGET}
          onClick={onToggleListening}
          aria-keyshortcuts="Control+Space"
          disabled={state === "waiting" || liveActive}
        >
          {listening ? <MicOff aria-hidden /> : <Mic aria-hidden />}
          {listening ? t.stopListening : t.start}
          <kbd className="font-mono text-sm">{ASSISTANT_SHORTCUTS.talk}</kbd>
        </Button>
        <Button
          variant="secondary"
          className={TARGET}
          onClick={onStopAll}
          disabled={!busy}
          aria-keyshortcuts="Escape"
        >
          <Square aria-hidden />
          {t.stopAll}
          <kbd className="font-mono text-sm">{ASSISTANT_SHORTCUTS.stop}</kbd>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input
              type="checkbox"
              className="size-6 accent-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
              checked={handsFree}
              onChange={(event) => onHandsFreeChange(event.target.checked)}
              aria-describedby="assistant-hands-free-hint"
            />
            {t.handsFree}
          </label>
          <p id="assistant-hands-free-hint" className="text-muted-foreground">
            {t.handsFreeHint}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="assistant-voice-language" className="font-semibold">
            {t.language}
          </label>
          <select
            id="assistant-voice-language"
            className={FIELD}
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as SpeechLanguage)}
          >
            <option value="vi-VN">{t.languageVi}</option>
            <option value="en-US">{t.languageEn}</option>
          </select>
        </div>
      </div>
    </section>
  );
}
