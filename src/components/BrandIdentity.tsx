import { cn } from "@/lib/utils";

/** Preserve the complete source logo, including its transparent safe area. */
export function BrandIdentity({
  lecturer = false,
  roleLabel,
  compact = false,
  className,
}: {
  lecturer?: boolean;
  roleLabel?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        lecturer
          ? "flex min-w-0 items-center gap-3"
          : "flex min-w-0 flex-wrap items-center gap-4",
        className,
      )}
    >
      <img
        src="/assets/auth/fpt-university-logo.png"
        alt="FPT University"
        className={cn(
          "shrink-0 object-contain",
          lecturer
            ? compact
              ? "-mx-5 -my-7 h-24 w-32"
              : "-mx-7 -my-9 h-32 w-40"
            : "-my-6 h-36 w-48 sm:h-40 sm:w-56",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "shrink-0 self-center bg-[var(--color-text)]",
          lecturer
            ? compact
              ? "h-8 w-px"
              : "h-10 w-px"
            : "h-12 w-[2px] sm:h-14",
        )}
      />
      <div className={cn("min-w-0", lecturer && "text-left")}>
        <p
          className={cn(
            "font-extrabold tracking-tight text-[var(--color-action)]",
            lecturer
              ? compact
                ? "text-base leading-none"
                : "text-lg leading-none"
              : "text-lg sm:text-xl",
          )}
        >
          LearnAble
        </p>
        <p
          className={cn(
            "mt-1 text-[10px] font-bold uppercase tracking-wider",
            "text-muted-foreground",
          )}
        >
          {lecturer ? roleLabel || "Lecturer" : "Accessible learning"}
        </p>
      </div>
    </div>
  );
}
