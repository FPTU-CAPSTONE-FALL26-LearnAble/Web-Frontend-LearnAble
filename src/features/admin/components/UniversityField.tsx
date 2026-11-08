import { ChoiceField } from "@/components/workbench/Fields";
import {
  universityLabel,
  useUniversityOptions,
  useUniversityScope,
} from "../api/useAdminData";

/**
 * University of a tenant-owned record. It is read-only by default, which shows
 * the scope without offering a choice. `selectable` is for accounts, because an
 * admin creates accounts for any university.
 */
export function UniversityField({
  value,
  onChange,
  selectable = false,
}: {
  value: string;
  onChange: (value: string) => void;
  selectable?: boolean;
}) {
  const { universityId } = useUniversityScope();
  const universities = useUniversityOptions();
  const rows = universities.data?.items ?? [];
  const shown = selectable ? value : value || universityId;
  return (
    <ChoiceField
      label="University"
      value={shown}
      placeholder={
        universities.isPending ? "Loading universities" : "Select a university"
      }
      disabled={!selectable}
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
