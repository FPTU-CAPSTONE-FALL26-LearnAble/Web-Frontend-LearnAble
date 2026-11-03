export function splitLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2})?)?/.exec(value);
  if (!match) return { date: "", time: "" };
  return { date: `${match[3]}/${match[2]}/${match[1]}`, time: match[4] ?? "" };
}

export function formatDateEntry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatTimeEntry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function combineLocalDateTime(date: string, time: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  if (!match || !/^\d{2}:\d{2}$/.test(time)) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const [hour, minute] = time.split(":").map(Number);
  const candidate = new Date(year, month - 1, day, hour, minute);
  if (
    candidate.getFullYear() !== year
    || candidate.getMonth() !== month - 1
    || candidate.getDate() !== day
    || candidate.getHours() !== hour
    || candidate.getMinutes() !== minute
  ) return null;
  return `${match[3]}-${match[2]}-${match[1]}T${time}`;
}

export function localDatePrefix(date: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year
    || candidate.getMonth() !== month - 1
    || candidate.getDate() !== day
  ) return null;
  return `${match[3]}-${match[2]}-${match[1]}T`;
}

export function copyLocalDate(source: string, target: string) {
  const sourceMatch = /^(\d{4}-\d{2}-\d{2})T?(\d{2}:\d{2})?/.exec(source);
  if (!sourceMatch) return target;
  const targetTime = /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/.exec(target)?.[1];
  return `${sourceMatch[1]}T${targetTime ?? sourceMatch[2] ?? ""}`;
}
