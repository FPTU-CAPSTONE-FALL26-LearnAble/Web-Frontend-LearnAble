import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Contrast, Keyboard, MessageSquareText, Mic, Square } from "lucide-react";
import { Link } from "react-router";
import { ApiFailure } from "@/api/client";
import {
  CurriculumLookupFailure,
  deleteAssistantConversation,
  getAssistantConversations,
  startAssistantConversation,
  type AssistantConversation,
} from "@/api/learningAssistant";
import { PageKeys } from "@/lib/a11y/PageKeys";
import { announce } from "@/shared/a11y/announcer";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/primitives/alert-dialog";
import { Button } from "@/shared/ui/primitives/button";
import { useAssistantCourses } from "@/features/assistant/api/useAssistantCourses";
import { ChatComposer } from "@/features/assistant/components/ChatComposer";
import { ConversationHistory } from "@/features/assistant/components/ConversationHistory";
import { LiveVoice } from "@/features/assistant/components/LiveVoice";
import { LATEST_ANSWER_ID, MessageLog } from "@/features/assistant/components/MessageLog";
import { ShortcutsDialog } from "@/features/assistant/components/ShortcutsDialog";
import { VoicePanel, type VoiceState } from "@/features/assistant/components/VoicePanel";
import {
  messagesKey,
  useAssistantChat,
  type AskOutcome,
} from "@/features/assistant/hooks/useAssistantChat";
import {
  ASSISTANT_SHORTCUTS,
  useAssistantShortcuts,
} from "@/features/assistant/hooks/useAssistantShortcuts";
import { useBeep } from "@/features/assistant/hooks/useBeep";
import { useMessageAudio } from "@/features/assistant/hooks/useMessageAudio";
import { useRealtimeVoice } from "@/features/assistant/hooks/useRealtimeVoice";
import { useStoredState } from "@/features/assistant/hooks/useStoredState";
import {
  useSpeechRecognition,
  type SpeechFailure,
  type SpeechLanguage,
} from "@/features/assistant/hooks/useSpeechRecognition";
import {
  FIELD,
  TARGET,
  TEXT_SIZE,
  conversationTitle,
  courseNameOf,
  type TextSize,
} from "@/features/assistant/ui";

const t = vi.assistant;
const conversationsKey = (courseId: string | null) => ["assistant", "conversations", courseId];

type Mode = "chat" | "voice";
const TEXT_SIZES: TextSize[] = ["normal", "large", "xlarge"];

/** SCR-05 — FR-08 (FFCB-139): ask about one course by text or by voice, with cited sources. */
export function AssistantRoute() {
  useRouteAnnouncer(t.pageTitle, t.title);
  const client = useQueryClient();

  const coursesQuery = useAssistantCourses();
  const courses = coursesQuery.data ?? [];
  // The Backend lists conversations one course at a time; start on the first course.
  const [chosenCourseId, setChosenCourseId] = useState<string | null>(null);
  const courseId = chosenCourseId ?? courses[0]?.courseId ?? null;
  const conversations = useQuery({
    queryKey: conversationsKey(courseId),
    queryFn: () => getAssistantConversations(courseId!),
    enabled: !!courseId,
    meta: { silent: true },
  });

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("chat");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [deleting, setDeleting] = useState<AssistantConversation | null>(null);

  const conversation =
    conversations.data?.find((item) => item.conversationId === conversationId) ?? null;
  const chat = useAssistantChat(conversationId);
  const audio = useMessageAudio(conversationId);
  const speech = useSpeechRecognition();
  const live = useRealtimeVoice();
  const beep = useBeep();

  const composer = useRef<HTMLTextAreaElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const focusComposer = useRef(false);
  /** Set when a conversation was deleted: its row, which had focus, no longer exists. */
  const focusNewButton = useRef(false);
  useEffect(() => {
    if (!focusComposer.current || !composer.current) return;
    focusComposer.current = false;
    composer.current.focus();
  });

  // ── Voice mode ───────────────────────────────────────────────────────────
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [handsFree, setHandsFree] = useState(false);
  const [language, setLanguage] = useState<SpeechLanguage>("vi-VN");
  // Reading preferences, kept on this device.
  const [textSize, setTextSize] = useStoredState<TextSize>("learnable.assistant.textSize", "normal");
  const [autoRead, setAutoRead] = useStoredState<boolean>("learnable.assistant.autoRead", false);
  /** Bumped by every stop, so a finished step of an abandoned turn does nothing. */
  const turn = useRef(0);
  const settings = useRef({ handsFree, language, mode, autoRead, courseId });
  settings.current = { handsFree, language, mode, autoRead, courseId };

  const { ask, stop: stopAsking } = chat;
  const { play, stop: stopAudio } = audio;
  const { listen, stop: stopListening } = speech;
  const { start: startLive, stop: stopLive, state: liveState } = live;

  /** The first question of a new conversation starts it, so there is no separate "create" step. */
  const ensureConversation = useCallback(async () => {
    const course = settings.current.courseId;
    if (!course) throw new Error("no course");
    const created = await startAssistantConversation(course);
    client.setQueryData<AssistantConversation[]>(conversationsKey(course), (current) => [
      created,
      ...(current ?? []).filter((item) => item.conversationId !== created.conversationId),
    ]);
    client.setQueryData(messagesKey(created.conversationId), []);
    setConversationId(created.conversationId);
    return created.conversationId;
  }, [client]);

  /**
   * Asks, then tells the student once. In chat mode the screen reader gets the
   * source count and the answer itself; when the answer is played as audio it
   * gets the count only, so two voices never talk over each other.
   */
  const askQuestion = useCallback(
    async (question: string, spokenByCaller = false): Promise<AskOutcome> => {
      const outcome = await ask(question, ensureConversation);
      if (outcome.status !== "answered") return outcome;
      const { answer } = outcome;
      const ready = t.answerReady(answer.sources.length);
      const audible = spokenByCaller || settings.current.autoRead;
      announce(audible ? ready : `${ready}. ${answer.text}`);
      if (!spokenByCaller && settings.current.autoRead) void play(answer.messageId);
      return outcome;
    },
    [ask, ensureConversation, play],
  );

  const failVoice = useCallback(
    (message: string) => {
      setVoice("error");
      setVoiceError(message);
      beep("error");
      announce(message, { assertive: true });
    },
    [beep],
  );

  const startListening = useCallback(() => {
    const mine = ++turn.current;
    // Speaking over the answer interrupts it.
    stopAudio();
    setVoiceError(null);
    setTranscript(null);
    setVoice("listening");
    beep("listen");
    announce(t.voice.state.listening);
    listen({
      language: settings.current.language,
      onError: (failure: SpeechFailure) => {
        if (mine !== turn.current) return;
        failVoice(
          failure === "denied"
            ? t.voice.micDenied
            : failure === "no-speech"
              ? t.voice.nothingHeard
              : t.voice.recognitionError,
        );
      },
      onResult: async (heard) => {
        if (mine !== turn.current) return;
        setTranscript(heard);
        setVoice("waiting");
        beep("waiting");
        const outcome = await askQuestion(heard, true);
        if (mine !== turn.current) return;
        if (outcome.status !== "answered") {
          if (outcome.status === "failed") {
            setVoice("error");
            setVoiceError(t.askError);
            beep("error");
          } else {
            setVoice("idle");
          }
          return;
        }
        setVoice("speaking");
        const finished = await play(outcome.answer.messageId);
        if (mine !== turn.current) return;
        setVoice("idle");
        if (finished && settings.current.handsFree && settings.current.mode === "voice") {
          startListening();
        }
      },
    });
  }, [askQuestion, beep, failVoice, listen, play, stopAudio]);

  const isBusy =
    chat.pendingQuestion !== null ||
    audio.playingId !== null ||
    audio.loadingId !== null ||
    speech.listening ||
    liveState !== "idle";

  /** Esc: stop listening, stop the audio and stop waiting for an answer. */
  const stopAll = useCallback(() => {
    turn.current += 1;
    stopListening();
    stopAudio();
    stopAsking();
    if (liveState !== "idle") {
      stopLive();
      // The Backend may have stored the spoken turns; show them if it did.
      void client.invalidateQueries({ queryKey: ["assistant", "messages"] });
    }
    setVoice("idle");
    setVoiceError(null);
    announce(t.voice.stoppedAll);
  }, [client, liveState, stopAsking, stopAudio, stopLive, stopListening]);

  // ── Live voice (WebRTC) ──────────────────────────────────────────────────
  const conversationRef = useRef(conversationId);
  conversationRef.current = conversationId;
  const startLiveVoice = useCallback(() => {
    // One microphone, one voice: end the turn-based exchange first.
    turn.current += 1;
    stopListening();
    stopAudio();
    stopAsking();
    setVoice("idle");
    setVoiceError(null);
    announce(t.voice.live.state.connecting);
    void startLive({
      conversation: async () => conversationRef.current ?? (await ensureConversation()),
      onLive: () => {
        beep("listen");
        announce(t.voice.live.state.live);
      },
      onFailure: (failure) => {
        beep("error");
        announce(t.voice.live.failure[failure], { assertive: true });
      },
    });
  }, [beep, ensureConversation, startLive, stopAsking, stopAudio, stopListening]);

  const endLiveVoice = useCallback(() => {
    stopLive();
    void client.invalidateQueries({ queryKey: ["assistant", "messages"] });
    announce(t.voice.live.ended);
  }, [client, stopLive]);

  const toggleListening = useCallback(() => {
    if (liveState !== "idle") return;
    if (speech.listening) {
      turn.current += 1;
      stopListening();
      setVoice("idle");
      announce(t.voice.state.idle);
    } else {
      startListening();
    }
  }, [liveState, speech.listening, startListening, stopListening]);

  const changeMode = useCallback(
    (next: Mode) => {
      if (next === mode || (next === "voice" && !speech.supported)) return;
      if (isBusy) stopAll();
      setMode(next);
      announce(t.modeChanged(next === "chat" ? t.modeChat : t.modeVoice));
      if (next === "chat") focusComposer.current = true;
    },
    [isBusy, mode, speech.supported, stopAll],
  );

  // ── Conversations ────────────────────────────────────────────────────────
  const openConversation = useCallback(
    (id: string | null) => {
      if (isBusy) stopAll();
      setConversationId(id);
      setTranscript(null);
      chat.clearFailure();
      if (mode === "chat") focusComposer.current = true;
    },
    [chat, isBusy, mode, stopAll],
  );

  const courseLabel = courses.find((course) => course.courseId === courseId)?.name ?? null;
  const newConversation = () => {
    openConversation(null);
    focusComposer.current = mode === "chat";
    announce(courseLabel ? t.newConversationReady(courseLabel) : t.chooseCourseFirst);
  };

  const remove = useMutation({
    mutationFn: (target: AssistantConversation) =>
      deleteAssistantConversation(target.conversationId),
    onSuccess: (_, target) => {
      client.setQueryData<AssistantConversation[]>(conversationsKey(courseId), (current) =>
        (current ?? []).filter((item) => item.conversationId !== target.conversationId),
      );
      if (target.conversationId === conversationId) {
        openConversation(null);
        focusComposer.current = false;
      }
      setDeleting(null);
      announce(t.deleted);
      focusNewButton.current = true;
    },
    onError: () => announce(t.deleteError, { assertive: true }),
  });

  // ── Chat ─────────────────────────────────────────────────────────────────
  const send = (question: string) => {
    void askQuestion(question);
    composer.current?.focus();
  };

  const messages = chat.messages.data ?? [];
  const lastAnswer = [...messages].reverse().find((message) => message.role === "assistant");

  useAssistantShortcuts({
    newConversation,
    toggleMode: () => changeMode(mode === "chat" ? "voice" : "chat"),
    talk: () => {
      if (mode !== "voice" || !courseId) return false;
      toggleListening();
    },
    replay: () => {
      if (!lastAnswer) return false;
      void play(lastAnswer.messageId);
    },
    latestAnswer: () => {
      const heading = document.getElementById(LATEST_ANSWER_ID);
      if (!heading) {
        announce(t.noAnswerYet);
        return;
      }
      heading.focus();
    },
    stop: () => {
      if (!isBusy) return false;
      stopAll();
    },
    help: () => setShortcutsOpen(true),
  });

  const waiting = chat.pendingQuestion !== null;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const seconds = Math.round((Date.now() - started) / 1000);
      setElapsed(seconds);
      // A long silence sounds like a frozen page; confirm every ten seconds that it is not.
      if (seconds > 0 && seconds % 10 === 0) announce(t.stillSearching(seconds));
    }, 1000);
    return () => {
      clearInterval(timer);
      setElapsed(0);
    };
  }, [waiting]);

  const courseName = conversation ? courseNameOf(conversation, courses) : courseLabel;

  return (
    <div className="flex flex-col gap-6 text-lg">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 tabIndex={-1} className="text-3xl font-bold">
            {t.title}
          </h1>
          <p className="mt-2 text-muted-foreground">{t.intro}</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div role="group" aria-label={t.textSize} className="flex items-center gap-2">
            <span aria-hidden className="font-semibold">
              {t.textSize}
            </span>
            {TEXT_SIZES.map((size) => (
              <Button
                key={size}
                variant={textSize === size ? "default" : "outline"}
                className={TARGET}
                aria-pressed={textSize === size}
                onClick={() => {
                  setTextSize(size);
                  announce(t.textSizeChanged(t.textSizes[size]));
                }}
              >
                {t.textSizes[size]}
              </Button>
            ))}
          </div>
          <Button asChild variant="outline" className={TARGET}>
            <Link to="/settings/accessibility">
              <Contrast aria-hidden />
              {t.colourSettings}
            </Link>
          </Button>
          <Button
            variant="outline"
            className={TARGET}
            onClick={() => setShortcutsOpen(true)}
            aria-keyshortcuts="Control+/"
          >
            <Keyboard aria-hidden />
            {t.shortcuts.open}
            <kbd className="font-mono text-sm">{ASSISTANT_SHORTCUTS.help}</kbd>
          </Button>
        </div>
      </header>

      {/* The conversation comes first in reading and tab order; the history follows it. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="assistant-conversation" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="assistant-course" className="font-semibold">
              {t.historyCourseLabel}
            </label>
            <select
              id="assistant-course"
              className={FIELD}
              value={courseId ?? ""}
              disabled={courses.length === 0}
              aria-describedby="assistant-course-hint"
              onChange={(event) => {
                const next = event.target.value;
                openConversation(null);
                focusComposer.current = false;
                setChosenCourseId(next);
                const name = courses.find((course) => course.courseId === next)?.name;
                if (name) announce(t.courseChanged(name));
              }}
            >
              {courses.length === 0 ? <option value="">{t.coursePlaceholder}</option> : null}
              {courses.map((course) => (
                <option key={course.courseId} value={course.courseId}>
                  {course.name}
                </option>
              ))}
            </select>
            <p id="assistant-course-hint" className="text-muted-foreground">
              {t.historyCourseHint}
            </p>
            {coursesQuery.isPending ? <p role="status">{t.coursesLoading}</p> : null}
            {coursesQuery.isError ? (
              <div role="alert" className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="font-semibold text-destructive">{t.coursesError}</p>
                  {coursesQuery.error instanceof CurriculumLookupFailure ? (
                    <p>
                      {t.coursesErrorStep[coursesQuery.error.step]}
                      {coursesQuery.error.reason ? ` (${coursesQuery.error.reason})` : null}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="secondary"
                  className={TARGET}
                  onClick={() => coursesQuery.refetch()}
                >
                  {vi.common.retry}
                </Button>
              </div>
            ) : null}
            {coursesQuery.data && courses.length === 0 ? <p>{t.coursesEmpty}</p> : null}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-border pb-4">
            <div className="min-w-0">
              <h2 id="assistant-conversation" className="text-2xl font-semibold break-words">
                {conversation
                  ? conversationTitle(conversation, courses)
                  : courseLabel
                    ? t.newConversationTitle(courseLabel)
                    : t.newTitle}
              </h2>
              {conversation && courseName ? (
                <p className="mt-1">{t.courseScope(courseName)}</p>
              ) : null}
              {!conversation ? (
                <p className="mt-1 text-muted-foreground">
                  {courseId ? t.newConversationHint : t.chooseCourseFirst}
                </p>
              ) : null}
            </div>
            <div role="group" aria-label={t.modeLabel} className="flex gap-2">
              <Button
                variant={mode === "chat" ? "default" : "outline"}
                className={TARGET}
                aria-pressed={mode === "chat"}
                onClick={() => changeMode("chat")}
              >
                <MessageSquareText aria-hidden />
                {t.modeChat}
              </Button>
              <Button
                variant={mode === "voice" ? "default" : "outline"}
                className={TARGET}
                aria-pressed={mode === "voice"}
                disabled={!speech.supported}
                aria-describedby={speech.supported ? undefined : "assistant-voice-unsupported"}
                onClick={() => changeMode("voice")}
              >
                <Mic aria-hidden />
                {t.modeVoice}
              </Button>
            </div>
          </div>
          {!speech.supported ? (
            <p id="assistant-voice-unsupported" className="text-muted-foreground">
              {t.voiceUnsupported}
            </p>
          ) : null}

          {conversationId && chat.messages.isPending ? (
            <p role="status">{t.messagesLoading}</p>
          ) : null}
          {conversationId && chat.messages.isError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-destructive p-4"
            >
              <p className="font-semibold text-destructive">{t.messagesError}</p>
              <Button variant="secondary" className={TARGET} onClick={() => chat.messages.refetch()}>
                {vi.common.retry}
              </Button>
            </div>
          ) : null}

          {!conversationId || chat.messages.data ? (
            <MessageLog
              messages={messages}
              pendingQuestion={chat.pendingQuestion}
              textSize={textSize}
              onSimpler={waiting || !courseId ? undefined : () => void askQuestion(t.simplerPrompt)}
              audio={{
                playingId: audio.playingId,
                loadingId: audio.loadingId,
                failedId: audio.failedId,
                onPlay: (messageId) => void play(messageId),
                onStop: stopAudio,
              }}
            />
          ) : null}

          {waiting ? (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-foreground p-4">
              <p className={cn("font-semibold", TEXT_SIZE[textSize], "motion-safe:animate-pulse")}>
                {t.searching}{" "}
                <span className="font-mono tabular-nums">{t.elapsed(elapsed)}</span>
              </p>
              <Button variant="secondary" className={TARGET} onClick={stopAsking}>
                <Square aria-hidden />
                {t.stop}
                <kbd className="font-mono text-sm">{ASSISTANT_SHORTCUTS.stop}</kbd>
              </Button>
            </div>
          ) : null}

          {chat.failure ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-destructive p-4"
            >
              <p className="font-semibold text-destructive">{chat.failure.message}</p>
              <Button
                variant="secondary"
                className={TARGET}
                onClick={() => void askQuestion(chat.failure!.question)}
              >
                {t.retry}
              </Button>
            </div>
          ) : null}

          {mode === "chat" ? (
            <>
              <ChatComposer
                ref={composer}
                pending={waiting}
                enabled={!!courseId}
                textClass={TEXT_SIZE[textSize]}
                onSend={send}
              />
              <div>
                <label className="flex min-h-11 items-center gap-3 font-semibold">
                  <input
                    type="checkbox"
                    className="size-6 accent-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    checked={autoRead}
                    onChange={(event) => setAutoRead(event.target.checked)}
                    aria-describedby="assistant-auto-read-hint"
                  />
                  {t.autoRead}
                </label>
                <p id="assistant-auto-read-hint" className="text-muted-foreground">
                  {t.autoReadHint}
                </p>
              </div>
            </>
          ) : (
            <VoicePanel
              state={voice}
              error={voiceError}
              transcript={transcript}
              handsFree={handsFree}
              onHandsFreeChange={setHandsFree}
              language={language}
              onLanguageChange={setLanguage}
              onToggleListening={toggleListening}
              onStopAll={stopAll}
              liveActive={liveState !== "idle"}
            />
          )}
          {mode === "voice" ? (
            <LiveVoice
              supported={live.supported}
              enabled={!!courseId}
              state={liveState}
              failure={live.failure}
              onStart={startLiveVoice}
              onStop={endLiveVoice}
            />
          ) : null}
        </section>

        <ConversationHistory
          ref={newButton}
          conversations={conversations.data}
          courses={courses}
          courseId={courseId}
          isPending={conversations.isPending}
          isError={conversations.isError}
          errorDetail={
            conversations.error instanceof ApiFailure ? conversations.error.serverMessage : null
          }
          onRetry={() => conversations.refetch()}
          selectedId={conversationId}
          onSelect={openConversation}
          onNew={newConversation}
          onDelete={setDeleting}
        />
      </div>

<PageKeys
        keys={[
          mode === "chat"
            ? (["Enter", t.keys.send] as const)
            : ([ASSISTANT_SHORTCUTS.talk, t.keys.talk] as const),
          ["↑ ↓", t.keys.messages],
          [ASSISTANT_SHORTCUTS.latestAnswer, t.keys.latestAnswer],
          [ASSISTANT_SHORTCUTS.stop, t.keys.stop],
          [ASSISTANT_SHORTCUTS.help, t.keys.help],
        ]}
      />

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            if (!focusNewButton.current) return;
            // Land on a control that still exists instead of the deleted row.
            focusNewButton.current = false;
            event.preventDefault();
            newButton.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? t.deleteDescription(conversationTitle(deleting, courses)) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.isError ? (
            <p role="alert" className="font-semibold text-destructive">
              {t.deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className={TARGET}>{vi.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className={TARGET}
              disabled={remove.isPending}
              onClick={(event) => {
                // Keep the dialog open until the Backend has confirmed.
                event.preventDefault();
                if (deleting) remove.mutate(deleting);
              }}
            >
              {t.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
