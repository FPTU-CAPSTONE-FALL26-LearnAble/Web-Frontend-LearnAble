import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Plus, PowerOff, University as UniversityIcon } from "lucide-react";
import {
  createUniversity,
  getUniversities,
  setUniversityActive,
  universityStatuses,
  updateUniversity,
  type University,
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
} from "../components/AdminSurfaces";

type Draft = {
  code: string;
  name: string;
  shortName: string;
  nameEn: string;
  address: string;
  phone: string;
  contactEmail: string;
  subdomain: string;
  emailDomain: string;
  logoUrl: string;
};
const emptyDraft: Draft = {
  code: "",
  name: "",
  shortName: "",
  nameEn: "",
  address: "",
  phone: "",
  contactEmail: "",
  subdomain: "",
  emailDomain: "",
  logoUrl: "",
};
const optional = (value: string) => value.trim() || null;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UniversitiesRoute() {
  useRouteAnnouncer("Universities · LearnAble Admin", "Universities");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState("10");
  const [editing, setEditing] = useState<University | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [toggling, setToggling] = useState<University | null>(null);

  const list = useQuery({
    queryKey: adminKeys.list("universities", [search, status, page, size]),
    queryFn: () =>
      getUniversities({
        SearchTerm: search,
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
  const editableBody = () => ({
    name: draft.name.trim(),
    shortName: optional(draft.shortName),
    nameEn: optional(draft.nameEn),
    address: optional(draft.address),
    phone: optional(draft.phone),
    contactEmail: optional(draft.contactEmail),
    logoUrl: optional(draft.logoUrl),
  });
  const create = useAdminWrite({
    resource: "universities",
    action: "Create university",
    mutationFn: () =>
      createUniversity({
        ...editableBody(),
        code: draft.code.trim(),
        subdomain: optional(draft.subdomain),
        emailDomain: optional(draft.emailDomain),
      }),
    onSuccess: closeForm,
  });
  const update = useAdminWrite({
    resource: "universities",
    action: "Update university",
    mutationFn: () => updateUniversity(editing!.universityId, editableBody()),
    onSuccess: closeForm,
  });
  const toggle = useAdminWrite<{ id: string; next: boolean }>({
    resource: "universities",
    action: "University status change",
    mutationFn: ({ id, next }) => setUniversityActive(id, next),
    onSuccess: () => setToggling(null),
  });

  const submit = () => {
    const found: string[] = [];
    if (!creating && !editing) return;
    if (creating && !draft.code.trim()) found.push("University code is required.");
    if (!draft.name.trim()) found.push("University name is required.");
    if (draft.contactEmail.trim() && !emailPattern.test(draft.contactEmail.trim()))
      found.push("Contact email must be a valid address.");
    setErrors(found);
    if (found.length) return;
    if (creating) create.mutate();
    else update.mutate();
  };

  const reset = () => {
    setQuery("");
    setSearch("");
    setStatus("all");
    setPage(1);
  };
  const activeCount = rows.filter((row) => row.status === "Active").length;
  const fieldError = (prefix: string) =>
    errors.find((e) => e.startsWith(prefix));
  const set = (key: keyof Draft) => (value: string) =>
    setDraft((old) => ({ ...old, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeading
        title="Universities"
        description="Tenants that own departments, subjects, semesters and accounts."
      >
        <Button
          onClick={() => {
            setDraft(emptyDraft);
            setErrors([]);
            setCreating(true);
          }}
        >
          <Plus aria-hidden />
          New university
        </Button>
      </PageHeading>

      <section
        aria-label="University summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SummaryCard
          label="Total universities"
          value={list.data?.totalCount ?? "Not available"}
          detail="Matching your current query"
          icon={<UniversityIcon aria-hidden className="size-5" />}
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
          detail="Inactive tenants cannot sign in"
          icon={<PowerOff aria-hidden className="size-5" />}
        />
      </section>

      <FilterPanel
        searchLabel="Search universities"
        searchPlaceholder="Search by code or name"
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
          value={status}
          options={[
            { value: "all", label: "All statuses" },
            ...universityStatuses.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </FilterPanel>

      <TablePanel
        heading="All universities"
        shown={rows.length}
        total={list.data?.totalCount ?? 0}
        noun="universities"
        tableLabel="Universities table"
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
            <TableHead>University</TableHead>
            <TableHead>Subdomain / email domain</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const active = row.status === "Active";
            return (
              <TableRow key={row.universityId}>
                <TableCell className="font-bold">{row.code}</TableCell>
                <TableCell className="min-w-72 max-w-md whitespace-normal">
                  <p className="font-bold leading-relaxed">{row.name}</p>
                  {(row.nameEn || row.contactEmail) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[row.nameEn, row.contactEmail].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <p>{row.subdomain ?? "Not available"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.emailDomain ?? "No email domain"}
                  </p>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    value={row.status}
                    tone={active ? "success" : "neutral"}
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
                          code: row.code,
                          name: row.name,
                          shortName: row.shortName ?? "",
                          nameEn: row.nameEn ?? "",
                          address: row.address ?? "",
                          phone: row.phone ?? "",
                          contactEmail: row.contactEmail ?? "",
                          subdomain: row.subdomain ?? "",
                          emailDomain: row.emailDomain ?? "",
                          logoUrl: row.logoUrl ?? "",
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => setToggling(row)}>
                      {active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {!rows.length && (
            <EmptyRow
              columns={6}
              title="No universities match your filters."
              hint="Try another search, or create the first university."
            />
          )}
        </TableBody>
      </TablePanel>

      <FormDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={creating ? "New university" : "Edit university"}
        description={
          creating
            ? "Code, subdomain and email domain are permanent once the university exists."
            : `Update ${editing?.code ?? ""}. Code, subdomain and email domain cannot be changed.`
        }
        submitLabel={creating ? "Create university" : "Save changes"}
        pending={create.isPending || update.isPending}
        errors={errors}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="University code"
            value={draft.code}
            onChange={set("code")}
            disabled={!creating}
            error={creating ? fieldError("University code") : undefined}
          />
          <TextField
            label="Short name"
            value={draft.shortName}
            onChange={set("shortName")}
          />
        </div>
        <TextField
          label="University name"
          value={draft.name}
          onChange={set("name")}
          error={fieldError("University name")}
        />
        <TextField
          label="English name"
          value={draft.nameEn}
          onChange={set("nameEn")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Subdomain"
            value={draft.subdomain}
            onChange={set("subdomain")}
            disabled={!creating}
          />
          <TextField
            label="Email domain"
            value={draft.emailDomain}
            onChange={set("emailDomain")}
            disabled={!creating}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Contact email"
            type="email"
            value={draft.contactEmail}
            onChange={set("contactEmail")}
            error={fieldError("Contact email")}
          />
          <TextField label="Phone" value={draft.phone} onChange={set("phone")} />
        </div>
        <TextField label="Address" value={draft.address} onChange={set("address")} />
        <TextField label="Logo URL" value={draft.logoUrl} onChange={set("logoUrl")} />
      </FormDialog>

      <ConfirmAction
        open={toggling !== null}
        onOpenChange={(open) => {
          if (!open) setToggling(null);
        }}
        title={
          toggling?.status === "Active"
            ? "Deactivate university?"
            : "Activate university?"
        }
        description={
          toggling?.status === "Active"
            ? `${toggling?.name} and its accounts will stop being able to sign in. Its records stay readable.`
            : `${toggling?.name} and its accounts will be able to sign in again.`
        }
        confirmLabel={toggling?.status === "Active" ? "Deactivate" : "Activate"}
        onConfirm={() =>
          toggling &&
          toggle.mutate({
            id: toggling.universityId,
            next: toggling.status !== "Active",
          })
        }
      />
    </div>
  );
}
