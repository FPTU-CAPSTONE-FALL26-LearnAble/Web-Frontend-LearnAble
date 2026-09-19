import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Textarea({ className, ...props }: ComponentProps<"textarea">) { return <textarea data-slot="textarea" className={cn("flex min-h-24 w-full rounded-lg border border-input bg-background px-3 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50", className)} {...props} />; }
