import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { combineLocalDateTime, formatDateEntry, formatTimeEntry, localDatePrefix, splitLocalDateTime } from "@/features/examiner/workflow/dateTime";
import { Field } from "@/features/examiner/workflow/PreparationShell";
import { Input } from "@/shared/ui/primitives/input";

const DEFAULT_TIME = "00:00";

type DateEntryProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

/** Opens the browser's calendar; the picked day is reported as DD/MM/YYYY, or "" when cleared. */
function CalendarButton({ label, date, min, max, onPick }: { label: string; date: string; min?: string; max?: string; onPick: (date: string) => void }) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const openCalendar = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
      picker.click();
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`Choose ${label} from calendar`}
        onClick={openCalendar}
        className="grid size-9 place-items-center rounded-md border border-input bg-background text-foreground shadow-xs outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CalendarDays className="size-4" aria-hidden />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        min={min}
        max={max}
        value={localDatePrefix(date)?.slice(0, 10) ?? ""}
        onChange={(event) => onPick(splitLocalDateTime(event.target.value).date)}
      />
    </div>
  );
}

/** Typed or calendar entry shown as DD/MM/YYYY; `value` stays yyyy-MM-dd, or "" until the date is complete and valid. */
export function DateField({ label, value, min, max, onChange }: DateEntryProps & { min?: string; max?: string }) {
  const [date, setDate] = useState(() => splitLocalDateTime(value).date);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setDate(splitLocalDateTime(value).date);
  }, [value]);

  const commit = (nextDate: string) => {
    const nextValue = localDatePrefix(nextDate)?.slice(0, 10) ?? "";
    setDate(nextDate);
    lastEmitted.current = nextValue;
    onChange(nextValue);
  };

  return (
    <Field label={label} hint="DD/MM/YYYY">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={label}
            placeholder="dd/mm/yyyy"
            value={date}
            onChange={(event) => commit(formatDateEntry(event.target.value))}
          />
        </div>
        <CalendarButton label={label} date={date} min={min} max={max} onPick={commit} />
      </div>
    </Field>
  );
}

/**
 * Typed or calendar date shown as DD/MM/YYYY, with a typed 24-hour HH:mm. `value` is
 * yyyy-MM-ddTHH:mm when complete, yyyy-MM-ddT while only the date is complete, and "" otherwise.
 */
export function DateTimeField({ label, value, onChange }: DateEntryProps) {
  const initial = splitLocalDateTime(value);
  const [date, setDate] = useState(initial.date);
  // Start of the day unless a time was given, so picking a day is enough to have a complete value.
  const [time, setTime] = useState(initial.time || DEFAULT_TIME);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    const next = splitLocalDateTime(value);
    setDate(next.date);
    setTime(next.time || DEFAULT_TIME);
  }, [value]);

  const commit = (nextDate: string, nextTime: string) => {
    const nextValue = combineLocalDateTime(nextDate, nextTime) ?? localDatePrefix(nextDate) ?? "";
    lastEmitted.current = nextValue;
    onChange(nextValue);
  };
  const updateDate = (nextDate: string) => {
    setDate(nextDate);
    commit(nextDate, time);
  };

  return (
    <Field label={label} hint="DD/MM/YYYY · 24-hour time">
      <div className="flex flex-wrap gap-2">
        <div className="flex min-w-0 flex-[2_1_11rem] gap-2">
          <div className="min-w-0 flex-1">
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label={`${label} date`}
              placeholder="dd/mm/yyyy"
              value={date}
              onChange={(event) => updateDate(formatDateEntry(event.target.value))}
            />
          </div>
          <CalendarButton label={label} date={date} onPick={updateDate} />
        </div>
        <div className="min-w-0 flex-[1_1_6rem]">
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            aria-label={`${label} time`}
            placeholder="HH:mm"
            value={time}
            onChange={(event) => {
              const nextTime = formatTimeEntry(event.target.value);
              setTime(nextTime);
              commit(date, nextTime);
            }}
          />
        </div>
      </div>
    </Field>
  );
}
