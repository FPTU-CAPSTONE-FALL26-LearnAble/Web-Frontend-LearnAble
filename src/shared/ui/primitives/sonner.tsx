"use client";

import { useTheme } from "next-themes";
import {
  Toaster as Sonner,
  toast as sonnerToast,
  type ExternalToast,
  type ToasterProps,
} from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

type ToastVariant = "success" | "info" | "warning" | "error";

type CustomToastOptions = Omit<ExternalToast, "id">;

type CustomToastProps = {
  id: string | number;
  variant: ToastVariant;
  title: ReactNode;
  description?: ReactNode;
  action?: ExternalToast["action"];
};

function resolveNode(
  value: ReactNode | (() => ReactNode) | undefined,
): ReactNode {
  return typeof value === "function" ? value() : value;
}

const variantStyles: Record<
  ToastVariant,
  { icon: ReactNode; border: string; iconColor: string }
> = {
  success: {
    icon: <CircleCheckIcon aria-hidden className="size-5" />,
    border: "border",
    iconColor: "text-success-foreground",
  },
  info: {
    icon: <InfoIcon aria-hidden className="size-5" />,
    border: "border",
    iconColor: "text-secondary-foreground",
  },
  warning: {
    icon: <TriangleAlertIcon aria-hidden className="size-5" />,
    border: "border",
    iconColor: "text-warning-foreground",
  },
  error: {
    icon: <OctagonXIcon aria-hidden className="size-5" />,
    border: "border",
    iconColor: "text-destructive",
  },
};

function CustomToast({
  id,
  variant,
  title,
  description,
  action,
}: CustomToastProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`flex shrink-0 items-center rounded-xl border bg-card p-4 font-sans text-card-foreground shadow-lg ${styles.border}`}
    >
      <span className={`mt-0.5 shrink-0 ${styles.iconColor}`}>
        {styles.icon}
      </span>
      <div className="min-w-0 flex-1 flex items-center">
        <div className="px-4">
          <p className="font-medium">{title}</p>
          {description ? (
            <p className="text-muted-foreground">{resolveNode(description)}</p>
          ) : null}
        </div>

        {action && typeof action === "object" && "label" in action ? (
          <Button
            type="button"
            variant="default"
            onClick={(event) => {
              action.onClick(event);
              sonnerToast.dismiss(id);
            }}
          >
            {action.label}
          </Button>
        ) : action ? (
          <div className="mt-3">{action}</div>
        ) : null}
      </div>
      {/* <button
        type="button"
        aria-label="Dismiss notification"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => sonnerToast.dismiss(id)}
      >
        <XIcon aria-hidden className="size-4" />
      </button> */}
    </div>
  );
}

function showToast(
  variant: ToastVariant,
  title: ReactNode,
  options: CustomToastOptions = {},
) {
  const { description, action, ...sonnerOptions } = options;

  return sonnerToast.custom(
    (id) => (
      <CustomToast
        id={id}
        variant={variant}
        title={title}
        description={resolveNode(description)}
        action={action}
      />
    ),
    sonnerOptions,
  );
}

const toast = Object.assign(
  (title: ReactNode, options?: CustomToastOptions) =>
    showToast("info", title, options),
  {
    success: (title: ReactNode, options?: CustomToastOptions) =>
      showToast("success", title, options),
    info: (title: ReactNode, options?: CustomToastOptions) =>
      showToast("info", title, options),
    warning: (title: ReactNode, options?: CustomToastOptions) =>
      showToast("warning", title, options),
    error: (title: ReactNode, options?: CustomToastOptions) =>
      showToast("error", title, options),
  },
);

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      className="toaster group"
      icons={{
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "w-[30rem] max-w-[calc(100vw-2rem)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
