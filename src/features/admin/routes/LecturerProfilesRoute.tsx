import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, Trash2, UserPlus, Users } from "lucide-react";
import {
  createLecturerProfile,
  deleteLecturerProfile,
  getLecturerProfiles,
  updateLecturerProfile,
  type LecturerProfile,
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
  SummaryCard,
} from "@/components/workbench/Workbench";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import {
  adminKeys,
  departmentLabel,
  useAdminWrite,
  useDepartmentOptions,
  useExpiredAdminSession,
  useUserOptions,
  userLabel,
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
  userId: string;
  departmentId: string;
  academicRank: string;
  officeRoom: string;
  hireDate: string;
  bio: string;
};
const emptyDraft: Draft = {
  userId: "",
  departmentId: "",
  academicRank: "",
  officeRoom: "",
  hireDate: "",
  bio: "",
};
const noDepartment = "none";

export function LecturerProfilesRoute() {
  useRouteAnnouncer("Lecturer Profiles · LearnAble Admin", "Lecturer Profiles");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LecturerProfile | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [removing, setRemoving] = useState<LecturerProfile | null>(null);

  const lecturers = useUserOptions("Lecturer");
  const departments = useDepartmentOptions();
  const lecturerRows = lecturers.data?.items ?? [];
  const departmentRows = departments.data?.items ?? [];

  const list = useQuery({
    queryKey: adminKeys.list("lecturerProfiles", [
      search,
      department,
      page,
      size,
    ]),
    queryFn: () =>
      getLecturerProfiles({
        SearchTerm: search,
        DepartmentId: department === "all" ? undefined : department,
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
  const body = () => ({
    departmentId:
      draft.departmentId === noDepartment || !draft.departmentId
        ? null
        : draft.departmentId,
    academicRank: draft.academicRank.trim() || null,
    officeRoom: draft.officeRoom.trim() || null,
    hireDate: draft.hireDate || null,
    bio: draft.bio.trim() || null,
  });
  const create = useAdminWrite({
    resource: "lecturerProfiles",
    action: "Create lecturer profile",
    mutationFn: () =>
      createLecturerProfile({ userId: draft.userId, ...body() }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "lecturerProfiles",
    action: "Update lecturer profile",
    mutationFn: () =>
      updateLecturerProfile(editing!.userId, body()),
    onSuccess: closeForm,
  });
  const remove = useAdminWrite<string>({
    resource: "lecturerProfiles",
    action: "Delete lecturer profile",
    mutationFn: (id) => deleteLecturerProfile(id),
    onSuccess: () => setRemoving(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating && !draft.userId) found.push("Lecturer account is required.");
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };
  const reset = () => {
    setQuery("");
    setSearch("");
    setDepartment("all");
    setPage(1);
  };
  const withDepartment = rows.filter((row) => row.departmentId).length;
  const referencePending = lecturers.isPending || departments.isPending;
  const referenceError = lecturers.error || departments.error;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Lecturer Profiles"
        description="Staff records behind lecturer accounts: owning department, academic rank, office and hire date."
      >
        <Button
          disabled={!lecturerRows.length}
          onClick={() => {
            setDraft(emptyDraft);
            setErrors([]);
            setCreating(true);
          }}
        >
          <UserPlus aria-hidden />
          New lecturer profile
        </Button>
      </PageHeading>
      {!referencePending && !referenceError && !lecturerRows.length && (
        <p
          role="status"
          className="rounded-xl border border-warning-foreground/30 bg-warning p-4 text-sm text-warning-foreground"
        >
          Create a user account with the Lecturer role first — a profile
          attaches to an existing account.
        </p>
      )}

      <section
        aria-label="Lecturer profile summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SummaryCard
          label="Total profiles"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<Users aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="With a department"
          value={withDepartment}
          detail={`Of ${rows.length} rows shown`}
          icon={<Building2 aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Academic rank recorded"
          value={
            rows.filter((row) => row.academicRank !== "Not available").length
          }
          detail="Rank is optional on this endpoint"
          icon={<BadgeCheck aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search lecturer profiles"
        searchPlaceholder="Search by academic rank or office"
        query={query}
        onQueryChange={setQuery}
        onSearch={() => {
          setSearch(query.trim());
          setPage(1);
        }}
        onReset={reset}
      >
        <ChoiceField
          label="Department"
          value={department}
          options={[
            { value: "all", label: "All departments" },
            ...departmentRows.map((row) => ({
              value: row.departmentId,
              label: `${row.departmentCode} · ${row.departmentName}`,
            })),
          ]}
          onChange={(value) => {
            setDepartment(value);
            setPage(1);
          }}
        />
      </FilterPanel>
      <ReadState
        pending={referencePending}
        error={referenceError}
        retry={() => {
          void lecturers.refetch();
          void departments.refetch();
        }}
      />

      <TablePanel
        heading="All lecturer profiles"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="profiles"
        tableLabel="Lecturer profiles table"
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
            <TableHead>Lecturer</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Academic rank</TableHead>
            <TableHead>Office</TableHead>
            <TableHead>Hired</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.userId}>
              <TableCell className="min-w-56 whitespace-normal">
                <p className="font-bold leading-relaxed">
                  {userLabel(lecturerRows, row.userId) ?? "Account not in list"}
                </p>
                {row.bio && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.bio}
                  </p>
                )}
              </TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {departmentLabel(departmentRows, row.departmentId) ??
                  "Not assigned"}
              </TableCell>
              <TableCell>{row.academicRank}</TableCell>
              <TableCell>{row.officeRoom ?? "Not available"}</TableCell>
              <TableCell className="tabular-nums">
                {formatDate(row.hireDate)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(row);
                      setErrors([]);
                      setDraft({
                        userId: row.userId,
                        departmentId: row.departmentId ?? noDepartment,
                        academicRank:
                          row.academicRank === "Not available"
                            ? ""
                            : row.academicRank,
                        officeRoom: row.officeRoom ?? "",
                        hireDate: toDateInput(row.hireDate),
                        bio: row.bio ?? "",
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Delete profile of ${userLabel(lecturerRows, row.userId) ?? "this lecturer"}`}
                    onClick={() => setRemoving(row)}
                  >
                    <Trash2 aria-hidden />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <EmptyRow
              columns={6}
              title="No lecturer profiles match your filters."
              hint="Try another search, or create a profile for a lecturer account."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New lecturer profile" : "Edit lecturer profile"}
        description={
          creating
            ? "The lecturer account is permanent once the profile exists. Every other field can be changed later."
            : `Update the profile of ${userLabel(lecturerRows, editing?.userId) ?? "this lecturer"}.`
        }
        submitLabel={creating ? "Create profile" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <ChoiceField
          label="Lecturer account"
          value={draft.userId}
          placeholder="Select a lecturer account"
          disabled={!creating}
          options={lecturerRows.map((row) => ({
            value: row.userId,
            label: `${row.userCode} · ${row.fullName}`,
          }))}
          onChange={(value) => setDraft((old) => ({ ...old, userId: value }))}
        />
        <ChoiceField
          label="Owning department of lecturer"
          value={draft.departmentId || noDepartment}
          placeholder="Select a department"
          options={[
            { value: noDepartment, label: "No department" },
            ...departmentRows.map((row) => ({
              value: row.departmentId,
              label: `${row.departmentCode} · ${row.departmentName}`,
            })),
          ]}
          onChange={(value) =>
            setDraft((old) => ({ ...old, departmentId: value }))
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Academic rank"
            value={draft.academicRank}
            onChange={(value) =>
              setDraft((old) => ({ ...old, academicRank: value }))
            }
          />
          <TextField
            label="Office room"
            value={draft.officeRoom}
            onChange={(value) =>
              setDraft((old) => ({ ...old, officeRoom: value }))
            }
          />
        </div>
        <TextField
          label="Hire date"
          type="date"
          value={draft.hireDate}
          onChange={(value) => setDraft((old) => ({ ...old, hireDate: value }))}
        />
        <TextField
          label="Biography"
          value={draft.bio}
          multiline
          onChange={(value) => setDraft((old) => ({ ...old, bio: value }))}
        />
      </FormDialog>

      <ConfirmAction
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Delete lecturer profile?"
        description={`The staff record for ${userLabel(lecturerRows, removing?.userId) ?? "this lecturer"} will be removed. The user account itself is not deleted. This cannot be undone.`}
        confirmLabel="Delete profile"
        onConfirm={() => removing && remove.mutate(removing.userId)}
      />
    </div>
  );
}
