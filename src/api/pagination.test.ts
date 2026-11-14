import { describe, expect, it, vi } from "vitest";
import { fetchAllPages, MAX_PAGE_SIZE } from "./pagination";

const page = (items: string[], pageNumber: number, totalPages: number, totalCount = 3) => ({
  items,
  pageNumber,
  pageSize: MAX_PAGE_SIZE,
  totalCount,
  totalPages,
  hasPreviousPage: pageNumber > 1,
  hasNextPage: pageNumber < totalPages,
});

describe("fetchAllPages", () => {
  it("makes one request when everything fits on the first page", async () => {
    const fetchPage = vi.fn().mockResolvedValue(page(["a"], 1, 1, 1));
    await expect(fetchAllPages(fetchPage)).resolves.toMatchObject({ items: ["a"], totalCount: 1 });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(1, MAX_PAGE_SIZE);
  });

  it("handles an empty result", async () => {
    const fetchPage = vi.fn().mockResolvedValue(page([], 1, 0, 0));
    await expect(fetchAllPages(fetchPage)).resolves.toMatchObject({ items: [] });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("joins every page in order, even if later pages answer first", async () => {
    const fetchPage = vi.fn(async (pageNumber: number) => {
      if (pageNumber === 2) await new Promise((resolve) => setTimeout(resolve, 5));
      return page([`item-${pageNumber}`], pageNumber, 3);
    });
    const result = await fetchAllPages(fetchPage);
    expect(result.items).toEqual(["item-1", "item-2", "item-3"]);
    expect(result.hasNextPage).toBe(false);
    expect(result.totalPages).toBe(1);
  });

  it("fails rather than returning a partial list", async () => {
    const fetchPage = vi.fn(async (pageNumber: number) => {
      if (pageNumber === 2) throw new Error("page 2 failed");
      return page(["a"], pageNumber, 2);
    });
    await expect(fetchAllPages(fetchPage)).rejects.toThrow("page 2 failed");
  });
});
