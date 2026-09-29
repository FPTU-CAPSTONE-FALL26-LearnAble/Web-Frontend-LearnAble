import { toast as sonnerToast, Toaster } from "./sonner";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: string;
}

export function toast(
  message: string | ToastOptions,
  data?: { description?: string; [key: string]: unknown },
) {
  if (typeof message === "object" && message !== null && "title" in message) {
    return sonnerToast(message.title ?? "", {
      description: message.description,
    });
  }
  return sonnerToast(message as string, data as Parameters<typeof sonnerToast>[1]);
}

export { Toaster };
