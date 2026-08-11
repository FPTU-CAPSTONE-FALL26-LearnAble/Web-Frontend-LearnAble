import { useSyncExternalStore } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

/**
 * Radix Toast tự có aria-live (role="status") — KHÔNG gọi announce() thêm,
 * nếu không NVDA đọc hai lần. Dùng toast() cho thông điệp có UI;
 * dùng announce() cho xác nhận thuần âm thanh không cần UI.
 */

export interface ToastData {
  id: number;
  title: string;
  description?: string;
  variant?: "default" | "error";
}

type Listener = () => void;

let toasts: ToastData[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function toast(input: Omit<ToastData, "id">): void {
  toasts = [...toasts, { ...input, id: nextId++ }];
  emit();
}

function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function Toaster() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  );

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={6000}>
      {items.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
          className={cn(
            "flex items-start gap-3 rounded-[var(--radius)] border-2 bg-[var(--color-bg)] p-4",
            t.variant === "error"
              ? "border-[var(--color-error)]"
              : "border-[var(--color-border)]",
          )}
        >
          <div className="flex-1">
            <ToastPrimitive.Title
              className={cn("font-bold", t.variant === "error" && "text-[var(--color-error)]")}
            >
              {t.title}
            </ToastPrimitive.Title>
            {t.description ? (
              <ToastPrimitive.Description className="mt-1">
                {t.description}
              </ToastPrimitive.Description>
            ) : null}
          </div>
          <ToastPrimitive.Close
            aria-label={vi.common.close}
            className="flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center justify-center rounded-[var(--radius)] hover:bg-[var(--color-surface)]"
          >
            <X aria-hidden className="size-5" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,420px)] flex-col gap-3" />
    </ToastPrimitive.Provider>
  );
}
