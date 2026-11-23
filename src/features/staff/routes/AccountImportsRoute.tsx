import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { describeError } from "@/app/providers";
import {
  commitAccountImport, downloadAccountImportCredentials, getAccountImport, getAccountImportResult,
  getAccountImportTemplate, previewAccountImport, type AccountImportBatch,
} from "@/api/accountImports";
import { PageHeading } from "@/components/workbench/Workbench";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";

function saveFile(file: { blob: Blob; fileName: string | null }, fallback: string) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName ?? fallback;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AccountImportsRoute() {
  const [role, setRole] = useState("Student");
  const [file, setFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState("");
  const [operationId, setOperationId] = useState("");
  const [message, setMessage] = useState("");
  const batchQuery = useQuery({ queryKey: ["staff-account-import", batchId], queryFn: () => getAccountImport(batchId), enabled: Boolean(batchId),
    refetchInterval: (query) => ["Queued", "Processing"].includes(query.state.data?.status ?? "") ? 3000 : false });
  const batch = batchQuery.data;
  const preview = useMutation({ mutationFn: () => previewAccountImport(role, file!), onSuccess: (result) => { setBatchId(result.batchId); setOperationId(""); setMessage(""); }, onError: (error) => setMessage(describeError(error)) });
  const commit = useMutation({ mutationFn: ({ current, key }: { current: AccountImportBatch; key: string }) => commitAccountImport(current, key),
    onSuccess: () => { setMessage("Import started. The result will update automatically."); void batchQuery.refetch(); },
    onError: (error) => setMessage(describeError(error)) });
  const download = async (kind: "template" | "result" | "credentials") => {
    try {
      const result = kind === "template" ? await getAccountImportTemplate(role)
        : kind === "result" ? await getAccountImportResult(batchId) : await downloadAccountImportCredentials(batchId);
      saveFile(result, `learnable-${kind}.xlsx`);
      if (kind === "credentials") void batchQuery.refetch();
      setMessage(kind === "credentials" ? "Credentials downloaded. This file can only be downloaded once; store it securely." : "File downloaded.");
    } catch (error) { setMessage(describeError(error)); }
  };

  return <div className="space-y-6">
    <PageHeading title="Import accounts" />
    <Card><CardHeader><CardTitle>Prepare an Excel file</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Download the template for one role, complete the rows, then upload the .xlsx file to check every account before creating it.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="import-role">Account role</Label><select id="import-role" className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(event) => { setRole(event.target.value); setFile(null); setBatchId(""); }}>{["Student", "Lecturer", "Examiner"].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="import-file">Completed Excel file</Label><Input id="import-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setBatchId(""); }} /></div>
      </div>
      <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => void download("template")}><Download aria-hidden />Download template</Button><Button disabled={!file || preview.isPending} onClick={() => preview.mutate()}><Upload aria-hidden />{preview.isPending ? "Checking…" : "Preview import"}</Button></div>
    </CardContent></Card>
    {message ? <p role="status" className="rounded-lg border border-border p-3 text-sm">{message}</p> : null}
    {batchQuery.isPending && batchId ? <p role="status">Loading the import…</p> : null}
    {batchQuery.isError ? <div role="alert">{describeError(batchQuery.error)} <Button variant="outline" onClick={() => void batchQuery.refetch()}>Retry</Button></div> : null}
    {batch ? <Card><CardHeader><CardTitle>Import review · {batch.status ?? "Unknown"}</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm">{batch.totalRows} rows · {batch.errorRows} with errors · Preview expires {new Date(batch.expiresAt).toLocaleString()}</p>
      {batch.failureCode ? <p role="alert" className="text-sm text-destructive">Import failed: {batch.failureCode}</p> : null}
      <div className="max-h-96 overflow-auto rounded-lg border border-border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3">Row</th><th className="p-3">Account</th><th className="p-3">Status</th><th className="p-3">Issues</th></tr></thead><tbody>{(batch.rows ?? []).map((row) => <tr key={row.rowNumber} className="border-t border-border"><td className="p-3">{row.rowNumber}</td><td className="p-3">{row.values?.UserCode ?? row.values?.Email ?? "—"}</td><td className="p-3">{row.status ?? "—"}</td><td className="p-3">{row.errors?.map((error) => `${error.field ?? "Row"}: ${error.code ?? "Invalid"}`).join("; ") || "—"}</td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={batch.status !== "Preview" || batch.errorRows > 0 || commit.isPending} onClick={() => { const key = operationId || crypto.randomUUID(); setOperationId(key); commit.mutate({ current: batch, key }); }}><FileSpreadsheet aria-hidden />{commit.isPending ? "Starting…" : "Create accounts"}</Button>
        <Button variant="outline" onClick={() => void batchQuery.refetch()}>Refresh status</Button>
        {batch.status === "Committed" || batch.status === "Failed" ? <Button variant="outline" onClick={() => void download("result")}><Download aria-hidden />Download results</Button> : null}
        {batch.credentialsAvailable ? <Button onClick={() => void download("credentials")}><Download aria-hidden />Download passwords once</Button> : null}
      </div>
      {batch.credentialsAvailable ? <p className="text-sm text-muted-foreground">Temporary passwords are available for a single download until {batch.credentialsExpiresAt ? new Date(batch.credentialsExpiresAt).toLocaleString() : "they expire"}. Keep the file secure.</p> : null}
    </CardContent></Card> : null}
  </div>;
}
