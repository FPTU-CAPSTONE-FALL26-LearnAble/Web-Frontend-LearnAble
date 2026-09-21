import * as Primitive from "@radix-ui/react-alert-dialog";
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from "react";
import { buttonVariants } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/cn";

export const AlertDialog = Primitive.Root;
export const AlertDialogTrigger = Primitive.Trigger;
export const AlertDialogPortal = Primitive.Portal;
export const AlertDialogTitle = forwardRef<
  ElementRef<typeof Primitive.Title>,
  ComponentPropsWithoutRef<typeof Primitive.Title>
>(({ className, ...props }, ref) => (
  <Primitive.Title
    ref={ref}
    className={cn("text-[length:var(--text-xl)] font-bold text-[var(--color-text)]", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = Primitive.Title.displayName;

export const AlertDialogDescription = forwardRef<
  ElementRef<typeof Primitive.Description>,
  ComponentPropsWithoutRef<typeof Primitive.Description>
>(({ className, ...props }, ref) => (
  <Primitive.Description
    ref={ref}
    className={cn("text-[length:var(--text-body)] text-[var(--color-text-muted)]", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = Primitive.Description.displayName;

export const AlertDialogOverlay = forwardRef<
  ElementRef<typeof Primitive.Overlay>,
  ComponentPropsWithoutRef<typeof Primitive.Overlay>
>(({ className, ...props }, ref) => (
  <Primitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-foreground/60 backdrop-blur-xs", className)}
    {...props}
  />
));
AlertDialogOverlay.displayName = Primitive.Overlay.displayName;

export const AlertDialogContent = forwardRef<
  ElementRef<typeof Primitive.Content>,
  ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, children, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <Primitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-xl",
        className,
      )}
      {...props}
    >
      {children}
    </Primitive.Content>
  </AlertDialogPortal>
));
AlertDialogContent.displayName = Primitive.Content.displayName;

export function AlertDialogHeader({ className, children, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("space-y-3", className)} {...props}>{children}</div>;
}

export function AlertDialogFooter({ className, children, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("mt-6 flex flex-wrap justify-end gap-3", className)} {...props}>{children}</div>;
}

export const AlertDialogCancel = forwardRef<
  ElementRef<typeof Primitive.Cancel>,
  ComponentPropsWithoutRef<typeof Primitive.Cancel>
>(({ className, ...props }, ref) => (
  <Primitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), className)}
    {...props}
  />
));
AlertDialogCancel.displayName = Primitive.Cancel.displayName;

export const AlertDialogAction = forwardRef<
  ElementRef<typeof Primitive.Action>,
  ComponentPropsWithoutRef<typeof Primitive.Action>
>(({ className, ...props }, ref) => (
  <Primitive.Action
    ref={ref}
    className={cn(buttonVariants({ variant: "danger" }), className)}
    {...props}
  />
));
AlertDialogAction.displayName = Primitive.Action.displayName;
