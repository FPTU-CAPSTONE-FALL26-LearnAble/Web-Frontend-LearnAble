import { ChoiceField } from "@/components/workbench/Fields";
import {
  universityLabel,
  useUniversityOptions,
  useUniversityScope,
} from "../api/useAdminData";

/**
 * University of a tenant-owned record. A super admin chooses it; a regular
 * admin always writes into their own university, so the field is shown read-only
 * to make the scope visible without offering a choice the API would reject.
 */
export function UniversityField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { universityId, isSuperAdmin } = useUniversityScope();
  const universities = useUniversityOptions();
  const rows = universities.data?.items ?? [];
  const locked = disabled || !isSuperAdmin;
  const shown = locked ? value || universityId : value;
  return (
    <ChoiceField
      label="University"
      value={shown}
      placeholder={
        universities.isPending ? "Loading universities" : "Select a university"
      }
      disabled={locked}
      options={
        rows.length
          ? rows.map((row) => ({
              value: row.universityId,
              label: `${row.code} · ${row.name}`,
            }))
          : shown
            ? [{ value: shown, label: universityLabel(rows, shown) ?? shown }]
            : []
      }
      onChange={onChange}
    />
  );
}
