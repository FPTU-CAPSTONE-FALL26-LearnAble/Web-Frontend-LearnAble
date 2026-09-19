import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  FileText,
  Folder,
  RefreshCw,
  Search,
  Upload,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMaterials } from "@/api/lecturer";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ChoiceField } from "../questions/QuestionFields";
import { useAcademicOptions, useExpiredSession } from "../api/useLecturerData";
import {
  notConnected,
  PageHeading,
  Pagination,
  ReadState,
  StatusBadge,
  SummaryCard,
  unavailable,
} from "../components/Workbench";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";

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
            detail={
              index === 0 ? "Your current query" : "No aggregate endpoint"
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
          {["Publish selected", "Assign topic", "Archive selected"].map(
            (action) => (
              <Button
                key={action}
                variant="outline"
                onClick={() => notConnected(action)}
              >
                {action}
              </Button>
            ),
          )}
        </div>
      )}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border-subtle)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] p-5">
          <h2 className="text-lg font-bold">Your learning materials</h2>
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
          <Table containerLabel="Learning materials table" className="min-w-[1120px]">
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
                          onClick={() => notConnected("Open material")}
                        >
                          Open
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => notConnected("Manage material")}
                        >
                          Manage
                        </Button>
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
    </div>
  );
}
