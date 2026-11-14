import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { describeError } from "@/app/providers";
import {
  getAdminSubjects,
  getCurriculumSubjects,
  setCurriculumSubjects,
  type AdminSubject,
  type Curriculum,
} from "@/api/admin";
import { fetchAllPages } from "@/api/pagination";
import { TextField } from "@/components/workbench/Fields";
import { ReadState } from "@/components/workbench/Workbench";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Label } from "@/shared/ui/primitives/label";
import { adminKeys, useAdminWrite, useExpiredAdminSession } from "../api/useAdminData";
import { FormDialog } from "./AdminSurfaces";

/** The Backend accepts at most this many subjects for one curriculum. */
export const MAX_CURRICULUM_SUBJECTS = 1000;

type SubjectRow = { subjectId: string; label: string; active: boolean; known: boolean };

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((id) => b.has(id));

function describeSubject(subject: AdminSubject): SubjectRow {
  return {
    subjectId: subject.subjectId,
    label: `${subject.subjectCode} · ${subject.subjectNameEn}`,
    active: subject.isActive,
    known: true,
  };
}

/**
 * Assigns subjects to a curriculum. Saving replaces the whole list, so the form
 * refuses to save until the current assignment has loaded successfully.
 */
export function CurriculumSubjectsDialog({
  curriculum,
  onClose,
}: {
  curriculum: Curriculum;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const assigned = useQuery({
    queryKey: adminKeys.list("curriculums", ["subjects", curriculum.curriculumId]),
    queryFn: () => getCurriculumSubjects(curriculum.curriculumId),
  });
  const catalog = useQuery({
    queryKey: adminKeys.list("subjects", ["all-for-curriculum"]),
    queryFn: () =>
      fetchAllPages((PageNumber, PageSize) =>
        getAdminSubjects({ PageNumber, PageSize, SortBy: "subjectCode" }),
      ),
  });
  useExpiredAdminSession(assigned.error);
  useExpiredAdminSession(catalog.error);

  const savedIds = useMemo(() => new Set(assigned.data?.subjectIds ?? []), [assigned.data]);
  const selection = picked ?? savedIds;
  const dirty = !sameSet(selection, savedIds);
  const ready = assigned.isSuccess && catalog.isSuccess;

  const rows = useMemo(() => {
    const known = new Map((catalog.data?.items ?? []).map((subject) => [subject.subjectId, describeSubject(subject)]));
    // Subjects that are assigned but missing from the catalog stay visible so they can be removed.
    for (const id of savedIds)
      if (!known.has(id)) known.set(id, { subjectId: id, label: `Unknown subject (${id.slice(0, 8)})`, active: false, known: false });
    const query = search.trim().toLowerCase();
    return [...known.values()].filter((row) => !query || row.label.toLowerCase().includes(query));
  }, [catalog.data, savedIds, search]);

  const write = useAdminWrite({
    resource: "curriculums",
    action: "Curriculum subjects",
    mutationFn: () =>
      setCurriculumSubjects(curriculum.curriculumId, [...selection], assigned.data?.revision),
    onSuccess: onClose,
    onError: (error) => setErrors([describeError(error)]),
  });

  const toggle = (subjectId: string) => {
    const next = new Set(selection);
    if (next.has(subjectId)) next.delete(subjectId);
    else next.add(subjectId);
    setPicked(next);
  };

  const submit = () => {
    const found: string[] = [];
    if (!ready) found.push("The current subjects could not be loaded, so nothing can be saved yet.");
    else if (!dirty) found.push("Select or clear at least one subject before saving.");
    else if (selection.size > MAX_CURRICULUM_SUBJECTS)
      found.push(`A curriculum can have at most ${MAX_CURRICULUM_SUBJECTS} subjects.`);
    setErrors(found);
    if (!found.length) write.mutate();
  };

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open && !write.isPending) onClose();
      }}
      title="Manage subjects"
      description={`Choose the subjects taught in ${curriculum.curriculumCode}. Saving replaces the curriculum's whole subject list.`}
      submitLabel="Save subjects"
      pending={write.isPending}
      errors={errors}
      onSubmit={submit}
    >
      <ReadState
        pending={assigned.isPending || catalog.isPending}
        error={assigned.error ?? catalog.error}
        retry={() => {
          void assigned.refetch();
          void catalog.refetch();
        }}
      />
      {ready ? (
        <div className="space-y-3">
          <TextField label="Search subjects" value={search} placeholder="Code or name" onChange={setSearch} />
          <p role="status" className="text-sm tabular-nums text-muted-foreground">
            {selection.size} selected{dirty ? " · not saved" : ""} · {rows.length} shown
          </p>
          {rows.length ? (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {rows.map((row) => {
                const checked = selection.has(row.subjectId);
                const id = `curriculum-subject-${row.subjectId}`;
                return (
                  <li key={row.subjectId} className="flex min-h-11 items-center gap-3 px-3">
                    <Checkbox
                      id={id}
                      checked={checked}
                      disabled={!row.active && !checked}
                      onCheckedChange={() => toggle(row.subjectId)}
                    />
                    <Label htmlFor={id} className="min-w-0 flex-1">
                      {row.label}
                      {!row.active ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {row.known ? "Inactive" : "Not in the subject list"}
                        </span>
                      ) : null}
                    </Label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              {search.trim() ? "No subject matches your search." : "There are no subjects yet. Create subjects first, then assign them here."}
            </p>
          )}
        </div>
      ) : null}
    </FormDialog>
  );
}
