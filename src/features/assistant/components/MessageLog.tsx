import { useEffect, useRef } from "react";
import { Bot, Square, TriangleAlert, User, Volume2 } from "lucide-react";
import type { AssistantMessage } from "@/api/learningAssistant";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";
import { Button } from "@/shared/ui/primitives/button";
import { TARGET, TEXT_SIZE, type TextSize } from "@/features/assistant/ui";

const t = vi.assistant;

/** The heading of the newest answer; a shortcut moves focus here. */
export const LATEST_ANSWER_ID = "assistant-latest-answer";

type Audio = {
  playingId: string | null;
  loadingId: string | null;
  failedId: string | null;
  onPlay: (messageId: string) => void;
  onStop: () => void;
};

function Sources({ message }: { message: AssistantMessage }) {
  if (message.sources.length === 0) {
    // An answer without sources is marked in words and with an icon, never colour alone.
    return (
      <p className="mt-3 flex items-start gap-2 rounded-md border border-warning-foreground/30 bg-warning p-3 text-warning-foreground">
        <TriangleAlert aria-hidden className="mt-1 size-5 shrink-0" />
        {t.noSources}
      </p>
    );
  }
  const headingId = `sources-${message.messageId}`;
  return (
    <div className="mt-3 rounded-lg bg-muted p-3">
      <h4 id={headingId} className="text-base font-bold tracking-wide uppercase">
        {t.groundedIn(message.sources.length)}
      </h4>
      <ol aria-label={t.sources} className="mt-1 list-decimal ps-6">
        {message.sources.map((source) => {
          const title = source.title ?? t.untitledSource;
          const where = [
            source.pageNumber !== null ? t.sourcePage(source.pageNumber) : null,
            source.slideNumber !== null ? t.sourceSlide(source.slideNumber) : null,
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <li key={source.key} className="py-1">
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {title}
                  <span className="sr-only"> ({t.opensInNewTab})</span>
                </a>
              ) : (
                <span className="font-semibold">{title}</span>
              )}
              {where ? <span> — {where}</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type Props = {
  messages: AssistantMessage[];
  /** A question that is waiting for its answer. */
  pendingQuestion: string | null;
  textSize: TextSize;
  audio: Audio;
  /** Asks for the newest answer again in simpler words; omitted while it cannot be asked. */
  onSimpler?: () => void;
};

const MESSAGE = "[data-message]";

/** ↑ ↓ Home End move between messages while a message (not a control in it) has focus. */
function moveBetweenMessages(event: React.KeyboardEvent<HTMLDivElement>) {
  if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
  const target = event.target as HTMLElement;
  if (!target.matches(`${MESSAGE}, ${MESSAGE} h3`)) return;
  const all = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(MESSAGE));
  const index = all.indexOf(target.closest<HTMLElement>(MESSAGE)!);
  const next =
    event.key === "ArrowDown"
      ? all[index + 1]
      : event.key === "ArrowUp"
        ? all[index - 1]
        : event.key === "Home"
          ? all[0]
          : event.key === "End"
            ? all.at(-1)
            : undefined;
  if (!next) return;
  event.preventDefault();
  next.focus();
}

/**
 * The conversation, built for reading with a screen reader's heading keys:
 * every question and answer is a numbered heading, and the answer heading says
 * how many sources follow.
 *
 * The log itself is not a live region. A new answer is spoken once, through
 * the page's single announcement channel, so nothing is read twice and the
 * student's own question is not read back.
 */
export function MessageLog({ messages, pendingQuestion, textSize, audio, onSimpler }: Props) {
  const end = useRef<HTMLDivElement>(null);
  const count = messages.length + (pendingQuestion ? 1 : 0);
  useEffect(() => {
    // Shows the newest message without moving keyboard focus.
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [count]);

  const size = TEXT_SIZE[textSize];
  const answers = messages.filter((message) => message.role === "assistant").length;
  const questions = messages.length - answers;
  let questionIndex = 0;
  let answerIndex = 0;
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- arrow keys between messages
    <div
      role="log"
      aria-live="off"
      aria-label={t.chatLogLabel}
      className="flex flex-col gap-4"
      onKeyDown={moveBetweenMessages}
    >
      {count === 0 ? <p className="text-muted-foreground">{t.messagesEmpty}</p> : null}
      {messages.map((message) => {
        const isUser = message.role === "user";
        const index = isUser ? ++questionIndex : ++answerIndex;
        const playing = audio.playingId === message.messageId;
        const loading = audio.loadingId === message.messageId;
        const Icon = isUser ? User : Bot;
        const latest = !isUser && index === answers;
        const headingId = `message-${message.messageId}`;
        return (
          <article
            key={message.messageId}
            data-message
            aria-labelledby={latest ? LATEST_ANSWER_ID : headingId}
            // Reached with the "latest answer" shortcut, then ↑ ↓ — not a tab stop of its own.
            tabIndex={-1}
            className={cn(
              "rounded-xl border p-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isUser
                ? "ms-auto w-fit max-w-[90%] border-2 border-foreground bg-accent"
                : "border-border bg-card",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h3
                id={latest ? LATEST_ANSWER_ID : headingId}
                tabIndex={latest ? -1 : undefined}
                className="flex items-center gap-2 text-base font-bold tracking-wide uppercase focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                {isUser ? t.questionHeading(index) : t.answerHeading(index, message.sources.length)}
              </h3>
              {playing ? (
                <p className="flex items-center gap-2 text-base font-bold tracking-wide uppercase">
                  <Volume2 aria-hidden className="size-5 shrink-0" />
                  {t.readingAloud}
                </p>
              ) : null}
            </div>
            <p className={cn("mt-2 whitespace-pre-wrap", size)}>{message.text}</p>
            {!isUser ? (
              <>
                {message.limitations.length > 0 ? (
                  <div className="mt-3">
                    <h4 className="font-semibold">{t.limitations}</h4>
                    <ul className="mt-1 list-disc ps-6">
                      {message.limitations.map((limitation, i) => (
                        <li key={i}>{limitation}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <Sources message={message} />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    className={TARGET}
                    disabled={loading}
                    aria-label={playing ? t.stopAudioFor(index) : t.listenTo(index)}
                    onClick={() => (playing ? audio.onStop() : audio.onPlay(message.messageId))}
                  >
                    {playing ? <Square aria-hidden /> : <Volume2 aria-hidden />}
                    {loading ? t.audioLoading : playing ? t.stopAudio : t.listen}
                  </Button>
                  {latest && onSimpler ? (
                    <Button variant="outline" className={TARGET} onClick={onSimpler}>
                      {t.simpler}
                    </Button>
                  ) : null}
                  {audio.failedId === message.messageId ? (
                    <p role="alert" className="font-semibold text-destructive">
                      {t.audioError}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </article>
        );
      })}
      {pendingQuestion ? (
        <article
          data-message
          tabIndex={-1}
          aria-labelledby="message-pending"
          className="ms-auto w-fit max-w-[90%] rounded-xl border-2 border-foreground bg-accent p-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <h3 id="message-pending" className="flex items-center gap-2 text-base font-bold tracking-wide uppercase">
            <User aria-hidden className="size-5 shrink-0" />
            {t.questionHeading(questions + 1)}
          </h3>
          <p className={cn("mt-2 whitespace-pre-wrap", size)}>{pendingQuestion}</p>
        </article>
      ) : null}
      <div ref={end} />
    </div>
  );
}
