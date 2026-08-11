import { forwardRef, useId, type ComponentPropsWithoutRef, type ElementRef } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/shared/ui/cn";

/** Radix Select: typeahead, mũi tên, aria-activedescendant có sẵn. Label bắt buộc. */
export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export interface SelectFieldProps extends ComponentPropsWithoutRef<typeof SelectPrimitive.Root> {
  label: string;
  placeholder?: string;
  children: React.ReactNode;
  triggerClassName?: string;
}

/** Bọc Root + Trigger + label hiển thị để mọi Select trong app đều có tên. */
export function SelectField({
  label,
  placeholder,
  children,
  triggerClassName,
  ...rootProps
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <SelectPrimitive.Root {...rootProps}>
        <SelectTrigger id={id} className={triggerClassName}>
          <SelectPrimitive.Value placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </SelectPrimitive.Root>
    </div>
  );
}

export const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex min-h-[var(--target-min)] items-center justify-between gap-2 rounded-[var(--radius)] border-2 border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-left text-[length:var(--text-body)]",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon>
      <ChevronDown aria-hidden className="size-5" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position="popper"
      className={cn(
        "z-50 max-h-[min(60vh,400px)] min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-[var(--radius)] border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-1",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "flex min-h-[var(--target-min)] cursor-pointer items-center gap-2 rounded px-3 data-[highlighted]:bg-[var(--color-selected-bg)] data-[highlighted]:text-[var(--color-selected-text)] data-[highlighted]:outline-none",
      className,
    )}
    {...props}
  >
    <span className="flex size-5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check aria-hidden className="size-5" strokeWidth={3} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
