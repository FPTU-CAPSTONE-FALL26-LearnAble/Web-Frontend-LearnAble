import { Database } from "lucide-react";
import { isDemoDataEnabled, setDemoDataEnabled } from "@/lib/demoData";
import { cn } from "@/lib/utils";

export function DemoDataToggle() {
  const enabled = isDemoDataEnabled();
  const toggle = () => {
    setDemoDataEnabled(!enabled);
    window.location.reload();
  };

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-3">
        <Database className="size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Demo data</p>
          <p className="text-xs text-muted-foreground">
            {enabled ? "Showing FE sample data" : "Using live Backend data"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Use demo data"
          onClick={toggle}
          className={cn(
            "relative h-11 w-14 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            enabled ? "border-primary bg-primary" : "border-border bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-background shadow-sm transition-transform",
              enabled ? "translate-x-7" : "translate-x-1.5",
            )}
          />
        </button>
      </div>
    </div>
  );
}
