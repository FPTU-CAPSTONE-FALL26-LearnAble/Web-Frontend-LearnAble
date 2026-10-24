import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/ui/cn"

const kbdVariants = cva(
  "pointer-events-none inline-flex w-fit items-center justify-center gap-1 bg-muted font-sans font-medium whitespace-nowrap text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10",
  {
    variants: {
      size: {
        default:
          "h-5 min-w-5 rounded-sm px-1 text-xs [&_svg:not([class*='size-'])]:size-3",
        exam: "h-8 min-w-8 rounded-md px-2 text-base [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function Kbd({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"kbd"> & VariantProps<typeof kbdVariants>) {
  return (
    <kbd
      data-slot="kbd"
      data-size={size}
      className={cn(kbdVariants({ size }), className)}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup, kbdVariants }
