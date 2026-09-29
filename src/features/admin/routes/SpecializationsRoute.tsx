import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Network, Plus, PowerOff } from "lucide-react";
import {
  createSpecialization,
  getSpecializations,
  setSpecializationActive,
  updateSpecialization,
  type Specialization,
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
} from "../components/AdminSurfaces";

type Draft = {
  majorId: string;
  specializationCode: string;
  specializationName: string;
  description: string;
};
const emptyDraft: Draft = {
  majorId: "",
  specializationCode: "",
  specializationName: "",
  description: "",
};

export function SpecializationsRoute() {
  useRouteAnnouncer("Specializations · LearnAble Admin", "Specializations");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [major, setMajor] = useState("all");
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Specialization | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [toggling, setToggling] = useState<Specialization | null>(null);

  const majors = useMajorOptions();
  const majorRows = majors.data?.items ?? [];
  const list = useQuery({
    queryKey: adminKeys.list("specializations", [
      search,
      major,
      active,
      page,
      size,
    ]),
    queryFn: () =>
      getSpecializations({
        SearchTerm: search,
        MajorId: major === "all" ? undefined : major,
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
    resource: "specializations",
    action: "Create specialization",
    mutationFn: () =>
      createSpecialization({
        majorId: draft.majorId,
        specializationCode: draft.specializationCode.trim(),
        specializationName: draft.specializationName.trim(),
        description: draft.description.trim() || null,
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "specializations",
    action: "Update specialization",
    mutationFn: () =>
      updateSpecialization(editing!.specializationId, {
        specializationName: draft.specializationName.trim(),
        description: draft.description.trim() || null,
      }),
    onSuccess: closeForm,
  });
  const toggle = useAdminWrite<{ id: string; next: boolean }>({
    resource: "specializations",
    action: "Specialization status change",
    alsoInvalidate: ["studentProfiles"],
    mutationFn: ({ id, next }) => setSpecializationActive(id, next),
    onSuccess: () => setToggling(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating && !draft.majorId) found.push("Owning major is required.");
    if (creating && !draft.specializationCode.trim())
      found.push("Specialization code is required.");
    if (!draft.specializationName.trim())
      found.push("Specialization name is required.");
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };
  const reset = () => {
    setQuery("");
    setSearch("");
    setMajor("all");
    setActive("all");
    setPage(1);
  };
  const activeCount = rows.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Specializations"
        description="Optional tracks inside a major. Student profiles may reference one specialization."
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
          New specialization
        </Button>
      </PageHeading>
      {!majors.isPending && !majors.error && !majorRows.length && (
        <p
          role="status"
          className="rounded-xl border border-warning-foreground/30 bg-warning p-4 text-sm text-warning-foreground"
        >
          Create a major first — every specialization must belong to one.
        </p>
      )}

      <section
        aria-label="Specialization summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SummaryCard
          label="Total specializations"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<Network aria-hidden className="size-5" />}
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
          detail="Deactivated tracks stay readable"
          icon={<PowerOff aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search specializations"
        searchPlaceholder="Search by specialization code or name"
        query={query}
        onQueryChange={setQuery}
        onSearch={() => {
          setSearch(query.trim());
          setPage(1);
        }}
        onReset={reset}
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
        pending={majors.isPending}
        error={majors.error}
        retry={() => void majors.refetch()}
      />

      <TablePanel
        heading="All specializations"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="specializations"
        tableLabel="Specializations table"
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
            <TableHead>Specialization</TableHead>
            <TableHead>Major</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.specializationId}>
              <TableCell className="font-bold">
                {row.specializationCode}
              </TableCell>
              <TableCell className="min-w-72 max-w-md whitespace-normal">
                <p className="font-bold leading-relaxed">
                  {row.specializationName}
                </p>
                {row.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {majorLabel(majorRows, row.majorId) ?? "Not available"}
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
                        majorId: row.majorId,
                        specializationCode: row.specializationCode,
                        specializationName: row.specializationName,
                        description: row.description ?? "",
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
              columns={6}
              title="No specializations match your filters."
              hint="Try another search, or create a track under a major."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New specialization" : "Edit specialization"}
        description={
          creating
            ? "The owning major and specialization code are permanent once created."
            : `Update ${editing?.specializationCode ?? ""}. Major and code cannot be changed.`
        }
        submitLabel={creating ? "Create specialization" : "Save changes"}
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
        <TextField
          label="Specialization code"
          value={draft.specializationCode}
          disabled={!creating}
          onChange={(value) =>
            setDraft((old) => ({ ...old, specializationCode: value }))
          }
          error={
            errors.some((e) => e.startsWith("Specialization code"))
              ? "Specialization code is required."
              : undefined
          }
        />
        <TextField
          label="Specialization name"
          value={draft.specializationName}
          onChange={(value) =>
            setDraft((old) => ({ ...old, specializationName: value }))
          }
          error={
            errors.some((e) => e.startsWith("Specialization name"))
              ? "Specialization name is required."
              : undefined
          }
        />
        <TextField
          label="Specialization description"
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
        title={
          toggling?.isActive
            ? "Deactivate specialization?"
            : "Activate specialization?"
        }
        description={
          toggling?.isActive
            ? `${toggling?.specializationName} will stop accepting new student profiles. Existing profiles stay readable.`
            : `${toggling?.specializationName} will accept new student profiles again.`
        }
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onConfirm={() =>
          toggling &&
          toggle.mutate({
            id: toggling.specializationId,
            next: !toggling.isActive,
          })
        }
      />
    </div>
  );
}
