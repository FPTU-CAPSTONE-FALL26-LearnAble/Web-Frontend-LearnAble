import { useCallback, useEffect, useRef, useState } from "react";
import { startAssistantRealtimeSession } from "@/api/learningAssistant";

/**
 * Live voice with the assistant over WebRTC: the microphone goes up, the
 * assistant's voice comes back, with no "send" step in between.
 *
 * This is the standard signalling only — microphone, SDP offer, the Backend's
 * answer (`POST …/realtime/sessions`), remote audio. The OpenAPI document also
 * mentions a "voice client bridge" that authorises each question; it is not
 * described anywhere, so nothing is sent beyond the offer.
 */

export type RealtimeState = "idle" | "connecting" | "live";
export type RealtimeFailure = "unsupported" | "denied" | "failed" | "lost";

/** How long to wait for ICE candidates before sending the offer as it is. */
const ICE_WAIT_MS = 3000;

export const isRealtimeVoiceSupported = () =>
  typeof window !== "undefined" &&
  typeof window.RTCPeerConnection === "function" &&
  typeof navigator.mediaDevices?.getUserMedia === "function";

function iceGathered(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      connection.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => {
      if (connection.iceGatheringState === "complete") done();
    };
    const timer = setTimeout(done, ICE_WAIT_MS);
    connection.addEventListener("icegatheringstatechange", check);
  });
}

type Live = { connection: RTCPeerConnection; stream: MediaStream; player: HTMLAudioElement };

type StartOptions = {
  /** Resolves the conversation to talk in, creating it when there is none yet. */
  conversation: () => Promise<string>;
  onLive?: () => void;
  onFailure?: (failure: RealtimeFailure) => void;
};

export function useRealtimeVoice() {
  const [state, setState] = useState<RealtimeState>("idle");
  const [failure, setFailure] = useState<RealtimeFailure | null>(null);
  const live = useRef<Live | null>(null);
  /** Bumped by every start and stop, so an abandoned start cleans up after itself. */
  const run = useRef(0);

  const release = useCallback((target: Live | null) => {
    if (!target) return;
    target.connection.onconnectionstatechange = null;
    target.connection.ontrack = null;
    target.stream.getTracks().forEach((track) => track.stop());
    target.connection.close();
    target.player.pause();
    target.player.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    run.current += 1;
    release(live.current);
    live.current = null;
    setState("idle");
  }, [release]);

  const start = useCallback(
    async ({ conversation, onLive, onFailure }: StartOptions) => {
      const mine = ++run.current;
      release(live.current);
      live.current = null;
      const fail = (reason: RealtimeFailure) => {
        if (mine !== run.current) return;
        release(live.current);
        live.current = null;
        setState("idle");
        setFailure(reason);
        onFailure?.(reason);
      };
      setFailure(null);
      if (!isRealtimeVoiceSupported()) return fail("unsupported");
      setState("connecting");

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        return fail(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "failed");
      }
      const connection = new RTCPeerConnection();
      const player = new Audio();
      player.autoplay = true;
      const current: Live = { connection, stream, player };
      if (mine !== run.current) return release(current);
      live.current = current;

      try {
        stream.getTracks().forEach((track) => connection.addTrack(track, stream));
        connection.ontrack = (event) => {
          player.srcObject = event.streams[0] ?? new MediaStream([event.track]);
          void player.play().catch(() => undefined);
        };
        connection.onconnectionstatechange = () => {
          if (mine !== run.current) return;
          const status = connection.connectionState;
          if (status === "failed" || status === "disconnected" || status === "closed") fail("lost");
        };
        await connection.setLocalDescription(await connection.createOffer());
        await iceGathered(connection);
        const offer = connection.localDescription?.sdp;
        if (!offer) throw new Error("no offer");
        const conversationId = await conversation();
        if (mine !== run.current) return;
        const answer = await startAssistantRealtimeSession(conversationId, offer);
        if (mine !== run.current) return;
        await connection.setRemoteDescription({ type: "answer", sdp: answer.sdp });
        if (mine !== run.current) return;
        setState("live");
        onLive?.();
      } catch {
        fail("failed");
      }
    },
    [release],
  );

  useEffect(() => stop, [stop]);

  return { supported: isRealtimeVoiceSupported(), state, failure, start, stop };
}
