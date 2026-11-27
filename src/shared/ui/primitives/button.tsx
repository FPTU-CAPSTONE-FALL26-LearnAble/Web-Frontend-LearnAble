import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/ui/cn";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[calc(1rem*var(--text-scale))]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        success:
          "border-success-border bg-success text-success-foreground hover:bg-[color-mix(in_oklch,var(--success),var(--success-border)_18%)] focus-visible:border-success-border focus-visible:ring-success-border/40",
        link: "text-primary underline-offset-4 hover:underline",
        // Exam question tiles: status must read without colour, so these pair
        // a ≥3:1 border with the fill. Used with size="tile".
        "accent-soft":
          "border-player-accent bg-player-accent-soft text-player-accent-soft-foreground hover:bg-[color-mix(in_oklch,var(--player-accent-soft),var(--player-accent)_15%)]",
        flag: "border-player-flag-foreground bg-player-flag text-player-flag-foreground hover:bg-[color-mix(in_oklch,var(--player-flag),var(--player-flag-foreground)_12%)]",
        "outline-strong":
          "border-border shadow-xs bg-background text-foreground hover:bg-muted",
      },
      size: {
        default:
          "h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-sm px-2 text-xs in-data-[slot=button-group]:rounded-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-[calc(0.75rem*var(--text-scale))]",
        sm: "h-8 gap-1 rounded-sm px-2.5 in-data-[slot=button-group]:rounded-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // em: lớn theo cỡ chữ (desktop phóng thang chữ bằng --text-scale); 100% = 8px/16px/12px như cũ.
        xl: "gap-[0.5em] p-[0.75em] text-base has-data-[icon=inline-end]:pr-[0.75em] has-data-[icon=inline-start]:pl-[0.75em]",
        // exam: đúng mức tối thiểu 44×44 CSS px ở 100%, lớn theo --text-scale.
        exam: "min-h-[calc(2.75rem*var(--text-scale))] gap-[0.5em] px-[0.75em] py-0 text-base has-data-[icon=inline-end]:pr-[0.75em] has-data-[icon=inline-start]:pl-[0.75em]",
        "icon-exam":
          "size-[calc(2.75rem*var(--text-scale))] [&_svg]:!size-[calc(1.5rem*var(--text-scale))] [&_svg]:stroke-[2]",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-sm in-data-[slot=button-group]:rounded-sm [&_svg:not([class*='size-'])]:size-[calc(0.75rem*var(--text-scale))]",
        "icon-sm": "size-8 rounded-sm in-data-[slot=button-group]:rounded-sm",
        "icon-lg": "size-10",
        "icon-xl":
          "p-4 [&_svg]:!size-[calc(1.5rem*var(--text-scale))] [&_svg]:stroke-[2] max-w-[calc(4rem*var(--text-scale))] max-h-[calc(4rem*var(--text-scale))]",
        // Grid cell: number stacked over a status-icon row; colours come from the variant.
        tile: "min-h-11 flex-col gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
