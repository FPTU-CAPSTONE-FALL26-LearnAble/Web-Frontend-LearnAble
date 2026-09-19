import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/ui/cn";

/**
 * Đích tương tác tối thiểu 44×44 CSS px (RULE-17) áp NGAY TRONG primitive —
 * không screen nào phải tự nhớ.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium min-h-[var(--target-min)] min-w-[var(--target-min)] px-4 py-2 text-[length:var(--text-body)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:bg-[var(--color-primary-hover)]",
        secondary:
          "border-2 border-[var(--color-action)] bg-white text-[var(--color-text)] shadow-[var(--shadow-control)] hover:bg-[var(--color-selected-bg)]",
        danger:
          "bg-[var(--color-error)] text-[var(--color-error-text)] hover:opacity-90",
        ghost: "text-[var(--color-primary)] hover:bg-[var(--color-surface)]",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        // Mặc định type="button" — nút trong form không tự submit ngoài ý muốn.
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
