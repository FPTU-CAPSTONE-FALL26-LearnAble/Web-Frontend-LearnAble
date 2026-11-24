import { beforeEach, expect, it, vi } from "vitest";
import { commitAccountImport, getAccountImport, getAccountImportResult, getAccountImportTemplate, previewAccountImport } from "./accountImports";

const client = vi.hoisted(() => ({ request: vi.fn(), requestBlob: vi.fn() }));
vi.mock("@/api/client", () => ({ ...client, envelopeFailure: () => new Error("Import failed") }));

const batch = { batchId: "batch-1", role: "Student", status: "Preview", revision: "rev-1", totalRows: 1, errorRows: 0,
  expiresAt: "2026-11-22T00:00:00Z", failureCode: null, credentialsExpiresAt: null, credentialsAvailable: false,
  rows: [{ rowNumber: 2, values: { UserCode: "SE123" }, status: "Preview", userId: null, errors: [] }] };

beforeEach(() => { client.request.mockReset(); client.requestBlob.mockReset(); client.request.mockResolvedValue({ success: true, data: batch }); });

it("uses the Backend template, multipart preview, batch and revision-bound commit contract", async () => {
  const file = new File(["workbook"], "students.xlsx");
  await previewAccountImport("Student", file);
  expect(client.request).toHaveBeenCalledWith("/account-imports/preview", expect.anything(), expect.objectContaining({ method: "POST", body: expect.any(FormData) }));
  const form = client.request.mock.calls[0][2].body as FormData;
  expect(form.get("Role")).toBe("Student");
  expect(form.get("File")).toBe(file);
  await getAccountImport("batch-1");
  expect(client.request).toHaveBeenCalledWith("/account-imports/batch-1", expect.anything(), undefined);
  await commitAccountImport(batch, "operation-1");
  expect(client.request).toHaveBeenCalledWith("/account-imports/batch-1/commit", expect.anything(), { method: "POST", json: { operationId: "operation-1", expectedRevision: "rev-1" } });
  await getAccountImportTemplate("Student");
  await getAccountImportResult("batch-1");
  expect(client.requestBlob).toHaveBeenCalledWith("/account-imports/template?role=Student");
  expect(client.requestBlob).toHaveBeenCalledWith("/account-imports/batch-1/result-file");
});
