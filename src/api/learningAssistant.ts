import { z } from "zod";
import { ApiFailure, envelopeFailure, request, requestBlob } from "@/api/client";
import { readCurriculumSubjects } from "@/api/admin";
import { getCurrentUser } from "@/api/auth";
import { queryString } from "@/api/catalog";

/**
 * Student learning assistant (FR-08 · FFCB-139), as deployed under the
 * `LearningAssistant` tag of the OpenAPI document:
 *
 *   POST   /me/learning-assistant/conversations                       body: StartAssistantConversationRequestModel
 *   GET    /me/learning-assistant/conversations                       ?courseId&PageNumber&PageSize
 *   GET    /me/learning-assistant/conversations/{id}/messages         ?PageNumber&PageSize
 *   POST   /me/learning-assistant/conversations/{id}/messages         body: AskAssistantRequestModel
 *   POST   /me/learning-assistant/conversations/{id}/messages/{messageId}/audio
 *   DELETE /me/learning-assistant/conversations/{id}
 *   POST   /me/learning-assistant/conversations/{id}/realtime/sessions  body: StartAssistantRealtimeRequestModel
 *
 * Only the answer to a question (`AssistantAnswerResponseModel`) has a declared
 * response body. The conversation, message and audio responses are undeclared,
 * so they are read through tolerant schemas that accept the likely spellings
 * and are normalised in one place; a different shape degrades to missing
 * titles or dates instead of breaking the page.
 *
 * Questions are sent with `stream: false`, the documented JSON reply. The SSE
 * variant is not used: its event format is not described anywhere.
 */

const BASE = "/me/learning-assistant/conversations";
const id = encodeURIComponent;

function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.boolean(),
    message: z.string().nullable().optional(),
    data: data.nullable().optional(),
    errors: z.array(z.string()).nullable().optional(),
  });
}

async function call<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init?: RequestInit & { json?: unknown },
): Promise<z.output<T>> {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data === null || response.data === undefined) {
    throw envelopeFailure(response);
  }
  return response.data as z.output<T>;
}

/** A list arrives either as a page (`{ items }`) or as a bare array. */
const listOf = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([z.array(item), z.object({ items: z.array(item).nullable().optional() })])
    .transform((value): z.output<T>[] => (Array.isArray(value) ? value : (value.items ?? [])));

const text = z.string().nullish();

// ── Sources ────────────────────────────────────────────────────────────────

const sourceSchema = z.object({
  id: text,
  type: text,
  title: text,
  url: text,
  materialId: text,
  pageNumber: z.number().nullish(),
  slideNumber: z.number().nullish(),
});

export type AssistantSource = {
  key: string;
  title: string | null;
  type: string | null;
  url: string | null;
  pageNumber: number | null;
  slideNumber: number | null;
};

const toSources = (rows: z.infer<typeof sourceSchema>[] | null | undefined): AssistantSource[] =>
  (rows ?? []).map((row, index) => ({
    key: row.id ?? row.materialId ?? String(index),
    title: row.title?.trim() || null,
    type: row.type?.trim() || null,
    // Only web links are followed; anything else is shown as text.
    url: row.url && /^https?:\/\//i.test(row.url) ? row.url : null,
    pageNumber: row.pageNumber ?? null,
    slideNumber: row.slideNumber ?? null,
  }));

// ── Conversations ──────────────────────────────────────────────────────────

const conversationSchema = z.object({
  conversationId: text,
  id: text,
  courseId: text,
  courseName: text,
  courseCode: text,
  title: text,
  createdAt: text,
  updatedAt: text,
  lastMessageAt: text,
});

export type AssistantConversation = {
  conversationId: string;
  courseId: string | null;
  courseName: string | null;
  title: string | null;
  /** The most recent activity the Backend reported, if any. */
  updatedAt: string | null;
};

function toConversation(row: z.infer<typeof conversationSchema>): AssistantConversation | null {
  const conversationId = row.conversationId ?? row.id;
  if (!conversationId) return null;
  return {
    conversationId,
    courseId: row.courseId ?? null,
    courseName: row.courseName?.trim() || row.courseCode?.trim() || null,
    title: row.title?.trim() || null,
    updatedAt: row.lastMessageAt ?? row.updatedAt ?? row.createdAt ?? null,
  };
}

/**
 * GET /me/learning-assistant/conversations. The Backend lists one course at a
 * time and refuses a request without `courseId` ("A subject is required.").
 */
export async function getAssistantConversations(courseId: string): Promise<AssistantConversation[]> {
  const rows = await call(
    `${BASE}${queryString({ courseId, PageNumber: 1, PageSize: 100 })}`,
    listOf(conversationSchema),
  );
  return rows
    .map(toConversation)
    .filter((row): row is AssistantConversation => row !== null)
    .map((row) => ({ ...row, courseId: row.courseId ?? courseId }));
}

/** POST /me/learning-assistant/conversations — a conversation is fixed to one course. */
export async function startAssistantConversation(courseId: string): Promise<AssistantConversation> {
  const conversation = toConversation(
    await call(BASE, conversationSchema, { method: "POST", json: { courseId } }),
  );
  if (!conversation) throw envelopeFailure({ message: null });
  return { ...conversation, courseId: conversation.courseId ?? courseId };
}

/** DELETE /me/learning-assistant/conversations/{id} — the envelope carries no data. */
export async function deleteAssistantConversation(conversationId: string): Promise<void> {
  const response = await request(`${BASE}/${id(conversationId)}`, envelope(z.unknown()), {
    method: "DELETE",
  });
  if (!response.success) throw envelopeFailure(response);
}

// ── Messages ───────────────────────────────────────────────────────────────

const messageSchema = z.object({
  messageId: text,
  id: text,
  role: text,
  sender: text,
  content: text,
  message: text,
  answer: text,
  evidenceStatus: text,
  sources: z.array(sourceSchema).nullish(),
  limitations: z.array(z.string()).nullish(),
  createdAt: text,
});

export type AssistantMessage = {
  messageId: string;
  role: "user" | "assistant";
  text: string;
  sources: AssistantSource[];
  limitations: string[];
  /** The Backend's own verdict on how well the answer is supported, as sent. */
  evidenceStatus: string | null;
  createdAt: string | null;
};

function toMessage(row: z.infer<typeof messageSchema>, index: number): AssistantMessage {
  const role = (row.role ?? row.sender ?? "").toLowerCase();
  return {
    messageId: row.messageId ?? row.id ?? `message-${index}`,
    role: role === "user" || role === "student" ? "user" : "assistant",
    text: row.content ?? row.answer ?? row.message ?? "",
    sources: toSources(row.sources),
    limitations: row.limitations ?? [],
    evidenceStatus: row.evidenceStatus ?? null,
    createdAt: row.createdAt ?? null,
  };
}

/** GET /me/learning-assistant/conversations/{id}/messages — oldest first. */
export async function getAssistantMessages(conversationId: string): Promise<AssistantMessage[]> {
  const rows = await call(
    `${BASE}/${id(conversationId)}/messages${queryString({ PageNumber: 1, PageSize: 100 })}`,
    listOf(messageSchema),
  );
  const messages = rows.map(toMessage);
  const time = (message: AssistantMessage) =>
    message.createdAt ? new Date(message.createdAt).getTime() : Number.NaN;
  // Keep the Backend's order unless every message is dated.
  return messages.every((message) => !Number.isNaN(time(message)))
    ? [...messages].sort((a, b) => time(a) - time(b))
    : messages;
}

const answerSchema = z.object({
  messageId: z.string(),
  answer: z.string().nullable().optional(),
  evidenceStatus: z.string().nullable().optional(),
  sources: z.array(sourceSchema).nullable().optional(),
  usedWebSearch: z.boolean().optional(),
  limitations: z.array(z.string()).nullable().optional(),
});

/**
 * POST /me/learning-assistant/conversations/{id}/messages. The Backend answers
 * only after it has validated the citations, so this can take a while; pass a
 * signal to let the student stop waiting.
 */
export async function askAssistant(
  conversationId: string,
  message: string,
  signal?: AbortSignal,
): Promise<AssistantMessage> {
  const data = await call(`${BASE}/${id(conversationId)}/messages`, answerSchema, {
    method: "POST",
    json: { message, stream: false },
    signal,
  });
  return {
    messageId: data.messageId,
    role: "assistant",
    text: data.answer ?? "",
    sources: toSources(data.sources),
    limitations: data.limitations ?? [],
    evidenceStatus: data.evidenceStatus ?? null,
    createdAt: new Date().toISOString(),
  };
}

// ── Audio ──────────────────────────────────────────────────────────────────

const audioLinkSchema = z.object({
  data: z
    .object({ audioUrl: text, url: text, presignedUrl: text })
    .nullable()
    .optional(),
});

/**
 * POST …/messages/{messageId}/audio. The response is undeclared: an audio file
 * is played from a local object URL, a JSON envelope is searched for a link.
 * Returns a URL an `<audio>` element can play.
 */
export async function getAssistantMessageAudio(
  conversationId: string,
  messageId: string,
): Promise<string> {
  const { blob } = await requestBlob(
    `${BASE}/${id(conversationId)}/messages/${id(messageId)}/audio`,
    { method: "POST" },
  );
  if (!/json/i.test(blob.type)) return URL.createObjectURL(blob);
  let body: unknown;
  try {
    body = JSON.parse(await blob.text());
  } catch {
    throw envelopeFailure({ message: null });
  }
  const parsed = audioLinkSchema.safeParse(body);
  const link = parsed.success
    ? (parsed.data.data?.audioUrl ?? parsed.data.data?.url ?? parsed.data.data?.presignedUrl)
    : null;
  if (!link) throw envelopeFailure(body);
  return link;
}

// ── Realtime voice ─────────────────────────────────────────────────────────

const realtimeSessionSchema = z.object({
  conversationId: z.string().nullable().optional(),
  sdp: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  voice: z.string().nullable().optional(),
});

export type AssistantRealtimeSession = {
  conversationId: string;
  /** The WebRTC answer for `RTCPeerConnection.setRemoteDescription`. */
  sdp: string;
  model: string | null;
  voice: string | null;
};

/**
 * POST …/realtime/sessions — exchanges the browser's audio SDP offer for the
 * Backend's WebRTC answer (`AssistantRealtimeSessionResponseModel`).
 *
 * This is the signalling step only. The OpenAPI document says each question
 * must then be authorised through a "voice client bridge", which it does not
 * describe, so no screen opens a realtime session yet.
 */
export async function startAssistantRealtimeSession(
  conversationId: string,
  offerSdp: string,
  signal?: AbortSignal,
): Promise<AssistantRealtimeSession> {
  const data = await call(`${BASE}/${id(conversationId)}/realtime/sessions`, realtimeSessionSchema, {
    method: "POST",
    json: { sdp: offerSdp },
    signal,
  });
  // An answer without SDP cannot be applied to the peer connection.
  if (!data.sdp?.trim()) throw envelopeFailure({ message: null });
  return {
    conversationId: data.conversationId ?? conversationId,
    sdp: data.sdp,
    model: data.model ?? null,
    voice: data.voice ?? null,
  };
}

// ── Subjects the student may ask about ─────────────────────────────────────

const ownProfileSchema = envelope(z.object({ curriculumId: z.string().nullable().optional() }));

/**
 * The ids of the subjects in the student's own curriculum. The assistant
 * refuses any other subject ("Subject is not available in your curriculum.").
 *
 * There is no "my subjects" endpoint, so this follows the student's profile:
 *   GET /auth/me                       → `userId`
 *   GET /StudentProfiles/{userId}      → `curriculumId`
 *   GET /Curriculums/{id}/subjects     → the subject ids (undeclared response)
 * Returns null when the student has no curriculum.
 */
export async function getMyCurriculumSubjectIds(): Promise<string[] | null> {
  const { id: userId } = await at("account", getCurrentUser);
  const curriculumId = await at("profile", async () => {
    const profile = await request(`/StudentProfiles/${id(userId)}`, ownProfileSchema);
    if (!profile.success) throw envelopeFailure(profile);
    return profile.data?.curriculumId ?? null;
  });
  if (!curriculumId) return null;
  return at("curriculum", async () => {
    const subjects = await request(
      `/Curriculums/${id(curriculumId)}/subjects`,
      envelope(z.unknown()),
    );
    if (!subjects.success) throw envelopeFailure(subjects);
    return readCurriculumSubjects(subjects.data).subjectIds;
  });
}

export type CurriculumLookupStep = "account" | "profile" | "curriculum";

/** Which of the chained requests failed, so the page can say so. */
export class CurriculumLookupFailure extends Error {
  constructor(
    public readonly step: CurriculumLookupStep,
    public readonly failure: unknown,
  ) {
    super(`curriculum-lookup:${step}`);
    this.name = "CurriculumLookupFailure";
  }
  /** "HTTP 403", the Backend's message, or both. */
  get reason(): string | null {
    if (!(this.failure instanceof ApiFailure)) return null;
    const { detail, serverMessage } = this.failure;
    const status =
      detail.kind === "server"
        ? `HTTP ${detail.status}`
        : detail.kind === "not_found"
          ? "HTTP 404"
          : detail.kind === "unauthorized"
            ? "HTTP 401"
            : null;
    return [status, serverMessage].filter(Boolean).join(": ") || null;
  }
}

async function at<T>(step: CurriculumLookupStep, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw new CurriculumLookupFailure(step, error);
  }
}
