import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, expect, it } from "vitest";
import { AccountImportsRoute } from "./AccountImportsRoute";

const api = vi.hoisted(() => ({ previewAccountImport: vi.fn(), getAccountImport: vi.fn(), commitAccountImport: vi.fn() }));
vi.mock("@/api/accountImports", () => ({ ...api, getAccountImportTemplate: vi.fn(), getAccountImportResult: vi.fn(), downloadAccountImportCredentials: vi.fn() }));

it("previews a Staff workbook and confirms only an error-free batch", async () => {
  const user = userEvent.setup();
  const batch = { batchId: "batch-1", role: "Student", status: "Preview", revision: "rev-1", totalRows: 1, errorRows: 0,
    expiresAt: "2026-11-22T00:00:00Z", credentialsAvailable: false, rows: [{ rowNumber: 2, status: "Preview", values: { UserCode: "SE123" }, errors: [] }] };
  api.previewAccountImport.mockResolvedValue(batch);
  api.getAccountImport.mockResolvedValue(batch);
  api.commitAccountImport.mockResolvedValue({ ...batch, status: "Queued" });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AccountImportsRoute /></QueryClientProvider>);
  await user.upload(screen.getByLabelText("Completed Excel file"), new File(["xlsx"], "students.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  await user.click(screen.getByRole("button", { name: "Preview import" }));
  expect(await screen.findByText("SE123")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Create accounts" }));
  await waitFor(() => expect(api.commitAccountImport).toHaveBeenCalledWith(expect.objectContaining({ revision: "rev-1" }), expect.any(String)));
});
