import { toast as sonnerToast, Toaster } from "./sonner";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "success" | "error" | "info" | "warning" | "loading";
}

function inferredVariant(title: string): NonNullable<ToastOptions["variant"]> {
  return /failed|could not|unable|unsuccessful|wasn't|error/i.test(title)
    ? "error"
    : "success";
}

export function toast(
  message: string | ToastOptions,
  data?: { description?: string; [key: string]: unknown },
) {
  if (typeof message === "object" && message !== null && "title" in message) {
    const title = message.title ?? "";
    const options = {
      description: message.description,
    };
    switch (message.variant ?? inferredVariant(title)) {
      case "error":
        return sonnerToast.error(title, options);
      case "info":
        return sonnerToast.info(title, options);
      case "warning":
        return sonnerToast.warning(title, options);
      case "loading":
        return sonnerToast.loading(title, options);
      default:
        return sonnerToast.success(title, options);
    }
  }
  return sonnerToast(
    message as string,
    data as Parameters<typeof sonnerToast>[1],
  );
}

export { Toaster };
