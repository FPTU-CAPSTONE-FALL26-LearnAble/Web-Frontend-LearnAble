type ExamTypeLike = { examTypeId: string; code?: string | null; name?: string | null };

/** Environment markers the Backend appends to names on non-production data, such as "Final (development)". */
const ENVIRONMENT_SUFFIX = /\s*\((?:development|dev|test|testing|staging)\)\s*$/i;
const ENVIRONMENT_PREFIX = /^(?:dev|test|staging)[_\s-]+/i;

const titleCase = (value: string) => value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

/** The name a person would say: no code, and no development or test marker. */
export function formatExamTypeName(type: Pick<ExamTypeLike, "code" | "name">): string {
  const name = type.name?.trim();
  if (name) return name.replace(ENVIRONMENT_SUFFIX, "").trim() || name;
  const code = type.code?.trim();
  if (!code) return "Unnamed exam type";
  return titleCase(code.replace(ENVIRONMENT_PREFIX, "").replace(/[_-]+/g, " ")) || code;
}

/** The short code a person would write, such as FINAL for DEV_FINAL, with no test marker. */
export function formatExamTypeCode(type: Pick<ExamTypeLike, "code" | "name">): string {
  const code = type.code?.trim().replace(ENVIRONMENT_PREFIX, "").replace(/[\s_]+/g, "-").toUpperCase();
  return code || formatExamTypeName(type).replace(/\s+/g, "-").toUpperCase();
}

/**
 * Select options for exam types. If two types would read the same once cleaned up,
 * those fall back to their full names so the choices stay distinguishable.
 */
export function buildExamTypeOptions<T extends ExamTypeLike>(types: T[]): Array<{ value: string; label: string }> {
  const cleaned = types.map((type) => formatExamTypeName(type));
  return types.map((type, index) => {
    const clash = cleaned.filter((label) => label === cleaned[index]).length > 1;
    const full = type.name?.trim() || type.code?.trim() || cleaned[index];
    return { value: type.examTypeId, label: clash ? full : cleaned[index] };
  });
}
