import { type ReactNode } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LiveRegion } from "@/shared/a11y/LiveRegion";
import { Toaster, toast } from "@/shared/ui/primitives/Toast";
import { announce } from "@/shared/a11y/announcer";
import { vi } from "@/shared/strings/vi";
import { ApiFailure } from "@/api/client";

/** Mọi lỗi query đều announce — lỗi im lặng là vô hình với sinh viên khiếm thị (§10). */
export function describeError(error: unknown): string {
  if (error instanceof ApiFailure) {
    switch (error.detail.kind) {
      case "network":
        return vi.errors.network;
      case "unauthorized":
        return vi.errors.unauthorized;
      case "not_found":
        return vi.errors.notFound;
      case "server":
        return vi.errors.server;
      case "parse":
        return vi.errors.unknown;
    }
  }
  return vi.errors.unknown;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const message = describeError(error);
      // Toast tự có aria-live — không gọi announce() song song để NVDA khỏi đọc hai lần.
      toast({ title: vi.common.error, description: message, variant: "error" });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export { announce };

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LiveRegion />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
