import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";

function isoToDisplay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function displayToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const candidate = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (
    candidate.getUTCFullYear() !== Number(year)
    || candidate.getUTCMonth() + 1 !== Number(month)
    || candidate.getUTCDate() !== Number(day)
  ) return null;
  return `${year}-${month}-${day}`;
}

function formatDayMonthYear(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function RevealablePasswordField({
  value,
  onChange,
  error,
  label = "Initial password",
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = "initial-password";
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </Button>
      </div>
      {error ? <p id={`${id}-error`} className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function DayMonthYearField({
  value,
  onChange,
  onValidityChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onValidityChange: (error: string | null) => void;
}) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const id = "date-of-birth";

  useEffect(() => {
    setDisplay(isoToDisplay(value));
  }, [value]);

  const update = (next: string) => {
    const formatted = formatDayMonthYear(next);
    setDisplay(formatted);
    if (!formatted) {
      onChange("");
      onValidityChange(null);
      return;
    }
    const iso = displayToIso(formatted);
    if (iso) {
      onChange(iso);
      onValidityChange(null);
    } else {
      onValidityChange("Date of birth must use dd/mm/yyyy and be a valid date.");
    }
  };

  const error = display && !displayToIso(display)
    ? "Use dd/mm/yyyy, for example 15/07/2004."
    : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Date of birth</Label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={display}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => update(event.target.value)}
      />
      {error ? <p id={`${id}-error`} className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
