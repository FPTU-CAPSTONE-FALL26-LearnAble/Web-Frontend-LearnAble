import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PowerOff, ShieldCheck, UserCog, Users } from "lucide-react";
import { describeError } from "@/app/providers";
import {
  activateUser,
  changeUserRole,
  createLecturerProfile,
  createStudentProfile,
  createUser,
  deactivateUser,
  getAdminUsers,
  resetUserPassword,
  staffManagedUserRoles,
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
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  DayMonthYearField,
  RevealablePasswordField,
} from "@/components/workbench/AccountFields";
import {
  adminKeys,
  useAdminWrite,
  useCurriculumOptions,
  useDepartmentOptions,
  useMajorOptions,
  universityLabel,
  useExpiredAdminSession,
  useUniversityOptions,
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
  departmentId: string;
  majorId: string;
  curriculumId: string;
  intakeYear: string;
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
  departmentId: "",
  majorId: "",
  curriculumId: "",
  intakeYear: "",
};
const genders = ["Male", "Female", "Other"];
const unset = "unset";
const REASON_MAX = 500;
const TEMP_PASSWORD_MIN = 8;

type AccountAction = {
  row: AdminUser;
  kind: "reset" | "role";
};
type AccountActionDraft = { password: string; reason: string; role: string };
const emptyActionDraft: AccountActionDraft = { password: "", reason: "", role: "" };

/** Reasons are kept for the audit trail, so the Backend requires one for sensitive changes. */
function reasonError(reason: string) {
  if (!reason.trim()) return "Give a reason for this change.";
  if (reason.trim().length > REASON_MAX) return `The reason must be ${REASON_MAX} characters or fewer.`;
  return null;
}

const roleTone = (role: string) =>
  role === "Admin"
    ? ("danger" as const)
    : role === "Examiner"
      ? ("warning" as const)
      : role === "Lecturer"
        ? ("info" as const)
        : ("neutral" as const);

type UsersRouteProps = {
  fixedRole?: UserRole;
};

export function UsersRoute({ fixedRole }: UsersRouteProps = {}) {
  const examinerRecords = fixedRole === "Examiner";
  const pageTitle = examinerRecords ? "Examiner Records" : "User Accounts";
  useRouteAnnouncer(`${pageTitle} · LearnAble`, pageTitle);
  const isStaff = useAuthStore(
    (state) => state.user?.role?.toLowerCase() === "staff",
  );
  const currentUserId = useAuthStore((state) => state.user?.id);
  const managedRoles = isStaff ? staffManagedUserRoles : userRoles;
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(fixedRole ?? "all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const scope = useUniversityScope();
  const universities = useUniversityOptions();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [deactivating, setDeactivating] = useState<AdminUser | null>(null);
  const [reactivating, setReactivating] = useState<AdminUser | null>(null);
  const [accountAction, setAccountAction] = useState<AccountAction | null>(null);
  const [actionDraft, setActionDraft] = useState<AccountActionDraft>(emptyActionDraft);
  const [actionErrors, setActionErrors] = useState<string[]>([]);
  const [createdAccount, setCreatedAccount] = useState<AdminUser | null>(null);
  const [staffDateError, setStaffDateError] = useState<string | null>(null);
  const departments = useDepartmentOptions(isStaff);
  const majors = useMajorOptions(isStaff);
  const curriculums = useCurriculumOptions(
    isStaff && draft.role === "Student"
      ? draft.majorId || undefined
      : undefined,
  );
  const departmentRows = departments.data?.items ?? [];
  const majorRows = (majors.data?.items ?? []).filter(
    (item) => !draft.departmentId || item.departmentId === draft.departmentId,
  );

  const list = useQuery({
    queryKey: adminKeys.list("users", [
      search,
      fixedRole ?? role,
      status,
      page,
      size,
      isStaff,
    ]),
    queryFn: () =>
      getAdminUsers({
        SearchTerm: search,
        Role: fixedRole ?? (role === "all" ? undefined : role),
        Status: status === "all" ? undefined : status,
        UniversityId: isStaff ? scope.universityId : undefined,
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
    setCreatedAccount(null);
    setStaffDateError(null);
    setErrors([]);
  };
  const create = useAdminWrite({
    resource: "users",
    action: "Create account",
    alsoInvalidate: ["studentProfiles", "lecturerProfiles"],
    mutationFn: async () => {
      const account =
        createdAccount ??
        (await createUser({
          universityId: draft.universityId,
          userCode: draft.userCode.trim(),
          fullName: draft.fullName.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim() || null,
          dateOfBirth: draft.dateOfBirth || null,
          gender: draft.gender === unset ? null : draft.gender || null,
          role: draft.role,
          password: draft.password,
        }));
      if (!createdAccount) setCreatedAccount(account);
      if (isStaff && draft.role === "Student") {
        await createStudentProfile({
          userId: account.userId,
          majorId: draft.majorId,
          curriculumId: draft.curriculumId,
          intakeYear: Number(draft.intakeYear),
        });
      }
      if (isStaff && draft.role === "Lecturer") {
        await createLecturerProfile({
          userId: account.userId,
          departmentId: draft.departmentId,
        });
      }
      return account;
    },
    onSuccess: closeForm,
    onError: (error) => setErrors([describeError(error)]),
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
  const reactivate = useAdminWrite<AdminUser>({
    resource: "users",
    action: "Account reactivation",
    alsoInvalidate: ["studentProfiles", "lecturerProfiles"],
    mutationFn: (row) => activateUser(row.userId, row.revision),
    onSuccess: () => setReactivating(null),
  });
  const closeAccountAction = () => {
    setAccountAction(null);
    setActionDraft(emptyActionDraft);
    setActionErrors([]);
  };
  const resetPassword = useAdminWrite({
    resource: "users",
    action: "Password reset",
    mutationFn: () =>
      resetUserPassword(
        accountAction!.row.userId,
        {
          temporaryPassword: actionDraft.password,
          reason: actionDraft.reason.trim(),
        },
        accountAction!.row.revision,
      ),
    onSuccess: closeAccountAction,
    onError: (error) => setActionErrors([describeError(error)]),
  });
  const changeRole = useAdminWrite({
    resource: "users",
    action: "Role change",
    alsoInvalidate: ["studentProfiles", "lecturerProfiles"],
    mutationFn: () =>
      changeUserRole(
        accountAction!.row.userId,
        {
          role: actionDraft.role as UserRole,
          reason: actionDraft.reason.trim(),
        },
        accountAction!.row.revision,
      ),
    onSuccess: closeAccountAction,
    onError: (error) => setActionErrors([describeError(error)]),
  });
  const openAccountAction = (row: AdminUser, kind: AccountAction["kind"]) => {
    setAccountAction({ row, kind });
    setActionDraft({
      ...emptyActionDraft,
      role: kind === "role" ? (managedRoles.find((item) => item !== row.role) ?? "") : "",
    });
    setActionErrors([]);
  };
  const submitAccountAction = () => {
    if (!accountAction) return;
    const found: string[] = [];
    if (accountAction.kind === "reset" && actionDraft.password.length < TEMP_PASSWORD_MIN)
      found.push(`The temporary password must be at least ${TEMP_PASSWORD_MIN} characters.`);
    if (accountAction.kind === "role" && (!actionDraft.role || actionDraft.role === accountAction.row.role))
      found.push("Choose a different role.");
    const reason = reasonError(actionDraft.reason);
    if (reason) found.push(reason);
    setActionErrors(found);
    if (found.length) return;
    if (accountAction.kind === "reset") resetPassword.mutate();
    else changeRole.mutate();
  };
  const actionPending = resetPassword.isPending || changeRole.isPending;

  const submit = () => {
    const found: string[] = [];
    if (creating && !draft.universityId) found.push("University is required.");
    if (!draft.fullName.trim()) found.push("Full name is required.");
    if (isStaff && staffDateError) found.push(staffDateError);
    if (creating) {
      if (!draft.userCode.trim()) found.push("User code is required.");
      if (!draft.email.trim()) found.push("Email is required.");
      else if (!/^\S+@\S+\.\S+$/.test(draft.email.trim()))
        found.push("Email must be a valid address.");
      if (draft.password.length < 8)
        found.push("Password must be at least 8 characters.");
      if (isStaff && draft.role === "Student") {
        if (!draft.departmentId)
          found.push("Department is required for a student.");
        if (!draft.majorId) found.push("Major is required for a student.");
        if (!draft.curriculumId)
          found.push("Curriculum is required for a student.");
        const intakeYear = Number(draft.intakeYear);
        if (!Number.isInteger(intakeYear) || intakeYear < 1900)
          found.push("Intake year must be a four-digit year.");
      }
      if (isStaff && draft.role === "Lecturer" && !draft.departmentId)
        found.push("Department is required for a lecturer.");
    }
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };
  const reset = () => {
    setQuery("");
    setSearch("");
    setRole(fixedRole ?? "all");
    setStatus("all");
    setPage(1);
  };
  const activeCount = rows.filter((row) => row.status === "Active").length;
  const examinerCount = rows.filter((row) => row.role === "Examiner").length;
  const startCreate = (role: UserRole = fixedRole ?? "Student") => {
    setDraft({
      ...emptyDraft,
      universityId: scope.universityId,
      role,
    });
    setErrors([]);
    setCreating(true);
  };

  return (
    <div className="space-y-6">
      <PageHeading title={pageTitle}>
        {examinerRecords ? (
          <Button onClick={() => startCreate("Examiner")}>
            <ShieldCheck aria-hidden />
            New examiner
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => startCreate("Examiner")}>
              <ShieldCheck aria-hidden />
              New examiner
            </Button>
            <Button onClick={() => startCreate()}>
              <UserCog aria-hidden />
              New account
            </Button>
          </div>
        )}
      </PageHeading>

      <section
        aria-label="Account summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          label={examinerRecords ? "Total examiners" : "Total accounts"}
          value={list.data?.totalCount ?? "Not available"}
          icon={<Users aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Active on this page"
          value={activeCount}
          icon={<ShieldCheck aria-hidden className="size-5" />}
        />
        <SummaryCard
          label="Inactive on this page"
          value={rows.length - activeCount}
          icon={<PowerOff aria-hidden className="size-5" />}
        />
        <SummaryCard
          label={
            examinerRecords ? "Examiners on this page" : "Examiner accounts"
          }
          value={examinerRecords ? rows.length : examinerCount}
          icon={<ShieldCheck aria-hidden className="size-5" />}
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
        {!fixedRole && (
          <ChoiceField
            label="Role"
            value={role}
            options={[
              { value: "all", label: "All roles" },
              ...managedRoles.map((value) => ({ value, label: value })),
            ]}
            onChange={(value) => {
              setRole(value);
              setPage(1);
            }}
          />
        )}
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
        heading={examinerRecords ? "All examiner accounts" : "All accounts"}
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun={examinerRecords ? "examiners" : "accounts"}
        tableLabel={
          examinerRecords ? "Examiner accounts table" : "User accounts table"
        }
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
            <TableHead>University</TableHead>
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
              <TableCell className="min-w-48 whitespace-normal">
                {universityLabel(
                  universities.data?.items ?? [],
                  row.universityId,
                ) ?? "Not available"}
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
                <div className="flex min-w-max flex-nowrap gap-2">
                  <Button
                    variant="outline"
                    disabled={
                      isStaff && (row.role === "Admin" || row.role === "Staff")
                    }
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
                        departmentId: "",
                        majorId: "",
                        curriculumId: "",
                        intakeYear: "",
                      });
                    }}
                  >
                    Edit
                  </Button>
                  {row.status === "Active" &&
                    !(
                      isStaff &&
                      (row.role === "Admin" || row.role === "Staff")
                    ) && (
                      <Button
                        variant="ghost"
                        onClick={() => setDeactivating(row)}
                      >
                        Deactivate
                      </Button>
                    )}
                  {row.status !== "Active" &&
                  !(
                    isStaff &&
                    (row.role === "Admin" || row.role === "Staff")
                  ) ? (
                    <Button
                      variant="outline"
                      onClick={() => setReactivating(row)}
                    >
                      Reactivate
                    </Button>
                  ) : null}
                  {!(
                    isStaff &&
                    (row.role === "Admin" || row.role === "Staff")
                  ) && row.userId !== currentUserId ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => openAccountAction(row, "reset")}
                      >
                        Reset password
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => openAccountAction(row, "role")}
                      >
                        Change role
                      </Button>
                    </>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <EmptyRow
              columns={8}
              title={
                examinerRecords
                  ? "No examiner accounts match your filters."
                  : "No accounts match your filters."
              }
              hint={
                examinerRecords
                  ? "Try another search, or create an examiner account."
                  : "Try another search, or create the account you need."
              }
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={
          creating
            ? examinerRecords
              ? "New examiner"
              : "New account"
            : "Edit account"
        }
        description={
          creating
            ? "User code, email and role are permanent once the account exists."
            : `Update ${editing?.fullName ?? ""}. User code, email and role cannot be changed here.`
        }
        submitLabel={
          creating
            ? createdAccount
              ? "Retry academic profile"
              : "Create account"
            : "Save changes"
        }
        pending={create.isPending || update.isPending}
        errors={errors}
        errorsBelowActions={isStaff}
        onSubmit={submit}
      >
        <UniversityField
          value={draft.universityId}
          selectable={creating}
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
            disabled={!creating || Boolean(fixedRole)}
            options={(fixedRole ? [fixedRole] : managedRoles).map((value) => ({
              value,
              label: value,
            }))}
            onChange={(value) =>
              setDraft((old) => ({
                ...old,
                role: value as UserRole,
                departmentId: "",
                majorId: "",
                curriculumId: "",
                intakeYear: "",
              }))
            }
          />
        </div>
        {creating &&
        isStaff &&
        (draft.role === "Student" || draft.role === "Lecturer") ? (
          <ChoiceField
            label={
              draft.role === "Student"
                ? "Department of student"
                : "Department of lecturer"
            }
            value={draft.departmentId}
            placeholder="Select a department"
            options={departmentRows.map((row) => ({
              value: row.departmentId,
              label: `${row.departmentCode} · ${row.departmentName}`,
            }))}
            onChange={(value) =>
              setDraft((old) => ({
                ...old,
                departmentId: value,
                majorId: "",
                curriculumId: "",
              }))
            }
          />
        ) : null}
        {creating && isStaff && draft.role === "Student" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ChoiceField
              label="Major of student"
              value={draft.majorId}
              placeholder="Select a major"
              options={majorRows.map((row) => ({
                value: row.majorId,
                label: `${row.majorCode} · ${row.majorName}`,
              }))}
              onChange={(value) =>
                setDraft((old) => ({
                  ...old,
                  majorId: value,
                  curriculumId: "",
                }))
              }
            />
            <ChoiceField
              label="Curriculum of student"
              value={draft.curriculumId}
              placeholder="Select a curriculum"
              options={(curriculums.data?.items ?? []).map((row) => ({
                value: row.curriculumId,
                label: `${row.curriculumCode} · ${row.version} · ${row.intakeYear}`,
              }))}
              onChange={(value) =>
                setDraft((old) => ({ ...old, curriculumId: value }))
              }
            />
            <TextField
              label="Intake year"
              type="number"
              min="1900"
              value={draft.intakeYear}
              onChange={(value) =>
                setDraft((old) => ({ ...old, intakeYear: value }))
              }
              error={errors.find((item) => item.startsWith("Intake year"))}
            />
          </div>
        ) : null}
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
        {creating &&
          (isStaff ? (
            <RevealablePasswordField
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
          ) : (
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
          ))}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Phone number"
            value={draft.phone}
            onChange={(value) => setDraft((old) => ({ ...old, phone: value }))}
          />
          {isStaff ? (
            <DayMonthYearField
              value={draft.dateOfBirth}
              onChange={(value) =>
                setDraft((old) => ({ ...old, dateOfBirth: value }))
              }
              onValidityChange={setStaffDateError}
            />
          ) : (
            <TextField
              label="Date of birth"
              type="date"
              value={draft.dateOfBirth}
              onChange={(value) =>
                setDraft((old) => ({ ...old, dateOfBirth: value }))
              }
            />
          )}
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
            sign-in. For Staff-created students and lecturers, the matching
            academic profile is created immediately after the account.
          </p>
        )}
        {createdAccount ? (
          <p
            role="status"
            className="text-sm font-semibold text-warning-foreground"
          >
            Account {createdAccount.userCode} was created. Retry only creates
            its missing academic profile and will not duplicate the account.
          </p>
        ) : null}
      </FormDialog>

      <ConfirmAction
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open && !deactivate.isPending) setDeactivating(null);
        }}
        title="Deactivate account?"
        description={`${deactivating?.fullName ?? "This account"} will no longer be able to sign in. You can reactivate the account later from this list.`}
        confirmLabel="Deactivate"
        pendingLabel="Deactivating…"
        pending={deactivate.isPending}
        onConfirm={() =>
          deactivating &&
          !deactivate.isPending &&
          deactivate.mutate(deactivating.userId)
        }
      />

      <ConfirmAction
        open={reactivating !== null}
        onOpenChange={(open) => {
          if (!open && !reactivate.isPending) setReactivating(null);
        }}
        title="Reactivate account?"
        description={`${reactivating?.fullName ?? "This account"} will be able to sign in again with their current password.`}
        confirmLabel="Reactivate"
        pendingLabel="Reactivating…"
        pending={reactivate.isPending}
        onConfirm={() =>
          reactivating && !reactivate.isPending && reactivate.mutate(reactivating)
        }
      />

      <FormDialog
        open={accountAction !== null}
        onOpenChange={(open) => {
          if (!open && !actionPending) closeAccountAction();
        }}
        title={accountAction?.kind === "reset" ? "Reset password" : "Change role"}
        description={
          accountAction?.kind === "reset"
            ? `Set a temporary password for ${accountAction.row.fullName}. Share it with them securely and ask them to change it after signing in. It is not shown again.`
            : `Change the role of ${accountAction?.row.fullName ?? "this account"} (currently ${accountAction?.row.role ?? ""}). The Backend applies its own rules for any linked student or lecturer profile and explains if the change is not allowed.`
        }
        submitLabel={accountAction?.kind === "reset" ? "Reset password" : "Change role"}
        pending={actionPending}
        errors={actionErrors}
        onSubmit={submitAccountAction}
      >
        {accountAction?.kind === "reset" ? (
          <RevealablePasswordField
            label="Temporary password"
            value={actionDraft.password}
            onChange={(password) => setActionDraft((old) => ({ ...old, password }))}
          />
        ) : (
          <ChoiceField
            label="New role"
            value={actionDraft.role}
            options={managedRoles
              .filter((item) => item !== accountAction?.row.role)
              .map((value) => ({ value, label: value }))}
            onChange={(next) => setActionDraft((old) => ({ ...old, role: next }))}
          />
        )}
        <TextField
          label="Reason"
          multiline
          value={actionDraft.reason}
          onChange={(reason) => setActionDraft((old) => ({ ...old, reason }))}
        />
        <p className="text-xs tabular-nums text-muted-foreground">
          {actionDraft.reason.trim().length}/{REASON_MAX} characters. The reason is recorded with the change.
        </p>
      </FormDialog>
    </div>
  );
}

export function ExaminerRecordsRoute() {
  return <UsersRoute fixedRole="Examiner" />;
}
