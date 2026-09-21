import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/ui/cn";

/**
 * Đích tương tác tối thiểu 44×44 CSS px (RULE-17) áp NGAY TRONG primitive —
 * không screen nào phải tự nhớ.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-colors select-none outline-none focus-visible:outline-[var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)] focus-visible:outline-offset-[var(--focus-ring-offset)] disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:bg-[var(--color-primary-hover)]",
        secondary:
          "border-2 border-[var(--color-action)] bg-white text-[var(--color-text)] shadow-[var(--shadow-control)] hover:bg-[var(--color-selected-bg)]",
        outline:
          "border-2 border-[var(--color-action)] bg-white text-[var(--color-text)] shadow-[var(--shadow-control)] hover:bg-[var(--color-selected-bg)]",
        ghost:
          "text-[var(--color-primary)] hover:bg-[var(--color-surface)]",
        danger:
          "bg-[var(--color-error)] text-[var(--color-error-text)] hover:opacity-90",
        link:
          "text-[var(--color-primary)] underline-offset-4 hover:underline min-h-0 min-w-0 p-0",
      },
      size: {
        default:
          "min-h-[var(--target-min)] min-w-[var(--target-min)] px-4 py-2 text-[length:var(--text-body)]",
        exam:
          "min-h-[3.25rem] min-w-[3.25rem] px-6 py-3 text-[length:var(--text-lg)] font-bold",
        icon:
          "size-11 min-h-[var(--target-min)] min-w-[var(--target-min)] p-0",
        "icon-exam":
          "size-13 min-h-[3.25rem] min-w-[3.25rem] p-0 text-[length:var(--text-lg)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        // Mặc định type="button" — nút trong form không tự submit ngoài ý muốn.
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
