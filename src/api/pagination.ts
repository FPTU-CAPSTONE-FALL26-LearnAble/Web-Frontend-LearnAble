/** The Backend rejects a PageSize above this value. */
export const MAX_PAGE_SIZE = 100;

type PagedResult = {
  items: unknown[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

/**
 * Reads every page and returns them as one page, in server order.
 * If any page fails the whole read fails, so a list is never silently incomplete.
 */
export async function fetchAllPages<P extends PagedResult>(fetchPage: (page: number, pageSize: number) => Promise<P>): Promise<P> {
  const first = await fetchPage(1, MAX_PAGE_SIZE);
  const remaining = Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) => index + 2);
  const rest = await Promise.all(remaining.map((page) => fetchPage(page, MAX_PAGE_SIZE)));
  const items = [first, ...rest].flatMap((page) => page.items);
  return { ...first, items, pageNumber: 1, pageSize: items.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false } as P;
}
