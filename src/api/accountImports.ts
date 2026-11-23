import { z } from "zod";
import { envelopeFailure, request, requestBlob } from "@/api/client";

const rowSchema = z.object({
  rowNumber: z.number(), values: z.record(z.string()).nullable().optional(), status: z.string().nullable().optional(),
  userId: z.string().nullable().optional(), errors: z.array(z.object({ field: z.string().nullable().optional(), code: z.string().nullable().optional() })).nullable().optional(),
});
const batchSchema = z.object({
  batchId: z.string(), role: z.string().nullable().optional(), status: z.string().nullable().optional(), revision: z.string(),
  totalRows: z.number(), errorRows: z.number(), expiresAt: z.string(), failureCode: z.string().nullable().optional(),
  credentialsExpiresAt: z.string().nullable().optional(), credentialsAvailable: z.boolean(), rows: z.array(rowSchema).nullable().optional(),
});
const envelope = z.object({ success: z.boolean(), message: z.string().nullable().optional(), data: batchSchema.nullable(), errors: z.array(z.string()).nullable().optional() });
export type AccountImportBatch = z.infer<typeof batchSchema>;

async function unwrap(path: string, init?: RequestInit & { json?: unknown }) {
  const result = await request(path, envelope, init);
  if (!result.success || !result.data) throw envelopeFailure(result);
  return result.data;
}

export const getAccountImportTemplate = (role: string) => requestBlob(`/account-imports/template?role=${encodeURIComponent(role)}`);
export const previewAccountImport = (role: string, file: File) => {
  const body = new FormData();
  body.set("Role", role);
  body.set("File", file);
  return unwrap("/account-imports/preview", { method: "POST", body });
};
export const getAccountImport = (batchId: string) => unwrap(`/account-imports/${batchId}`);
export const commitAccountImport = (batch: AccountImportBatch, operationId: string) =>
  unwrap(`/account-imports/${batch.batchId}/commit`, { method: "POST", json: { operationId, expectedRevision: batch.revision } });
export const getAccountImportResult = (batchId: string) => requestBlob(`/account-imports/${batchId}/result-file`);
export const downloadAccountImportCredentials = (batchId: string) => requestBlob(`/account-imports/${batchId}/credentials/download`, { method: "POST" });
