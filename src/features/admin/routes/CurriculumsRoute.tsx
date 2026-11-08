import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, CheckCircle2, Plus, ScrollText } from "lucide-react";
import {
  approveCurriculum,
  archiveCurriculum,
  createCurriculum,
  curriculumStatuses,
  getCurriculums,
  updateCurriculum,
  type Curriculum,
} from "@/api/admin";
import { Button } from "@/shared/ui/primitives/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import {
  PageHeading,
  ReadState,
  StatusBadge,
  SummaryCard,
} from "@/components/workbench/Workbench";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  adminKeys,
  majorLabel,
  useAdminWrite,
  useExpiredAdminSession,
  useMajorOptions,
} from "../api/useAdminData";
import {
  ConfirmAction,
  EmptyRow,
  FilterPanel,
  FormDialog,
  TablePanel,
  formatDate,
  toDateInput,
} from "../components/AdminSurfaces";

type Draft = {
  majorId: string;
  curriculumCode: string;
  curriculumName: string;
  version: string;
  intakeYear: string;
  effectiveFrom: string;
  effectiveTo: string;
};
const emptyDraft: Draft = {
  majorId: "",
  curriculumCode: "",
  curriculumName: "",
  version: "",
  intakeYear: "",
  effectiveFrom: "",
  effectiveTo: "",
};

const statusTone = (status: string) =>
  status === "Active"
    ? ("success" as const)
    : status === "Draft"
      ? ("warning" as const)
      : status === "Archived"
        ? ("neutral" as const)
        : ("info" as const);

export function CurriculumsRoute() {
  const isStaff = useAuthStore((state) => state.user?.role?.toLowerCase() === "staff");
  useRouteAnnouncer("Curriculums · LearnAble Admin", "Curriculums");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [major, setMajor] = useState("all");
  const [status, setStatus] = useState("all");
  const [intake, setIntake] = useState("");
  const [appliedIntake, setAppliedIntake] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Curriculum | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [transition, setTransition] = useState<{
    row: Curriculum;
    action: "approve" | "archive";
  } | null>(null);

  const majors = useMajorOptions();
  const majorRows = majors.data?.items ?? [];
  const list = useQuery({
    queryKey: adminKeys.list("curriculums", [
      search,
      major,
      status,
      appliedIntake,
      page,
      size,
    ]),
    queryFn: () =>
      getCurriculums({
        SearchTerm: search,
        MajorId: major === "all" ? undefined : major,
        Status: status === "all" ? undefined : status,
        IntakeYear: appliedIntake ? Number(appliedIntake) : undefined,
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
    resource: "curriculums",
    action: "Create curriculum",
    mutationFn: () =>
      createCurriculum({
        majorId: draft.majorId,
        curriculumCode: draft.curriculumCode.trim(),
        curriculumName: draft.curriculumName.trim(),
        version: draft.version.trim(),
        intakeYear: Number(draft.intakeYear),
        effectiveFrom: draft.effectiveFrom || null,
        effectiveTo: draft.effectiveTo || null,
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "curriculums",
    action: "Update curriculum",
    mutationFn: () =>
      updateCurriculum(editing!.curriculumId, {
        curriculumName: draft.curriculumName.trim(),
        version: draft.version.trim(),
        effectiveFrom: draft.effectiveFrom || null,
        effectiveTo: draft.effectiveTo || null,
      }),
    onSuccess: closeForm,
  });
  const move = useAdminWrite<{ id: string; action: "approve" | "archive" }>({
    resource: "curriculums",
    action: "Curriculum transition",
    // Student profiles reference a curriculum.
    alsoInvalidate: ["studentProfiles"],
    mutationFn: ({ id, action }) =>
      action === "approve" ? approveCurriculum(id) : archiveCurriculum(id),
    onSuccess: () => setTransition(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating && !draft.majorId) found.push("Owning major is required.");
    if (creating && !draft.curriculumCode.trim())
      found.push("Curriculum code is required.");
    if (!draft.curriculumName.trim())
      found.push("Curriculum name is required.");
    if (!draft.version.trim()) found.push("Version is required.");
    const intakeValue = Number(draft.intakeYear);
    if (
      creating &&
      (!draft.intakeYear ||
        !Number.isInteger(intakeValue) ||
        intakeValue < 1900)
    )
      found.push("Intake year must be a four-digit year.");
    if (
      draft.effectiveFrom &&
      draft.effectiveTo &&
      draft.effectiveFrom >= draft.effectiveTo
    )
      found.push("Effective-to date must be after the effective-from date.");
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };
  const reset = () => {
    setQuery("");
    setSearch("");
    setMajor("all");
    setStatus("all");
    setIntake("");
    setAppliedIntake("");
    setPage(1);
  };
  const count = (value: string) =>
    rows.filter((row) => row.status === value).length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Curriculums"
        description="Versioned programmes of study per major and intake year. A curriculum is drafted, approved, then archived."
      >
        <Button
          disabled={!majorRows.length}
          onClick={() => {
            setDraft(emptyDraft);
            setErrors([]);
            setCreating(true);
          }}
        >
          <Plus aria-hidden />
          New curriculum
        </Button>
      </PageHeading>
      {!majors.isPending && !majors.error && !majorRows.length && (
        <p
          role="status"
          className="rounded-xl border border-warning-foreground/30 bg-warning p-4 text-sm text-warning-foreground"
        >
          Create a major first — every curriculum belongs to one.
        </p>
      )}
      {isStaff ? (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Curriculum records are connected to majors. Subject-to-curriculum assignment is part of this workspace design and will become editable when the Backend publishes that relationship endpoint.
        </p>
      ) : null}

      <section
        aria-label="Curriculum summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          label="Total curriculums"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<ScrollText aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Active on this page"
          value={count("Active")}
          detail="Approved and in use"
          icon={<CheckCircle2 aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Draft on this page"
          value={count("Draft")}
          detail="Awaiting approval"
          icon={<ScrollText aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Archived on this page"
          value={count("Archived")}
          detail="Retired programmes"
          icon={<Archive aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search curriculums"
        searchPlaceholder="Search by curriculum code or name"
        query={query}
        onQueryChange={setQuery}
        onSearch={() => {
          setSearch(query.trim());
          setAppliedIntake(intake.trim());
          setPage(1);
        }}
        onReset={reset}
        hint="Intake year is applied together with the search button."
      >
        <ChoiceField
          label="Major"
          value={major}
          options={[
            { value: "all", label: "All majors" },
            ...majorRows.map((row) => ({
              value: row.majorId,
              label: `${row.majorCode} · ${row.majorName}`,
            })),
          ]}
          onChange={(value) => {
            setMajor(value);
            setPage(1);
          }}
        />
        <ChoiceField
          label="Curriculum status"
          value={status}
          options={[
            { value: "all", label: "All statuses" },
            ...curriculumStatuses.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <TextField
          label="Intake year"
          type="number"
          min="1900"
          value={intake}
          onChange={setIntake}
        />
      </FilterPanel>
      <ReadState
        pending={majors.isPending}
        error={majors.error}
        retry={() => void majors.refetch()}
      />

      <TablePanel
        heading="All curriculums"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="curriculums"
        tableLabel="Curriculums table"
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
            <TableHead>Code &amp; version</TableHead>
            <TableHead>Curriculum</TableHead>
            <TableHead>Major</TableHead>
            <TableHead>Intake</TableHead>
            <TableHead>Effective period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.curriculumId}>
              <TableCell className="min-w-36">
                <p className="font-bold">{row.curriculumCode}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Version {row.version}
                </p>
              </TableCell>
              <TableCell className="min-w-64 max-w-sm whitespace-normal font-bold leading-relaxed">
                {row.curriculumName}
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {majorLabel(majorRows, row.majorId) ?? "Not available"}
              </TableCell>
              <TableCell className="tabular-nums">{row.intakeYear}</TableCell>
              <TableCell className="min-w-48 tabular-nums">
                {formatDate(row.effectiveFrom)} → {formatDate(row.effectiveTo)}
              </TableCell>
              <TableCell>
                <StatusBadge value={row.status} tone={statusTone(row.status)} />
                {row.approvedAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Approved {formatDate(row.approvedAt)}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(row);
                      setErrors([]);
                      setDraft({
                        majorId: row.majorId,
                        curriculumCode: row.curriculumCode,
                        curriculumName: row.curriculumName,
                        version: row.version,
                        intakeYear: String(row.intakeYear),
                        effectiveFrom: toDateInput(row.effectiveFrom),
                        effectiveTo: toDateInput(row.effectiveTo),
                      });
                    }}
                  >
                    Edit
                  </Button>
                  {isStaff ? (
                    <Button disabled variant="outline" title="Curriculum subject assignment API is not available yet">
                      Manage subjects
                    </Button>
                  ) : null}
                  {row.status === "Draft" && (
                    <Button
                      variant="ghost"
                      onClick={() => setTransition({ row, action: "approve" })}
                    >
                      Approve
                    </Button>
                  )}
                  {row.status !== "Archived" && (
                    <Button
                      variant="ghost"
                      onClick={() => setTransition({ row, action: "archive" })}
                    >
                      Archive
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <EmptyRow
              columns={7}
              title="No curriculums match your filters."
              hint="Try another search, or draft a curriculum for a major intake."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New curriculum" : "Edit curriculum"}
        description={
          creating
            ? "A new curriculum starts as Draft. Major, code and intake year are permanent."
            : `Update ${editing?.curriculumCode ?? ""}. Major, code and intake year cannot be changed.`
        }
        submitLabel={creating ? "Create curriculum" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <ChoiceField
          label="Owning major"
          value={draft.majorId}
          placeholder="Select a major"
          disabled={!creating}
          options={majorRows.map((row) => ({
            value: row.majorId,
            label: `${row.majorCode} · ${row.majorName}`,
          }))}
          onChange={(value) => setDraft((old) => ({ ...old, majorId: value }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Curriculum code"
            value={draft.curriculumCode}
            disabled={!creating}
            onChange={(value) =>
              setDraft((old) => ({ ...old, curriculumCode: value }))
            }
            error={
              errors.some((e) => e.startsWith("Curriculum code"))
                ? "Curriculum code is required."
                : undefined
            }
          />
          <TextField
            label="Version"
            value={draft.version}
            onChange={(value) =>
              setDraft((old) => ({ ...old, version: value }))
            }
            error={
              errors.some((e) => e.startsWith("Version"))
                ? "Version is required."
                : undefined
            }
          />
        </div>
        <TextField
          label="Curriculum name"
          value={draft.curriculumName}
          onChange={(value) =>
            setDraft((old) => ({ ...old, curriculumName: value }))
          }
          error={
            errors.some((e) => e.startsWith("Curriculum name"))
              ? "Curriculum name is required."
              : undefined
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Intake year of curriculum"
            type="number"
            min="1900"
            value={draft.intakeYear}
            disabled={!creating}
            onChange={(value) =>
              setDraft((old) => ({ ...old, intakeYear: value }))
            }
            error={
              errors.some((e) => e.startsWith("Intake year"))
                ? "Intake year must be a four-digit year."
                : undefined
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Effective from"
            type="date"
            value={draft.effectiveFrom}
            onChange={(value) =>
              setDraft((old) => ({ ...old, effectiveFrom: value }))
            }
          />
          <TextField
            label="Effective to"
            type="date"
            value={draft.effectiveTo}
            onChange={(value) =>
              setDraft((old) => ({ ...old, effectiveTo: value }))
            }
            error={
              errors.some((e) => e.startsWith("Effective-to"))
                ? "Effective-to date must be after the effective-from date."
                : undefined
            }
          />
        </div>
      </FormDialog>

      <ConfirmAction
        open={transition !== null}
        onOpenChange={(open) => {
          if (!open) setTransition(null);
        }}
        title={
          transition?.action === "approve"
            ? "Approve curriculum?"
            : "Archive curriculum?"
        }
        description={
          transition?.action === "approve"
            ? `${transition?.row.curriculumName} becomes Active and can be assigned to student profiles. Your account is recorded as the approver.`
            : `${transition?.row.curriculumName} will be Archived and stop accepting new student profiles. Existing profiles stay readable.`
        }
        confirmLabel={transition?.action === "approve" ? "Approve" : "Archive"}
        onConfirm={() =>
          transition &&
          move.mutate({
            id: transition.row.curriculumId,
            action: transition.action,
          })
        }
      />
    </div>
  );
}
