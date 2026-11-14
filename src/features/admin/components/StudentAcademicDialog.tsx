import { useState } from "react";
import { describeError } from "@/app/providers";
import { updateStudentAcademic, type Major, type StudentProfile } from "@/api/admin";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import { useAdminWrite, useCurriculumOptions } from "../api/useAdminData";
import { FormDialog } from "./AdminSurfaces";

export const INTAKE_YEAR_MIN = 1900;
export const INTAKE_YEAR_MAX = 2100;

/**
 * Corrects a student's major, curriculum or intake year after the profile exists.
 * Enrollment status keeps its own control because it has its own endpoint.
 */
export function StudentAcademicDialog({
  profile,
  studentLabel,
  currentCurriculumLabel,
  majors,
  onClose,
}: {
  profile: StudentProfile;
  studentLabel: string;
  currentCurriculumLabel: string | null;
  majors: Major[];
  onClose: () => void;
}) {
  const [majorId, setMajorId] = useState(profile.majorId);
  const [curriculumId, setCurriculumId] = useState(profile.curriculumId);
  const [intakeYear, setIntakeYear] = useState(String(profile.intakeYear));
  const [errors, setErrors] = useState<string[]>([]);
  const curriculums = useCurriculumOptions(majorId);

  const write = useAdminWrite({
    resource: "studentProfiles",
    action: "Student academic record update",
    mutationFn: () =>
      updateStudentAcademic(
        profile.userId,
        { majorId, curriculumId, intakeYear: Number(intakeYear) },
        profile.academicRevision,
      ),
    onSuccess: onClose,
    onError: (error) => setErrors([describeError(error)]),
  });

  const curriculumOptions = (curriculums.data?.items ?? []).map((row) => ({
    value: row.curriculumId,
    label: `${row.curriculumCode} · ${row.version} · ${row.intakeYear}`,
  }));
  // Keep the current curriculum selectable even when the list for the major has not loaded it.
  if (
    curriculumId &&
    curriculumId === profile.curriculumId &&
    !curriculumOptions.some((option) => option.value === curriculumId)
  )
    curriculumOptions.unshift({ value: curriculumId, label: currentCurriculumLabel ?? "Current curriculum" });

  const submit = () => {
    const found: string[] = [];
    const year = Number(intakeYear);
    if (!majorId) found.push("Major is required.");
    if (!curriculumId) found.push("Curriculum is required.");
    if (!intakeYear.trim() || !Number.isInteger(year) || year < INTAKE_YEAR_MIN || year > INTAKE_YEAR_MAX)
      found.push(`Intake year must be a year from ${INTAKE_YEAR_MIN} to ${INTAKE_YEAR_MAX}.`);
    if (
      !found.length &&
      majorId === profile.majorId &&
      curriculumId === profile.curriculumId &&
      year === profile.intakeYear
    )
      found.push("Change the major, curriculum or intake year before saving.");
    setErrors(found);
    if (!found.length) write.mutate();
  };

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open && !write.isPending) onClose();
      }}
      title="Edit academic record"
      description={`Update the major, curriculum and intake year of ${studentLabel}. Use the enrollment status control in the table for status changes.`}
      submitLabel="Save changes"
      pending={write.isPending}
      errors={errors}
      onSubmit={submit}
    >
      <ChoiceField
        label="Major of student"
        value={majorId}
        placeholder="Select a major"
        options={majors.map((row) => ({
          value: row.majorId,
          label: `${row.majorCode} · ${row.majorName}`,
        }))}
        onChange={(value) => {
          setMajorId(value);
          // A curriculum belongs to one major, so the old choice no longer applies.
          if (value !== majorId) setCurriculumId("");
        }}
      />
      <ChoiceField
        label="Curriculum of student"
        value={curriculumId}
        placeholder={curriculums.isPending ? "Loading curriculums…" : "Select a curriculum"}
        disabled={curriculums.isPending}
        options={curriculumOptions}
        onChange={setCurriculumId}
      />
      {curriculums.error ? (
        <p role="alert" className="text-sm text-destructive">
          {describeError(curriculums.error)}
        </p>
      ) : null}
      <TextField
        label="Intake year of student"
        type="number"
        min={String(INTAKE_YEAR_MIN)}
        max={String(INTAKE_YEAR_MAX)}
        value={intakeYear}
        onChange={setIntakeYear}
        error={
          errors.some((e) => e.startsWith("Intake year"))
            ? `Intake year must be a year from ${INTAKE_YEAR_MIN} to ${INTAKE_YEAR_MAX}.`
            : undefined
        }
      />
    </FormDialog>
  );
}
