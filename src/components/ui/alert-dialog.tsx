import * as Primitive from "@radix-ui/react-alert-dialog";
import type { ComponentProps } from "react";
import { buttonVariants } from "./button";
export const AlertDialog = Primitive.Root;
export const AlertDialogTitle = Primitive.Title;
export const AlertDialogDescription = Primitive.Description;
export function AlertDialogContent({ children }: ComponentProps<typeof Primitive.Content>) { return <Primitive.Portal><Primitive.Overlay className="fixed inset-0 z-50 bg-foreground/40" /><Primitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-lg">{children}</Primitive.Content></Primitive.Portal>; }
export function AlertDialogHeader({ children }: ComponentProps<"div">) { return <div className="space-y-3 [&>h2]:text-xl [&>h2]:font-bold [&>p]:text-sm [&>p]:text-muted-foreground">{children}</div>; }
export function AlertDialogFooter({ children }: ComponentProps<"div">) { return <div className="mt-6 flex flex-wrap justify-end gap-2">{children}</div>; }
export function AlertDialogCancel(props: ComponentProps<typeof Primitive.Cancel>) { return <Primitive.Cancel className={buttonVariants({ variant: "outline" })} {...props} />; }
export function AlertDialogAction(props: ComponentProps<typeof Primitive.Action>) { return <Primitive.Action className={buttonVariants()} {...props} />; }
