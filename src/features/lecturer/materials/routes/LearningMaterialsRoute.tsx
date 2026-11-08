/* eslint-disable jsx-a11y/label-has-associated-control, shadcn/no-restyle -- Wrapped labels stay associated; this established route retains its existing composed workbench surface classes. */
import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  FileText,
  Folder,
  RefreshCw,
  Search,
  Upload,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import { archiveLearningMaterial, deleteLearningMaterial, getMaterials, publishLearningMaterial, replaceLearningMaterialFile, updateLearningMaterial } from "@/api/lecturer";
import type { LearningMaterial } from "@/api/catalog";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ChoiceField } from "@/features/lecturer/questions/components/QuestionFields";
import { useAcademicOptions } from "@/features/lecturer/shared/api/useLecturerData";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import {
  notConnected,
  PageHeading,
  Pagination,
  ReadState,
  StatusBadge,
  SummaryCard,
  unavailable,
} from "@/features/lecturer/shared/components/Workbench";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/primitives/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/primitives/alert-dialog";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";

export const formatFileSize = (bytes: number | null) =>
  bytes === null
    ? unavailable
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const defaults = { subject: "all", topic: "all", type: "all", status: "all" };
export function LearningMaterialsRoute() {
  useRouteAnnouncer("Learning Materials", "Learning Materials");
  const userId = useAuthStore((state) => state.user?.id);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<LearningMaterial | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<LearningMaterial | null>(null);
  const queryClient = useQueryClient();
  const academic = useAcademicOptions(
    filters.subject === "all" ? undefined : filters.subject,
  );
  const data = useQuery({
    queryKey: [
      "lecturer",
      "materials",
      userId,
      search,
      filters.topic,
      filters.type,
      filters.status,
      page,
      size,
    ],
    queryFn: () =>
      getMaterials({
        UploadedBy: userId,
        SearchTerm: search,
        TopicId: filters.topic === "all" ? undefined : filters.topic,
        MaterialType: filters.type === "all" ? undefined : filters.type,
        Status: filters.status === "all" ? undefined : filters.status,
        PageNumber: page,
        PageSize: Number(size),
        SortBy: "-uploadedAt",
      }),
    enabled: !!userId,
  });
  useExpiredSession(data.error);
  const rows = data.data?.items ?? [];
  const statusMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "publish" | "archive" }) => {
      await Promise.all(ids.map((id) => action === "publish" ? publishLearningMaterial(id) : archiveLearningMaterial(id)));
    },
    onSuccess: async () => {
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ["lecturer", "materials"] });
    },
  });
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await updateLearningMaterial(editing.materialId, { title: editTitle.trim(), description: editDescription.trim() || null });
      if (replacementFile) await replaceLearningMaterialFile(editing.materialId, replacementFile);
    },
    onSuccess: async () => {
      setEditing(null);
      setReplacementFile(null);
      await queryClient.invalidateQueries({ queryKey: ["lecturer", "materials"] });
      toast({ title: "Material updated", description: "The metadata and selected file changes have been saved." });
    },
    onError: (error) => toast({ title: "Material could not be updated", description: error instanceof Error ? error.message : "Review the material and try again." }),
  });
  const deleteMutation = useMutation({
    mutationFn: (materialId: string) => deleteLearningMaterial(materialId),
    onSuccess: async () => {
      setDeleting(null);
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ["lecturer", "materials"] });
      toast({ title: "Material deleted", description: "The draft material was removed from the learning-material library." });
    },
    onError: (error) => toast({ title: "Material could not be deleted", description: error instanceof Error ? error.message : "Only eligible materials can be deleted." }),
  });
  const openEditor = (material: LearningMaterial) => {
    setEditing(material);
    setEditTitle(material.title);
    setEditDescription(material.description ?? "");
    setReplacementFile(null);
  };
  const topics = academic.topics.data?.items ?? [];
  const subjects = academic.subjects.data?.items ?? [];
  const update = (key: keyof typeof filters, value: string) => {
    setFilters((old) => ({
      ...old,
      [key]: value,
      ...(key === "subject" ? { topic: "all" } : {}),
    }));
    setPage(1);
    setSelected([]);
  };
  const reset = () => {
    setFilters(defaults);
    setQuery("");
    setSearch("");
    setPage(1);
    setSelected([]);
  };
  const stats = [
    { label: "Total materials", icon: Folder },
    { label: "Published", icon: CheckCircle2 },
    { label: "Needs metadata", icon: FileText },
    { label: "OCR running", icon: RefreshCw },
    { label: "Extraction failed", icon: AlertCircle },
    { label: "Archived", icon: Archive },
  ];
  return (
    <div className="space-y-6">
      <PageHeading
        title="Learning Materials"
        description="Manage lecture resources and their processing status."
      >
        <Button asChild>
          <Link to="/lecturer/materials/new">
            <Upload aria-hidden />
            Upload new material
          </Link>
        </Button>
      </PageHeading>
      <section
        aria-label="Learning material summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      >
        {stats.map((stat, index) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            value={
              index === 0 ? (data.data?.totalCount ?? unavailable) : unavailable
            }
            icon={
              <stat.icon
                aria-hidden
                className="size-5 shrink-0 text-secondary"
              />
            }
          />
        ))}
      </section>
      <Card className="lecturer-major-card border shadow-none">
        <CardContent className="space-y-5">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(query.trim());
              setPage(1);
              setSelected([]);
            }}
          >
            <div className="relative min-w-0 flex-1 basis-60">
              <Search
                aria-hidden
                className="absolute left-3 top-3 size-5 text-muted-foreground"
              />
              <Input
                aria-label="Search materials"
                placeholder="Search by material title"
                className="pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button type="submit">
              <Search aria-hidden />
              Search
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Reset filters
            </Button>
          </form>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ChoiceField
              label="Course"
              value={filters.subject}
              options={[
                { value: "all", label: "All courses" },
                ...subjects.map((s) => ({
                  value: s.subjectId,
                  label: `${s.subjectCode} · ${s.subjectNameEn ?? unavailable}`,
                })),
              ]}
              onChange={(value) => update("subject", value)}
            />
            <ChoiceField
              label="Topic"
              value={filters.topic}
              options={[
                { value: "all", label: "All topics" },
                ...topics.map((t) => ({
                  value: t.topicId,
                  label: t.topicName,
                })),
              ]}
              onChange={(value) => update("topic", value)}
            />
            <ChoiceField
              label="File type"
              value={filters.type}
              options={[
                { value: "all", label: "All file types" },
                "PDF",
                "DOCX",
                "IMAGE",
                "TEXT",
                "AUDIO",
              ]}
              onChange={(value) => update("type", value)}
            />
            <ChoiceField
              label="Material status"
              value={filters.status}
              options={[
                { value: "all", label: "All statuses" },
                "Draft",
                "Published",
                "Archived",
              ]}
              onChange={(value) => update("status", value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Select a course, then a topic to filter materials.
          </p>
          <ReadState
            pending={academic.subjects.isPending || academic.topics.isPending}
            error={academic.subjects.error || academic.topics.error}
            retry={() => {
              void academic.subjects.refetch();
              void academic.topics.refetch();
            }}
          />
        </CardContent>
      </Card>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary p-4">
          <p role="status" className="mr-auto text-sm font-bold">
            {selected.length} materials selected
          </p>
          <Button variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ ids: selected, action: "publish" })}>Publish selected</Button>
          <Button variant="outline" onClick={() => notConnected("Assign topic")}>Assign topic</Button>
          <Button variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ ids: selected, action: "archive" })}>Archive selected</Button>
        </div>
      )}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <h2 className="text-lg font-bold text-primary">Your learning materials</h2>
          <p role="status" className="text-sm text-muted-foreground">
            Showing {rows.length} of {data.data?.totalCount ?? 0} materials
          </p>
        </div>
        <ReadState
          pending={data.isPending}
          error={data.error}
          retry={() => void data.refetch()}
        />
        {!data.isPending && !data.error && (
          <Table
            aria-label="Learning materials table"
            className="min-w-[1120px]"
          >
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    aria-label="Select all materials on this page"
                    checked={
                      rows.length > 0 &&
                      rows.every((m) => selected.includes(m.materialId))
                        ? true
                        : rows.some((m) => selected.includes(m.materialId))
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked === true ? rows.map((m) => m.materialId) : [],
                      )
                    }
                  />
                </TableHead>
                <TableHead>Material & format</TableHead>
                <TableHead>Course / topic</TableHead>
                <TableHead>Pipeline status</TableHead>
                <TableHead>Student usage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => {
                const topic = topics.find((t) => t.topicId === m.topicId);
                const subject = subjects.find(
                  (s) => s.subjectId === topic?.subjectId,
                );
                return (
                  <TableRow
                    key={m.materialId}
                    data-state={
                      selected.includes(m.materialId) ? "selected" : undefined
                    }
                  >
                    <TableCell>
                      <Checkbox
                        aria-label={`Select ${m.title}`}
                        checked={selected.includes(m.materialId)}
                        onCheckedChange={(checked) =>
                          setSelected((old) =>
                            checked === true
                              ? [...old, m.materialId]
                              : old.filter((id) => id !== m.materialId),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="min-w-80 max-w-md whitespace-normal">
                      <div className="flex items-start gap-3">
                        <FileText
                          aria-hidden
                          className="mt-1 size-6 shrink-0 text-secondary"
                        />
                        <div>
                          <p className="font-bold leading-relaxed">{m.title}</p>
                          <p className="mt-1 break-all text-xs text-muted-foreground">
                            {m.fileName ?? unavailable}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {m.materialType} · {formatFileSize(m.fileSizeBytes)}
                            {m.pageCount ? ` · ${m.pageCount} pages` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-44 whitespace-normal">
                      <p className="font-bold">
                        {subject?.subjectCode ?? unavailable}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {topic?.topicName ?? unavailable}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={m.status} />
                      <p className="mt-2 text-xs text-muted-foreground">
                        OCR: {m.ocrStatus}
                      </p>
                    </TableCell>
                    <TableCell>{unavailable}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          disabled={!m.fileUrl}
                          onClick={() => m.fileUrl && window.open(m.fileUrl, "_blank", "noopener,noreferrer")}
                        >
                          Open
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ ids: [m.materialId], action: m.status === "Published" ? "archive" : "publish" })}
                        >
                          {m.status === "Published" ? "Archive" : "Publish"}
                        </Button>
                        <Button variant="ghost" aria-label={`Edit ${m.title}`} onClick={() => openEditor(m)}><Pencil aria-hidden /></Button>
                        <Button variant="ghost" aria-label={`Delete ${m.title}`} disabled={m.status !== "Draft"} onClick={() => setDeleting(m)}><Trash2 aria-hidden /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <p className="font-bold">
                      No materials match your filters.
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      Try another search or upload a material when publishing is
                      available.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        <Pagination
          page={page}
          pages={data.data?.totalPages ?? 1}
          size={size}
          onPage={(value) => {
            setPage(value);
            setSelected([]);
          }}
          onSize={(value) => {
            setSize(value);
            setPage(1);
            setSelected([]);
          }}
        />
      </section>
      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>Edit learning material</DialogTitle><DialogDescription>Update the title and description, or optionally replace the uploaded file.</DialogDescription></DialogHeader><div className="space-y-4"><label className="block text-sm font-semibold">Title<Input className="mt-2" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></label><label className="block text-sm font-semibold">Description<Textarea className="mt-2 min-h-28" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} /></label><label className="block text-sm font-semibold">Replace file (optional)<Input className="mt-2" type="file" accept=".pdf,.docx,.pptx" onChange={(event) => setReplacementFile(event.target.files?.[0] ?? null)} /><span className="mt-1 block text-xs font-normal text-muted-foreground">Leave empty to keep the existing file.</span></label></div><DialogFooter showCloseButton><Button disabled={!editTitle.trim() || editMutation.isPending} onClick={() => editMutation.mutate()}>{editMutation.isPending ? "Saving…" : "Save changes"}</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this draft material?</AlertDialogTitle><AlertDialogDescription>{deleting?.title} will be permanently removed. Published or archived materials must follow their status workflow instead.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep material</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting.materialId)}>{deleteMutation.isPending ? "Deleting…" : "Delete material"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
