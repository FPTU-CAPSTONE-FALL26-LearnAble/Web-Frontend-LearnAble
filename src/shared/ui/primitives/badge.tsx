import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/ui/cn";
import { Slot } from "@radix-ui/react-slot";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full border-2 px-3 py-1 text-[length:var(--text-body)] font-semibold whitespace-nowrap transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-text)]",
        secondary:
          "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
        destructive:
          "border-[var(--color-error)] bg-[var(--color-danger-bg)] text-[var(--color-error)]",
        outline:
          "border-[var(--color-border)] bg-transparent text-[var(--color-text)]",
        success:
          "border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-text)]",
        warning:
          "border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
        info:
          "border-[var(--color-secondary)] bg-[var(--color-info-bg)] text-[var(--color-text)]",
        ghost:
          "border-transparent bg-[var(--color-selected-bg)] text-[var(--color-selected-text)]",
        link: "border-transparent text-[var(--color-secondary)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
