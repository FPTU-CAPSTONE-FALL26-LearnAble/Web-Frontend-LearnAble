import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/shared/ui/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius)] border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-6",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // eslint-disable-next-line jsx-a11y/heading-has-content -- nội dung do caller truyền
    <h2
      ref={ref}
      className={cn("text-[length:var(--text-lg)] font-bold", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";
