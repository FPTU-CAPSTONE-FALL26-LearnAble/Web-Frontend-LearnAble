export type SupportedRole = "student" | "lecturer" | "examiner";

const defaultDestination: Record<SupportedRole, string> = {
  student: "/practice",
  lecturer: "/lecturer/dashboard",
  examiner: "/examiner/dashboard",
};

const studentRoutes = [
  "/practice",
  "/assistant",
  "/progress",
  "/results",
  "/settings/accessibility",
];

export function normalizeSupportedRole(
  role?: string | null,
): SupportedRole | null {
  const normalized = role?.trim().toLowerCase();
  return normalized === "student" ||
    normalized === "lecturer" ||
    normalized === "examiner"
    ? normalized
    : null;
}

export function isPathAllowedForRole(role: SupportedRole, path: string) {
  if (role === "lecturer") return path.startsWith("/lecturer/");
  if (role === "examiner") return path.startsWith("/examiner/");
  return studentRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}

export function getRoleDestination(
  role?: string | null,
  requestedPath?: string,
): string | null {
  const normalizedRole = normalizeSupportedRole(role);
  if (!normalizedRole) return null;
  if (requestedPath && isPathAllowedForRole(normalizedRole, requestedPath)) {
    return requestedPath;
  }
  return defaultDestination[normalizedRole];
}
