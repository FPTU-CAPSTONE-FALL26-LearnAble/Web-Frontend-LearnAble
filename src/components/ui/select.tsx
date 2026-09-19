import * as Primitive from "@radix-ui/react-select";
import type { ComponentProps } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
export const Select = Primitive.Root;
export const SelectValue = Primitive.Value;
export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof Primitive.Trigger>) { return <Primitive.Trigger className={cn("flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&>span]:truncate", className)} {...props}>{children}<Primitive.Icon><ChevronDown className="size-4" /></Primitive.Icon></Primitive.Trigger>; }
export function SelectContent({ children, ...props }: ComponentProps<typeof Primitive.Content>) { return <Primitive.Portal><Primitive.Content position="popper" className="z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md" {...props}><Primitive.Viewport>{children}</Primitive.Viewport></Primitive.Content></Primitive.Portal>; }
export function SelectItem({ children, ...props }: ComponentProps<typeof Primitive.Item>) { return <Primitive.Item className="relative flex min-h-11 cursor-default items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none focus:bg-secondary focus:text-secondary-foreground" {...props}><Primitive.ItemIndicator className="absolute left-2"><Check className="size-4" /></Primitive.ItemIndicator><Primitive.ItemText>{children}</Primitive.ItemText></Primitive.Item>; }
