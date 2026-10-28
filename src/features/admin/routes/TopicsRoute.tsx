import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ListTree, Plus, PowerOff } from "lucide-react";
import {
  createTopic,
  getAdminTopics,
  setTopicActive,
  updateTopic,
  type AdminTopic,
} from "@/api/admin";
import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeading,
  ReadState,
  StatusBadge,
  SummaryCard,
} from "@/components/workbench/Workbench";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import {
  adminKeys,
  subjectLabel,
  useAdminWrite,
  useExpiredAdminSession,
  useSubjectOptions,
} from "../api/useAdminData";
import {
  ConfirmAction,
  EmptyRow,
  FilterPanel,
  FormDialog,
  TablePanel,
  formatDate,
} from "../components/AdminSurfaces";

type Draft = {
  subjectId: string;
  topicCode: string;
  topicName: string;
  description: string;
  displayOrder: string;
};
const emptyDraft: Draft = {
  subjectId: "",
  topicCode: "",
  topicName: "",
  description: "",
  displayOrder: "1",
};

export function TopicsRoute() {
  useRouteAnnouncer("Topics · LearnAble Admin", "Topics");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminTopic | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [toggling, setToggling] = useState<AdminTopic | null>(null);

  const subjects = useSubjectOptions();
  const subjectRows = subjects.data?.items ?? [];

  const list = useQuery({
    queryKey: adminKeys.list("topics", [
      search,
      subject,
      active,
      page,
      size,
    ]),
    queryFn: () =>
      getAdminTopics({
        SearchTerm: search,
        SubjectId: subject === "all" ? undefined : subject,
        IsActive: active === "all" ? undefined : active === "active",
        PageNumber: page,
        PageSize: Number(size),
      }),
  });
  useExpiredAdminSession(list.error);
  const rows = list.data?.items ?? [];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setDraft(emptyDraft);
    setErrors([]);
  };
  const create = useAdminWrite({
    resource: "topics",
    action: "Create topic",
    mutationFn: () =>
      createTopic({
        subjectId: draft.subjectId,
        topicCode: draft.topicCode.trim(),
        topicName: draft.topicName.trim(),
        description: draft.description.trim() || null,
        displayOrder: Number(draft.displayOrder),
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "topics",
    action: "Update topic",
    mutationFn: () =>
      updateTopic(editing!.topicId, {
        topicName: draft.topicName.trim(),
        description: draft.description.trim() || null,
        displayOrder: Number(draft.displayOrder),
      }),
    onSuccess: closeForm,
  });
  const toggle = useAdminWrite<{ id: string; next: boolean }>({
    resource: "topics",
    action: "Topic status change",
    mutationFn: ({ id, next }) => setTopicActive(id, next),
    onSuccess: () => setToggling(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating && !draft.subjectId) found.push("Subject is required.");
    if (creating && !draft.topicCode.trim())
      found.push("Topic code is required.");
    if (!draft.topicName.trim()) found.push("Topic name is required.");
    const order = Number(draft.displayOrder);
    if (!Number.isInteger(order) || order < 0)
      found.push("Display order must be a whole number, 0 or higher.");
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };
  const reset = () => {
    setQuery("");
    setSearch("");
    setSubject("all");
    setActive("all");
    setPage(1);
  };
  const activeCount = rows.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Topics"
        description="The smallest unit of the catalogue. Questions and learning materials are filed against a topic."
      >
        <Button
          disabled={!subjectRows.length}
          onClick={() => {
            setDraft(emptyDraft);
            setErrors([]);
            setCreating(true);
          }}
        >
          <Plus aria-hidden />
          New topic
        </Button>
      </PageHeading>
      {!subjects.isPending && !subjects.error && !subjectRows.length && (
        <p
          role="status"
          className="rounded-xl border border-[var(--color-warning)] p-4 text-sm"
          style={{ background: "var(--color-warning-bg)" }}
        >
          Create a subject first — every topic belongs to one.
        </p>
      )}

      <section
        aria-label="Topic summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SummaryCard
          label="Total topics"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<ListTree aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Active on this page"
          value={activeCount}
          detail={`Of ${rows.length} rows shown`}
          icon={<CheckCircle2 aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Inactive on this page"
          value={rows.length - activeCount}
          detail="Existing questions stay readable"
          icon={<PowerOff aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search topics"
        searchPlaceholder="Search by topic code or name"
        query={query}
        onQueryChange={setQuery}
        onSearch={() => {
          setSearch(query.trim());
          setPage(1);
        }}
        onReset={reset}
      >
        <ChoiceField
          label="Subject"
          value={subject}
          options={[
            { value: "all", label: "All subjects" },
            ...subjectRows.map((row) => ({
              value: row.subjectId,
              label: `${row.subjectCode} · ${row.subjectNameEn}`,
            })),
          ]}
          onChange={(value) => {
            setSubject(value);
            setPage(1);
          }}
        />
        <ChoiceField
          label="Status"
          value={active}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active only" },
            { value: "inactive", label: "Inactive only" },
          ]}
          onChange={(value) => {
            setActive(value);
            setPage(1);
          }}
        />
      </FilterPanel>
      <ReadState
        pending={subjects.isPending}
        error={subjects.error}
        retry={() => void subjects.refetch()}
      />

      <TablePanel
        heading="All topics"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="topics"
        tableLabel="Topics table"
        read={list}
        page={page}
        pages={list.data?.totalPages ?? 1}
        size={size}
        onPage={setPage}
        onSize={(value) => {
          setSize(value);
          setPage(1);
        }}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.topicId}>
              <TableCell className="tabular-nums font-bold">
                {row.displayOrder}
              </TableCell>
              <TableCell className="font-bold">{row.topicCode}</TableCell>
              <TableCell className="min-w-72 max-w-md whitespace-normal">
                <p className="font-bold leading-relaxed">{row.topicName}</p>
                {row.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {subjectLabel(subjectRows, row.subjectId) ?? "Not available"}
              </TableCell>
              <TableCell>
                <StatusBadge
                  value={row.isActive ? "Active" : "Inactive"}
                  tone={row.isActive ? "success" : "neutral"}
                />
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(row.updatedAt)}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(row);
                      setErrors([]);
                      setDraft({
                        subjectId: row.subjectId,
                        topicCode: row.topicCode,
                        topicName: row.topicName,
                        description: row.description ?? "",
                        displayOrder: String(row.displayOrder),
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => setToggling(row)}>
                    {row.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <EmptyRow
              columns={7}
              title="No topics match your filters."
              hint="Try another search, or add a topic to a subject."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New topic" : "Edit topic"}
        description={
          creating
            ? "The subject and topic code are permanent once created."
            : `Update ${editing?.topicCode ?? ""}. Subject and code cannot be changed.`
        }
        submitLabel={creating ? "Create topic" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <ChoiceField
          label="Subject of topic"
          value={draft.subjectId}
          placeholder="Select a subject"
          disabled={!creating}
          options={subjectRows.map((row) => ({
            value: row.subjectId,
            label: `${row.subjectCode} · ${row.subjectNameEn}`,
          }))}
          onChange={(value) =>
            setDraft((old) => ({ ...old, subjectId: value }))
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Topic code"
            value={draft.topicCode}
            disabled={!creating}
            onChange={(value) =>
              setDraft((old) => ({ ...old, topicCode: value }))
            }
            error={
              errors.some((e) => e.startsWith("Topic code"))
                ? "Topic code is required."
                : undefined
            }
          />
          <TextField
            label="Display order"
            type="number"
            min="0"
            value={draft.displayOrder}
            onChange={(value) =>
              setDraft((old) => ({ ...old, displayOrder: value }))
            }
            error={
              errors.some((e) => e.startsWith("Display order"))
                ? "Display order must be a whole number, 0 or higher."
                : undefined
            }
          />
        </div>
        <TextField
          label="Topic name"
          value={draft.topicName}
          onChange={(value) => setDraft((old) => ({ ...old, topicName: value }))}
          error={
            errors.some((e) => e.startsWith("Topic name"))
              ? "Topic name is required."
              : undefined
          }
        />
        <TextField
          label="Topic description"
          value={draft.description}
          multiline
          onChange={(value) =>
            setDraft((old) => ({ ...old, description: value }))
          }
        />
      </FormDialog>

      <ConfirmAction
        open={toggling !== null}
        onOpenChange={(open) => {
          if (!open) setToggling(null);
        }}
        title={toggling?.isActive ? "Deactivate topic?" : "Activate topic?"}
        description={
          toggling?.isActive
            ? `${toggling?.topicName} will stop appearing in lecturer topic selectors. Questions and materials already filed against it stay readable.`
            : `${toggling?.topicName} will appear in lecturer topic selectors again.`
        }
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onConfirm={() =>
          toggling &&
          toggle.mutate({ id: toggling.topicId, next: !toggling.isActive })
        }
      />
    </div>
  );
}
