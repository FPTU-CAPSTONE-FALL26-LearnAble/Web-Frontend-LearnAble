import { z } from "zod";
import { ApiFailure, envelopeFailure, request } from "@/api/client";

const audioSchema = z.object({
  audioId: z.string(),
  version: z.number(),
  textSnapshot: z.string().nullable().optional(),
  voiceId: z.string().nullable().optional(),
  speed: z.number(),
  modelId: z.string().nullable().optional(),
  modelVersion: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  createdAt: z.string(),
  approvedAt: z.string().nullable().optional(),
});

const slideSchema = z.object({
  slideId: z.string(),
  slideNumber: z.number(),
  unitKind: z.string().nullable().optional(),
  originalText: z.string().nullable().optional(),
  ttsText: z.string().nullable().optional(),
  extractionStatus: z.string().nullable().optional(),
  publishedAudioId: z.string().nullable().optional(),
  audioVersions: z.array(audioSchema).nullable().optional(),
});

const jobSchema = z.object({
  jobId: z.string(),
  slideId: z.string(),
  audioId: z.string(),
  audioVersion: z.number(),
  status: z.string().nullable().optional(),
  attemptCount: z.number(),
  errorCode: z.string().nullable().optional(),
  leaseExpiresAt: z.string().nullable().optional(),
  batchId: z.string().nullable().optional(),
});

const batchSchema = z.object({
  batchId: z.string(),
  jobs: z.array(jobSchema).nullable().optional(),
});


const optionsSchema = z.object({
  modelId: z.string().nullable().optional(),
  modelVersion: z.string().nullable().optional(),
  voiceId: z.string().nullable().optional(),
  synthesisSpeed: z.number(),
});

const linkSchema = z.object({
  url: z.string().nullable().optional(),
  expiresAt: z.string(),
});
const agentSchema = z.object({
  agentId: z.string(), deviceName: z.string().nullable().optional(), agentVersion: z.string().nullable().optional(),
  modelVersion: z.string().nullable().optional(), capabilities: z.string().nullable().optional(),
  lastSeenAt: z.string(), expiresAt: z.string(), revokedAt: z.string().nullable().optional(),
});

function envelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    success: z.boolean(),
    message: z.string().nullable().optional(),
    data: schema.nullable(),
    errors: z.array(z.string()).nullable().optional(),
  });
}

async function unwrap<T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit & { json?: unknown }) {
  const response = await request(path, envelope(schema), init);
  if (!response.success || response.data == null) throw envelopeFailure(response);
  return response.data;
}

async function emptyCommand(path: string, init: RequestInit & { json?: unknown }) {
  const response = await request(path, z.union([envelope(z.unknown()), z.null()]), init);
  if (response && !response.success) throw new ApiFailure({ kind: "server", status: 200 });
}

export type MaterialTtsSlide = z.infer<typeof slideSchema>;
export type MaterialTtsAudio = z.infer<typeof audioSchema>;
export type MaterialTtsJob = z.infer<typeof jobSchema>;
export type MaterialTtsBatch = z.infer<typeof batchSchema>;

const materialInfoSchema = z.object({
  materialId: z.string(),
  title: z.string().nullable(),
  fileName: z.string().nullable(),
  materialType: z.string().nullable(),
  status: z.string().optional(),
});

export const getMaterialAudioInfo = (materialId: string) =>
  unwrap(`/LearningMaterials/${materialId}`, materialInfoSchema);

export const getMaterialFileLink = (materialId: string) =>
  unwrap(`/LearningMaterials/${materialId}/file`, linkSchema);

export const getMaterialTtsSlides = (materialId: string) =>
  unwrap(`/lecturer/materials/${materialId}/slides`, z.array(slideSchema));

export const getMaterialTtsOptions = () => unwrap("/lecturer/tts-options", optionsSchema);

export const updateSlideTtsText = (slideId: string, text: string) =>
  emptyCommand(`/lecturer/slides/${slideId}/tts-text`, { method: "PATCH", json: { text } });

export const generateSlideAudio = (slideId: string, input: { text?: string; voiceId: string; speed: number }) =>
  unwrap(`/lecturer/slides/${slideId}/audio/generate`, jobSchema, {
    method: "POST",
    json: { ...input, idempotencyKey: crypto.randomUUID() },
  });

export const regenerateSlideAudio = (slideId: string, input: { text?: string; voiceId: string; speed: number }) =>
  unwrap(`/lecturer/slides/${slideId}/audio/regenerate`, jobSchema, {
    method: "POST",
    json: { ...input, idempotencyKey: crypto.randomUUID() },
  });

export const generateMaterialAudio = (materialId: string, input: { slideIds?: string[]; voiceId: string; speed: number }) =>
  unwrap(`/lecturer/materials/${materialId}/audio/generate`, batchSchema, {
    method: "POST",
    json: { ...input, idempotencyKey: crypto.randomUUID() },
  });

export const getMaterialTtsJob = (jobId: string) => unwrap(`/lecturer/tts-jobs/${jobId}`, jobSchema);
export const cancelMaterialTtsJob = (jobId: string) => emptyCommand(`/lecturer/tts-jobs/${jobId}/cancel`, { method: "POST" });
export const getMaterialTtsBatch = (batchId: string) => unwrap(`/lecturer/tts-batches/${batchId}`, batchSchema);
export const getSlideAudioVersions = (slideId: string) => unwrap(`/lecturer/slides/${slideId}/audio/versions`, z.array(audioSchema));
export const approveSlideAudio = (slideId: string, audioId: string) =>
  emptyCommand(`/lecturer/slides/${slideId}/audio/${audioId}/approve`, { method: "POST" });
export const getSlideAudioPlayback = (slideId: string, audioId: string) =>
  unwrap(`/lecturer/slides/${slideId}/audio/${audioId}/playback-url`, linkSchema);
export const getMaterialTtsAgents = () => unwrap("/lecturer/tts-agents", z.array(agentSchema));
export const revokeMaterialTtsAgent = (agentId: string) => emptyCommand(`/lecturer/tts-agents/${agentId}`, { method: "DELETE" });
