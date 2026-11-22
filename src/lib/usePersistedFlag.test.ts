import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePersistedFlag } from "./usePersistedFlag";

const key = "test.persisted-flag";

describe("usePersistedFlag", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("starts from the given default", () => {
    expect(renderHook(() => usePersistedFlag(key)).result.current[0]).toBe(false);
    expect(renderHook(() => usePersistedFlag("other", true)).result.current[0]).toBe(true);
  });

  it("remembers a choice, including turning a default-on flag off", () => {
    const first = renderHook(() => usePersistedFlag(key, true));
    act(() => first.result.current[1]());
    expect(first.result.current[0]).toBe(false);
    first.unmount();
    expect(renderHook(() => usePersistedFlag(key, true)).result.current[0]).toBe(false);
  });

  it("still works when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => usePersistedFlag(key));
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });
});
