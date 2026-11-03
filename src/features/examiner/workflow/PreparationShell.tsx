import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PreparationHeader({ title, description }: { title: string; description: string }) {
  return <header className="border-b border-border pb-5"><h1 className="text-3xl font-semibold tracking-tight text-primary">{title}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p></header>;
}

export function PreparationSteps({ steps, current }: { steps: string[]; current: number }) {
  return <ol aria-label="Preparation progress" className="grid gap-2 md:grid-cols-4">{steps.map((step, index) => <li key={step} className={cn("flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-semibold", index === current ? "border-primary bg-primary/10 text-primary" : index < current ? "border-success-border bg-success text-success-foreground" : "border-border bg-card text-muted-foreground")}><span className="grid size-6 shrink-0 place-items-center rounded-full border border-current">{index < current ? <Check className="size-4" /> : <Circle className="size-3 fill-current" />}</span>{step}</li>)}</ol>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold"><span>{label}</span>{children}{hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}</label>;
}

export function ApiNotice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" | "success" }) {
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border p-4 text-sm", tone === "error" && "border-destructive/40 bg-destructive/10 text-destructive", tone === "success" && "border-success-border bg-success text-success-foreground", tone === "info" && "border-border bg-muted/50 text-foreground")}>{children}</div>;
}
