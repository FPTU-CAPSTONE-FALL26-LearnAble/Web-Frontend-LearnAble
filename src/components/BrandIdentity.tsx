import { cn } from "@/lib/utils";

export function BrandIdentity({
  lecturer = false,
  roleLabel,
  compact = false,
  prominent = false,
  className,
}: {
  lecturer?: boolean;
  roleLabel?: string;
  compact?: boolean;
  prominent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("flex min-w-0 items-center gap-3", className)}
    >
      <img
        src="/assets/brand/learnable-logo.png"
        alt="LearnAble — Accessible learning"
        className={cn(
          "w-auto shrink-0 object-contain",
          prominent
            ? "h-16 sm:h-20"
            : compact
              ? "h-9"
              : lecturer
                ? "h-12"
                : "h-11",
        )}
      />
      {lecturer ? (
        <div className="min-w-0 border-l border-border pl-3 text-left">
        <p
          className={cn(
            "truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
            !compact && "text-xs",
          )}
        >
          {roleLabel || "Lecturer"}
        </p>
        </div>
      ) : null}
    </div>
  );
}
