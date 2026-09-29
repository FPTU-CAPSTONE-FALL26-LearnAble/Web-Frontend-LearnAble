import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, CircleDot, Lock, Plus } from "lucide-react";
import {
  closeSemester,
  createSemester,
  getAdminSemesters,
  semesterStatuses,
  startSemester,
  updateSemester,
  type AdminSemester,
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
  StatusBadge,
  SummaryCard,
} from "@/components/workbench/Workbench";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import {
  adminKeys,
  useAdminWrite,
  useExpiredAdminSession,
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
  semesterCode: string;
  semesterName: string;
  academicYear: string;
  startDate: string;
  endDate: string;
};
const emptyDraft: Draft = {
  semesterCode: "",
  semesterName: "",
  academicYear: "",
  startDate: "",
  endDate: "",
};

const statusTone = (status: string) =>
  status === "Ongoing"
    ? ("success" as const)
    : status === "Planned"
      ? ("info" as const)
      : status === "Closed"
        ? ("neutral" as const)
        : ("warning" as const);

export function SemestersRoute() {
  useRouteAnnouncer("Semesters · LearnAble Admin", "Semesters");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [year, setYear] = useState("");
  const [appliedYear, setAppliedYear] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminSemester | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [transition, setTransition] = useState<{
    row: AdminSemester;
    action: "start" | "close";
  } | null>(null);

  const list = useQuery({
    queryKey: adminKeys.list("semesters", [
      search,
      status,
      appliedYear,
      page,
      size,
    ]),
    queryFn: () =>
      getAdminSemesters({
        SearchTerm: search,
        Status: status === "all" ? undefined : status,
        AcademicYear: appliedYear || undefined,
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
    resource: "semesters",
    action: "Create semester",
    mutationFn: () =>
      createSemester({
        semesterCode: draft.semesterCode.trim(),
        semesterName: draft.semesterName.trim(),
        academicYear: draft.academicYear.trim(),
        startDate: draft.startDate,
        endDate: draft.endDate,
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "semesters",
    action: "Update semester",
    mutationFn: () =>
      updateSemester(editing!.semesterId, {
        semesterName: draft.semesterName.trim(),
        academicYear: draft.academicYear.trim(),
        startDate: draft.startDate,
        endDate: draft.endDate,
      }),
    onSuccess: closeForm,
  });
  const move = useAdminWrite<{ id: string; action: "start" | "close" }>({
    resource: "semesters",
    action: "Semester transition",
    // Course sections are scheduled inside a semester.
    alsoInvalidate: ["courseSections"],
    mutationFn: ({ id, action }) =>
      action === "start" ? startSemester(id) : closeSemester(id),
    onSuccess: () => setTransition(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating && !draft.semesterCode.trim())
      found.push("Semester code is required.");
    if (!draft.semesterName.trim()) found.push("Semester name is required.");
    if (!draft.academicYear.trim()) found.push("Academic year is required.");
    if (!draft.startDate) found.push("Start date is required.");
    if (!draft.endDate) found.push("End date is required.");
    if (draft.startDate && draft.endDate && draft.startDate >= draft.endDate)
      found.push("End date must be after the start date.");
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };
  const reset = () => {
    setQuery("");
    setSearch("");
    setStatus("all");
    setYear("");
    setAppliedYear("");
    setPage(1);
  };
  const count = (value: string) =>
    rows.filter((row) => row.status === value).length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Semesters"
        description="Academic terms drive course sections and exam scheduling. A semester moves Planned → Ongoing → Closed."
      >
        <Button
          onClick={() => {
            setDraft(emptyDraft);
            setErrors([]);
            setCreating(true);
          }}
        >
          <Plus aria-hidden />
          New semester
        </Button>
      </PageHeading>

      <section
        aria-label="Semester summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          label="Total semesters"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<CalendarRange aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Ongoing on this page"
          value={count("Ongoing")}
          detail="Currently running terms"
          icon={<CircleDot aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Planned on this page"
          value={count("Planned")}
          detail="Not started yet"
          icon={<CalendarRange aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Closed on this page"
          value={count("Closed")}
          detail="Finished and locked"
          icon={<Lock aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search semesters"
        searchPlaceholder="Search by semester code or name"
        query={query}
        onQueryChange={setQuery}
        onSearch={() => {
          setSearch(query.trim());
          setAppliedYear(year.trim());
          setPage(1);
        }}
        onReset={reset}
        hint="Academic year is applied together with the search button, for example 2026-2027."
      >
        <ChoiceField
          label="Status"
          value={status}
          options={[
            { value: "all", label: "All statuses" },
            ...semesterStatuses.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <TextField label="Academic year" value={year} onChange={setYear} />
      </FilterPanel>

      <TablePanel
        heading="All semesters"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="semesters"
        tableLabel="Semesters table"
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
            <TableHead>Code</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Academic year</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.semesterId}>
              <TableCell className="font-bold">{row.semesterCode}</TableCell>
              <TableCell className="min-w-56 whitespace-normal font-bold">
                {row.semesterName}
              </TableCell>
              <TableCell className="tabular-nums">{row.academicYear}</TableCell>
              <TableCell className="min-w-48 tabular-nums">
                {formatDate(row.startDate)} → {formatDate(row.endDate)}
              </TableCell>
              <TableCell>
                <StatusBadge value={row.status} tone={statusTone(row.status)} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(row);
                      setErrors([]);
                      setDraft({
                        semesterCode: row.semesterCode,
                        semesterName: row.semesterName,
                        academicYear: row.academicYear,
                        startDate: toDateInput(row.startDate),
                        endDate: toDateInput(row.endDate),
                      });
                    }}
                  >
                    Edit
                  </Button>
                  {row.status === "Planned" && (
                    <Button
                      variant="ghost"
                      onClick={() => setTransition({ row, action: "start" })}
                    >
                      Start
                    </Button>
                  )}
                  {row.status === "Ongoing" && (
                    <Button
                      variant="ghost"
                      onClick={() => setTransition({ row, action: "close" })}
                    >
                      Close
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <EmptyRow
              columns={6}
              title="No semesters match your filters."
              hint="Try another search, or plan the next academic term."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New semester" : "Edit semester"}
        description={
          creating
            ? "A new semester starts as Planned. The semester code is permanent."
            : `Update ${editing?.semesterCode ?? ""}. The semester code cannot be changed.`
        }
        submitLabel={creating ? "Create semester" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <TextField
          label="Semester code"
          value={draft.semesterCode}
          disabled={!creating}
          onChange={(value) =>
            setDraft((old) => ({ ...old, semesterCode: value }))
          }
          error={
            errors.some((e) => e.startsWith("Semester code"))
              ? "Semester code is required."
              : undefined
          }
        />
        <TextField
          label="Semester name"
          value={draft.semesterName}
          onChange={(value) =>
            setDraft((old) => ({ ...old, semesterName: value }))
          }
          error={
            errors.some((e) => e.startsWith("Semester name"))
              ? "Semester name is required."
              : undefined
          }
        />
        <TextField
          label="Academic year of semester"
          value={draft.academicYear}
          onChange={(value) =>
            setDraft((old) => ({ ...old, academicYear: value }))
          }
          error={
            errors.some((e) => e.startsWith("Academic year"))
              ? "Academic year is required."
              : undefined
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Start date"
            type="date"
            value={draft.startDate}
            onChange={(value) =>
              setDraft((old) => ({ ...old, startDate: value }))
            }
            error={
              errors.some((e) => e.startsWith("Start date"))
                ? "Start date is required."
                : undefined
            }
          />
          <TextField
            label="End date"
            type="date"
            value={draft.endDate}
            onChange={(value) =>
              setDraft((old) => ({ ...old, endDate: value }))
            }
            error={
              errors.some((e) => e.startsWith("End date"))
                ? "End date is required."
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
          transition?.action === "start" ? "Start semester?" : "Close semester?"
        }
        description={
          transition?.action === "start"
            ? `${transition?.row.semesterName} becomes the Ongoing term and accepts course sections and exam scheduling.`
            : `${transition?.row.semesterName} will be Closed. Closing is not reversible from this workspace.`
        }
        confirmLabel={transition?.action === "start" ? "Start" : "Close"}
        onConfirm={() =>
          transition &&
          move.mutate({
            id: transition.row.semesterId,
            action: transition.action,
          })
        }
      />
    </div>
  );
}
