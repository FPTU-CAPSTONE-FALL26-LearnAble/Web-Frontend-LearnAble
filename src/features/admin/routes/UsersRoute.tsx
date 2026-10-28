import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PowerOff, ShieldCheck, UserCog, Users } from "lucide-react";
import {
  createUser,
  deactivateUser,
  getAdminUsers,
  updateUser,
  userRoles,
  userStatuses,
  type AdminUser,
  type UserRole,
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
  toDateInput,
} from "../components/AdminSurfaces";

type Draft = {
  universityId: string;
  userCode: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  role: UserRole;
  password: string;
};
const emptyDraft: Draft = {
  universityId: "",
  userCode: "",
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  role: "Student",
  password: "",
};
const genders = ["Male", "Female", "Other"];
const unset = "unset";

const roleTone = (role: string) =>
  role === "Admin"
    ? ("danger" as const)
    : role === "Examiner"
      ? ("warning" as const)
      : role === "Lecturer"
        ? ("info" as const)
        : ("neutral" as const);

export function UsersRoute() {
  useRouteAnnouncer("User Accounts · LearnAble Admin", "User Accounts");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const scope = useUniversityScope();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [deactivating, setDeactivating] = useState<AdminUser | null>(null);

  const list = useQuery({
    queryKey: adminKeys.list("users", [search, role, status, page, size]),
    queryFn: () =>
      getAdminUsers({
        SearchTerm: search,
        Role: role === "all" ? undefined : role,
        Status: status === "all" ? undefined : status,
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
    resource: "users",
    action: "Create account",
    mutationFn: () =>
      createUser({
        universityId: draft.universityId,
        userCode: draft.userCode.trim(),
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim() || null,
        dateOfBirth: draft.dateOfBirth || null,
        gender: draft.gender === unset ? null : draft.gender || null,
        role: draft.role,
        password: draft.password,
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "users",
    action: "Update account",
    mutationFn: () =>
      updateUser(editing!.userId, {
        fullName: draft.fullName.trim(),
        phone: draft.phone.trim() || null,
        dateOfBirth: draft.dateOfBirth || null,
        gender: draft.gender === unset ? null : draft.gender || null,
      }),
    onSuccess: closeForm,
  });
  const deactivate = useAdminWrite<string>({
    resource: "users",
    action: "Account deactivation",
    // Profile lists render the account's role and name.
    alsoInvalidate: ["studentProfiles", "lecturerProfiles"],
    mutationFn: (id) => deactivateUser(id),
    onSuccess: () => setDeactivating(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (creating && !draft.universityId)
      found.push("University is required.");
    if (!draft.fullName.trim()) found.push("Full name is required.");
    if (creating) {
      if (!draft.userCode.trim()) found.push("User code is required.");
      if (!draft.email.trim()) found.push("Email is required.");
      else if (!/^\S+@\S+\.\S+$/.test(draft.email.trim()))
        found.push("Email must be a valid address.");
      if (draft.password.length < 8)
        found.push("Password must be at least 8 characters.");
    }
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };
  const reset = () => {
    setQuery("");
    setSearch("");
    setRole("all");
    setStatus("all");
    setPage(1);
  };
  const activeCount = rows.filter((row) => row.status === "Active").length;
  const staffCount = rows.filter((row) => row.role !== "Student").length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="User Accounts"
        description="Every LearnAble sign-in. A role decides which workspace the account reaches after login."
      >
        <Button
          onClick={() => {
            setDraft({ ...emptyDraft, universityId: scope.universityId });
            setErrors([]);
            setCreating(true);
          }}
        >
          <UserCog aria-hidden />
          New account
        </Button>
      </PageHeading>

      <section
        aria-label="Account summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          label="Total accounts"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<Users aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Active on this page"
          value={activeCount}
          detail={`Of ${rows.length} rows shown`}
          icon={<ShieldCheck aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Inactive on this page"
          value={rows.length - activeCount}
          detail="Cannot sign in"
          icon={<PowerOff aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Staff on this page"
          value={staffCount}
          detail="Lecturer, examiner or admin"
          icon={<UserCog aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search accounts"
        searchPlaceholder="Search by name, email or user code"
        query={query}
        onQueryChange={setQuery}
        onSearch={() => {
          setSearch(query.trim());
          setPage(1);
        }}
        onReset={reset}
      >
        <ChoiceField
          label="Role"
          value={role}
          options={[
            { value: "all", label: "All roles" },
            ...userRoles.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
        />
        <ChoiceField
          label="Account status"
          value={status}
          options={[
            { value: "all", label: "All statuses" },
            ...userStatuses.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </FilterPanel>

      <TablePanel
        heading="All accounts"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="accounts"
        tableLabel="User accounts table"
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
            <TableHead>User code</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.userId}>
              <TableCell className="font-bold tabular-nums">
                {row.userCode}
              </TableCell>
              <TableCell className="min-w-64 max-w-sm whitespace-normal">
                <p className="font-bold leading-relaxed">{row.fullName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.gender ?? "Gender not recorded"} ·{" "}
                  {row.dateOfBirth
                    ? formatDate(row.dateOfBirth)
                    : "Date of birth not recorded"}
                </p>
              </TableCell>
              <TableCell className="min-w-56 whitespace-normal">
                <p className="break-all">{row.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.phone ?? "No phone recorded"}
                </p>
              </TableCell>
              <TableCell>
                <StatusBadge value={row.role} tone={roleTone(row.role)} />
              </TableCell>
              <TableCell>
                <StatusBadge
                  value={row.status}
                  tone={row.status === "Active" ? "success" : "neutral"}
                />
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(row.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(row);
                      setErrors([]);
                      setDraft({
                        universityId: row.universityId,
                        userCode: row.userCode,
                        fullName: row.fullName,
                        email: row.email,
                        phone: row.phone ?? "",
                        dateOfBirth: toDateInput(row.dateOfBirth),
                        gender: row.gender ?? unset,
                        role: (row.role as UserRole) ?? "Student",
                        password: "",
                      });
                    }}
                  >
                    Edit
                  </Button>
                  {row.status === "Active" && (
                    <Button
                      variant="ghost"
                      onClick={() => setDeactivating(row)}
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <EmptyRow
              columns={7}
              title="No accounts match your filters."
              hint="Try another search, or create the account you need."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New account" : "Edit account"}
        description={
          creating
            ? "User code, email and role are permanent once the account exists."
            : `Update ${editing?.fullName ?? ""}. User code, email and role cannot be changed here.`
        }
        submitLabel={creating ? "Create account" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <UniversityField
          value={draft.universityId}
          disabled={!creating}
          onChange={(value) =>
            setDraft((old) => ({ ...old, universityId: value }))
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="User code"
            value={draft.userCode}
            disabled={!creating}
            onChange={(value) =>
              setDraft((old) => ({ ...old, userCode: value }))
            }
            error={
              errors.some((e) => e.startsWith("User code"))
                ? "User code is required."
                : undefined
            }
          />
          <ChoiceField
            label="Role"
            value={draft.role}
            disabled={!creating}
            options={userRoles.map((value) => ({ value, label: value }))}
            onChange={(value) =>
              setDraft((old) => ({ ...old, role: value as UserRole }))
            }
          />
        </div>
        <TextField
          label="Full name"
          value={draft.fullName}
          onChange={(value) => setDraft((old) => ({ ...old, fullName: value }))}
          error={
            errors.some((e) => e.startsWith("Full name"))
              ? "Full name is required."
              : undefined
          }
        />
        <TextField
          label="Email address"
          type="email"
          value={draft.email}
          disabled={!creating}
          onChange={(value) => setDraft((old) => ({ ...old, email: value }))}
          error={errors.find((e) => e.startsWith("Email"))}
        />
        {creating && (
          <TextField
            label="Initial password"
            type="password"
            value={draft.password}
            onChange={(value) =>
              setDraft((old) => ({ ...old, password: value }))
            }
            error={
              errors.some((e) => e.startsWith("Password"))
                ? "Password must be at least 8 characters."
                : undefined
            }
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Phone number"
            value={draft.phone}
            onChange={(value) => setDraft((old) => ({ ...old, phone: value }))}
          />
          <TextField
            label="Date of birth"
            type="date"
            value={draft.dateOfBirth}
            onChange={(value) =>
              setDraft((old) => ({ ...old, dateOfBirth: value }))
            }
          />
        </div>
        <ChoiceField
          label="Gender"
          value={draft.gender || unset}
          options={[
            { value: unset, label: "Not recorded" },
            ...genders.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => setDraft((old) => ({ ...old, gender: value }))}
        />
        {creating && (
          <p className="text-xs text-muted-foreground">
            The account owner should change this password after their first
            sign-in. A student or lecturer also needs a matching profile before
            their workspace is complete.
          </p>
        )}
      </FormDialog>

      <ConfirmAction
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
        title="Deactivate account?"
        description={`${deactivating?.fullName ?? "This account"} will no longer be able to sign in. The API exposes no reactivation endpoint, so this cannot be undone from this workspace.`}
        confirmLabel="Deactivate"
        onConfirm={() => deactivating && deactivate.mutate(deactivating.userId)}
      />
    </div>
  );
}
