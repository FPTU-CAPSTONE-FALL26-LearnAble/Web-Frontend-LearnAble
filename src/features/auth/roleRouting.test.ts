import { describe, expect, it } from "vitest";
import {
  getRoleDestination,
  isPathAllowedForRole,
  normalizeSupportedRole,
} from "./roleRouting";

describe("staff role routing", () => {
  it("normalizes Staff and sends it to the staff workspace", () => {
    expect(normalizeSupportedRole(" Staff ")).toBe("staff");
    expect(getRoleDestination("Staff")).toBe("/staff/dashboard");
  });

  it("keeps staff inside staff routes", () => {
    expect(isPathAllowedForRole("staff", "/staff/exam-rooms")).toBe(true);
    expect(isPathAllowedForRole("staff", "/admin/users")).toBe(false);
    expect(getRoleDestination("Staff", "/staff/users")).toBe("/staff/users");
  });
});
