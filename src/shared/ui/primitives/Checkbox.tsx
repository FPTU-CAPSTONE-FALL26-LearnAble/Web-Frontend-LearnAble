import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/shared/ui/cn";

export interface CheckboxProps
  extends ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label: string;
}

export const Checkbox = forwardRef<ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, label, ...props }, ref) => (
    <label
      className={cn(
        "flex min-h-[var(--target-min)] cursor-pointer items-center gap-3 rounded-[var(--radius)] px-1",
        className,
      )}
    >
      <CheckboxPrimitive.Root
        ref={ref}
        className="flex size-6 shrink-0 items-center justify-center rounded border-2 border-[var(--color-border)] bg-[var(--color-bg)] data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:bg-[var(--color-primary)] data-[state=checked]:text-[var(--color-primary-text)]"
        {...props}
      >
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden className="size-4" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span>{label}</span>
    </label>
  ),
);
Checkbox.displayName = "Checkbox";
