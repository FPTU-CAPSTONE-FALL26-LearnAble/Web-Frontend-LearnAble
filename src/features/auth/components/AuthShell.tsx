import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { BrandIdentity } from "@/components/BrandIdentity";

interface AuthShellProps {
  children: ReactNode;
  campusImage: string;
  campusImageAlt?: string;
  campusImageClassName?: string;
  imageOverlayClassName?: string;
  heroTitle: string;
  heroTitleClassName?: string;
  heroBody: string;
  badge?: string;
  className?: string;
}

const highlights = [
  { value: "Top 201–300", label: "Sustainable development" },
  { value: "#87", label: "Quality Education" },
  { value: "#14", label: "Good jobs & growth" },
];

export function AuthShell({
  children,
  campusImage,
  campusImageAlt = "FPT University green campus",
  campusImageClassName,
  imageOverlayClassName,
  heroTitle,
  heroTitleClassName,
  heroBody,
  badge,
  className,
}: AuthShellProps) {
  return (
    <>
      <SkipLink />
      <main
        id="main"
        className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
      >
        <div
          className={cn(
            "grid min-w-0 w-full max-w-7xl overflow-hidden rounded-[var(--radius-card)] bg-card shadow-[var(--shadow-card)] ring-1 ring-[var(--color-border-subtle)] lg:grid-cols-12",
            className,
          )}
        >
          <section className="order-1 flex min-w-0 min-h-[660px] flex-col justify-center bg-card p-6 sm:p-10 lg:order-2 lg:col-span-7 lg:p-14">
            {children}
          </section>
          <aside className="relative order-2 min-w-0 min-h-72 overflow-hidden bg-foreground p-6 text-[var(--color-surface)] sm:p-8 lg:order-1 lg:col-span-5 lg:min-h-[720px] lg:p-10">
            <img
              src={campusImage}
              alt={campusImageAlt}
              className={cn(
                "absolute inset-0 size-full object-cover",
                campusImageClassName,
              )}
            />
            <div
              className={cn(
                "absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,.55)_0%,rgba(15,23,42,.95)_100%)]",
                imageOverlayClassName,
              )}
            />
            <div className="relative flex h-full flex-col justify-between gap-12 [text-shadow:var(--shadow-image-text)]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-surface)]">
                Hanoi • Ho Chi Minh City • Da Nang • Can Tho • Quy Nhon
              </p>
              <div className="mt-auto max-w-lg">
                {badge ? (
                  <div className="mb-5 inline-flex items-center gap-2 rounded-md bg-[var(--color-primary-brand)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-surface)]">
                    <ShieldCheck aria-hidden className="size-4" />
                    {badge}
                  </div>
                ) : null}
                <h2
                  className={cn(
                    "min-w-0 max-w-md break-words text-3xl font-bold leading-tight tracking-[-0.025em] text-[var(--color-surface)] sm:text-4xl",
                    heroTitleClassName,
                  )}
                >
                  {heroTitle}
                </h2>
                <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--color-surface)]/90">
                  {heroBody}
                </p>
                <dl className="mt-8 grid min-w-0 grid-cols-1 gap-3 border-t border-[var(--color-surface)]/20 pt-6 min-[360px]:grid-cols-3">
                  {highlights.map((item) => (
                    <div
                      className="min-w-0 rounded-lg border border-[var(--color-surface)]/15 bg-[var(--color-surface)]/10 p-3 shadow-sm backdrop-blur-sm"
                      key={item.value}
                    >
                      <dt className="whitespace-nowrap text-[0.95rem] font-extrabold tracking-[-0.03em] text-[var(--color-action-hover)] sm:text-base">
                        {item.value}
                      </dt>
                      <dd className="mt-1 text-[0.68rem] font-semibold leading-snug text-[var(--color-surface)] sm:text-xs">
                        {item.label}
                        <span className="sr-only">
                          , THE Impact Ratings 2026
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

export function AuthBrand() {
  return <BrandIdentity />;
}

export function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5">
      <path
        fill="var(--color-secondary)"
        d="M22.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-2 3.3-4.8 3.3-8.2Z"
      />
      <path
        fill="var(--color-success)"
        d="M12 23c3 0 5.5-1 7.3-2.6l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1a6.5 6.5 0 0 1-6.2-4.5H2.2V17A11 11 0 0 0 12 23Z"
      />
      <path
        fill="var(--color-warning)"
        d="M5.8 14.2a6.6 6.6 0 0 1 0-4.4V7H2.2a11 11 0 0 0 0 10l3.6-2.8Z"
      />
      <path
        fill="var(--color-error)"
        d="M12 5.3c1.6 0 3.1.6 4.2 1.6l3.2-3.1A10.7 10.7 0 0 0 12 1 11 11 0 0 0 2.2 7l3.6 2.8A6.5 6.5 0 0 1 12 5.3Z"
      />
    </svg>
  );
}
