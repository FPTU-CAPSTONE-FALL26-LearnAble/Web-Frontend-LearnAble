import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Plus, PowerOff } from "lucide-react";
import {
  createDepartment,
  getDepartments,
  setDepartmentActive,
  updateDepartment,
  type Department,
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
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  adminKeys,
  useAdminWrite,
  useExpiredAdminSession,
  useUniversityScope,
} from "../api/useAdminData";
import { UniversityField } from "../components/UniversityField";
import {
  ConfirmAction,
  EmptyRow,
  FilterPanel,
  FormDialog,
  TablePanel,
  formatDate,
} from "../components/AdminSurfaces";

type Draft = {
  universityId: string;
  departmentCode: string;
  departmentName: string;
  description: string;
};
const emptyDraft: Draft = {
  universityId: "",
  departmentCode: "",
  departmentName: "",
  description: "",
};

export function DepartmentsRoute() {
  useRouteAnnouncer("Departments · LearnAble Admin", "Departments");
  const isStaff = useAuthStore(
    (state) => state.user?.role?.toLowerCase() === "staff",
  );
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [editing, setEditing] = useState<Department | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [toggling, setToggling] = useState<Department | null>(null);
  const scope = useUniversityScope();

  const list = useQuery({
    queryKey: adminKeys.list("departments", [
      search,
      active,
      page,
      size,
      isStaff,
    ]),
    queryFn: () =>
      getDepartments({
        SearchTerm: search,
        IsActive: active === "all" ? undefined : active === "active",
        PageNumber: page,
        PageSize: Number(size),
        ...(isStaff ? { SortBy: "-createdAt" } : {}),
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
    resource: "departments",
    action: "Create department",
    mutationFn: () =>
      createDepartment({
        universityId: draft.universityId,
        departmentCode: draft.departmentCode.trim(),
        departmentName: draft.departmentName.trim(),
        description: draft.description.trim() || null,
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "departments",
    action: "Update department",
    mutationFn: () =>
      updateDepartment(editing!.departmentId, {
        departmentName: draft.departmentName.trim(),
        description: draft.description.trim() || null,
      }),
    onSuccess: closeForm,
  });
  const toggle = useAdminWrite<{ id: string; next: boolean }>({
    resource: "departments",
    action: "Department status change",
    // Majors and subjects read a department, so their lists can go stale too.
    alsoInvalidate: ["majors", "subjects"],
    mutationFn: ({ id, next }) => setDepartmentActive(id, next),
    onSuccess: () => setToggling(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (!creating && !editing) return;
    if (creating && !draft.universityId) found.push("University is required.");
    if (creating && !draft.departmentCode.trim())
      found.push("Department code is required.");
    if (!draft.departmentName.trim())
      found.push("Department name is required.");
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };

  const reset = () => {
    setQuery("");
    setSearch("");
    setActive("all");
    setPage(1);
  };
  const activeCount = rows.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Departments"
        description="Create and maintain the faculty structure that majors, subjects and lecturer profiles belong to."
      >
        <Button
          onClick={() => {
            setDraft({ ...emptyDraft, universityId: scope.universityId });
            setErrors([]);
            setCreating(true);
          }}
        >
          <Plus aria-hidden />
          New department
        </Button>
      </PageHeading>

      <section
        aria-label="Department summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SummaryCard
          label="Total departments"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<Building2 aria-hidden className="size-5" />}
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
          detail="Deactivated departments stay readable"
          icon={<PowerOff aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search departments"
        searchPlaceholder="Search by department code or name"
        query={query}
        onQueryChange={setQuery}
        onSearch={() => {
          setSearch(query.trim());
          setPage(1);
        }}
        onReset={reset}
      >
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

      <TablePanel
        heading="All departments"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="departments"
        tableLabel="Departments table"
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
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.departmentId}>
              <TableCell className="font-bold">{row.departmentCode}</TableCell>
              <TableCell className="min-w-80 max-w-md whitespace-normal">
                <p className="font-bold leading-relaxed">
                  {row.departmentName}
                </p>
                {row.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.description}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge
                  value={row.isActive ? "Active" : "Inactive"}
                  tone={row.isActive ? "success" : "neutral"}
                />
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(row.createdAt)}
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
                        universityId: row.universityId,
                        departmentCode: row.departmentCode,
                        departmentName: row.departmentName,
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
              title="No departments match your filters."
              hint="Try another search, or create the first department."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New department" : "Edit department"}
        description={
          creating
            ? "The department code is permanent and cannot be changed later."
            : `Update ${editing?.departmentCode ?? ""}. The department code cannot be changed.`
        }
        submitLabel={creating ? "Create department" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <UniversityField
          value={draft.universityId}
          onChange={(value) =>
            setDraft((old) => ({ ...old, universityId: value }))
          }
        />
        <TextField
          label="Department code"
          value={draft.departmentCode}
          onChange={(value) =>
            setDraft((old) => ({ ...old, departmentCode: value }))
          }
          error={
            creating && errors.some((e) => e.startsWith("Department code"))
              ? "Department code is required."
              : undefined
          }
          disabled={!creating}
        />
        <TextField
          label="Department name"
          value={draft.departmentName}
          onChange={(value) =>
            setDraft((old) => ({ ...old, departmentName: value }))
          }
          error={
            errors.some((e) => e.startsWith("Department name"))
              ? "Department name is required."
              : undefined
          }
        />
        <TextField
          label="Description"
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
          toggling?.isActive ? "Deactivate department?" : "Activate department?"
        }
        description={
          toggling?.isActive
            ? `${toggling?.departmentName} will stop accepting new majors and subjects. Existing records stay readable.`
            : `${toggling?.departmentName} will accept new majors and subjects again.`
        }
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onConfirm={() =>
          toggling &&
          toggle.mutate({ id: toggling.departmentId, next: !toggling.isActive })
        }
      />
    </div>
  );
}
