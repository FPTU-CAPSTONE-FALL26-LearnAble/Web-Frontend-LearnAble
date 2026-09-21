import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/ui/cn";

const alertVariants = cva(
  "relative w-full rounded-[var(--radius)] border-2 p-4 text-left font-medium text-[length:var(--text-body)] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-5 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]",
        destructive:
          "border-[var(--color-error)] bg-[var(--color-danger-bg)] text-[var(--color-error)]",
        warning:
          "border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
        info:
          "border-[var(--color-secondary)] bg-[var(--color-info-bg)] text-[var(--color-text)]",
        success:
          "border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert"
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-title"
    className={cn("mb-1 font-bold leading-none tracking-tight text-[var(--color-text)]", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-description"
    className={cn("text-[length:var(--text-body)] [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

const AlertAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-action"
    className={cn("absolute top-3 right-3", className)}
    {...props}
  />
));
AlertAction.displayName = "AlertAction";

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants };
