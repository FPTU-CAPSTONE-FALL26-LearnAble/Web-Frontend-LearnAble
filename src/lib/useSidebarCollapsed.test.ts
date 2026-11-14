import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSidebarCollapsed } from "./useSidebarCollapsed";

const key = "test.sidebar-collapsed";

describe("useSidebarCollapsed", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("starts open", () => {
    const { result } = renderHook(() => useSidebarCollapsed(key));
    expect(result.current[0]).toBe(false);
  });

  it("toggles and remembers the choice for the next visit", () => {
    const first = renderHook(() => useSidebarCollapsed(key));
    act(() => first.result.current[1]());
    expect(first.result.current[0]).toBe(true);
    expect(localStorage.getItem(key)).toBe("1");
    first.unmount();
    const second = renderHook(() => useSidebarCollapsed(key));
    expect(second.result.current[0]).toBe(true);
    act(() => second.result.current[1]());
    expect(localStorage.getItem(key)).toBe("0");
  });

  it("keeps separate choices for separate sidebars", () => {
    const examiner = renderHook(() => useSidebarCollapsed("a"));
    act(() => examiner.result.current[1]());
    const lecturer = renderHook(() => useSidebarCollapsed("b"));
    expect(lecturer.result.current[0]).toBe(false);
  });

  it("still works when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useSidebarCollapsed(key));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });
});
