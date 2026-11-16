import { Loader, PhoneCall, PhoneOff, TriangleAlert } from "lucide-react";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";
import { Button } from "@/shared/ui/primitives/button";
import type { RealtimeFailure, RealtimeState } from "@/features/assistant/hooks/useRealtimeVoice";
import { TARGET } from "@/features/assistant/ui";

const t = vi.assistant.voice.live;

type Props = {
  supported: boolean;
  enabled: boolean;
  state: RealtimeState;
  failure: RealtimeFailure | null;
  onStart: () => void;
  onStop: () => void;
};

/** Live voice: one switch to open or end a spoken conversation over WebRTC. */
export function LiveVoice({ supported, enabled, state, failure, onStart, onStop }: Props) {
  const active = state !== "idle";
  return (
    <section
      aria-labelledby="assistant-live-voice"
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
    >
      <h3 id="assistant-live-voice" className="text-xl font-semibold">
        {t.heading}
      </h3>
      <p id="assistant-live-voice-hint" className="text-muted-foreground">
        {supported ? t.hint : t.unsupported}
      </p>
      {active ? (
        <p
          className={cn(
            "flex items-center gap-3 rounded-xl border-2 border-foreground p-4 text-2xl font-semibold",
            state === "live" && "bg-accent",
          )}
        >
          {state === "connecting" ? (
            <Loader aria-hidden className="size-8 shrink-0 motion-safe:animate-spin" />
          ) : (
            <PhoneCall aria-hidden className="size-8 shrink-0" />
          )}
          {t.state[state]}
        </p>
      ) : null}
      {!active && failure ? (
        <p className="flex items-center gap-3 rounded-xl border-2 border-destructive p-4 font-semibold text-destructive">
          <TriangleAlert aria-hidden className="size-6 shrink-0" />
          {t.failure[failure]}
        </p>
      ) : null}
      <div>
        {active ? (
          <Button variant="secondary" className={TARGET} onClick={onStop}>
            <PhoneOff aria-hidden />
            {t.end}
          </Button>
        ) : (
          <Button
            variant="outline"
            className={TARGET}
            disabled={!supported || !enabled}
            aria-describedby="assistant-live-voice-hint"
            onClick={onStart}
          >
            <PhoneCall aria-hidden />
            {t.start}
          </Button>
        )}
      </div>
    </section>
  );
}
