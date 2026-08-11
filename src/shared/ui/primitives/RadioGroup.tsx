import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/shared/ui/cn";

/**
 * Radix RadioGroup: roving tabindex + mũi tên di chuyển có sẵn.
 * Item có đích chạm ≥ 44px; trạng thái chọn thể hiện bằng nền + icon, không chỉ màu.
 */
export const RadioGroup = forwardRef<
  ElementRef<typeof RadioGroupPrimitive.Root>,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-3", className)} {...props} />
));
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps
  extends ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label: string;
}

export const RadioGroupItem = forwardRef<
  ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, label, id, ...props }, ref) => (
  <label
    className={cn(
      "flex min-h-[var(--target-min)] cursor-pointer items-center gap-3 rounded-[var(--radius)] border-2 border-[var(--color-border)] px-4 py-2",
      "has-[[data-state=checked]]:border-[var(--color-selected-text)] has-[[data-state=checked]]:bg-[var(--color-selected-bg)] has-[[data-state=checked]]:text-[var(--color-selected-text)]",
      className,
    )}
  >
    <RadioGroupPrimitive.Item
      ref={ref}
      id={id}
      className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-current bg-[var(--color-bg)]"
      {...props}
    >
      <RadioGroupPrimitive.Indicator>
        <Circle aria-hidden className="size-3 fill-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
    <span>{label}</span>
  </label>
));
RadioGroupItem.displayName = "RadioGroupItem";
