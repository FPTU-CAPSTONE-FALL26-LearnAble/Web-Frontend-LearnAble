import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { BrandIdentity } from "@/components/BrandIdentity";
import { Badge } from "@/shared/ui/primitives/badge";

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
  eyebrow?: string;
  highlights?: Array<{ value: string; label: string }>;
  className?: string;
}

const defaultHighlights = [
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
  eyebrow = "Hanoi • Ho Chi Minh City • Da Nang • Can Tho • Quy Nhon",
  highlights = defaultHighlights,
  className,
}: AuthShellProps) {
  return (
    <>
      <SkipLink />
      <main
        id="main"
        className="flex min-h-screen items-center justify-center overflow-x-hidden bg-muted/40 p-4 md:p-8 lg:p-10"
      >
        <div
          className={cn(
            "grid w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-card shadow lg:grid-cols-12",
            className,
          )}
        >
          <section className="order-1 flex min-w-0 flex-col justify-center bg-card p-6 sm:p-10 lg:order-2 lg:col-span-7 lg:p-12">
            {children}
          </section>
          <aside className="relative order-2 flex min-w-0 min-h-[360px] flex-col justify-between overflow-hidden bg-slate-950 p-6 text-white sm:p-8 lg:order-1 lg:col-span-5 lg:min-h-[640px] lg:p-10">
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
                "absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent",
                imageOverlayClassName,
              )}
            />
            <div className="relative flex h-full flex-col justify-between gap-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-white">
                {eyebrow}
              </p>
              <div className="mt-auto max-w-lg space-y-4">
                {badge ? (
                  <Badge>
                    <ShieldCheck aria-hidden className="size-3.5" />
                    <span>{badge}</span>
                  </Badge>
                ) : null}
                <h2
                  className={cn(
                    "text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl",
                    heroTitleClassName,
                  )}
                >
                  {heroTitle}
                </h2>
                <p className="text-sm leading-relaxed text-slate-300">
                  {heroBody}
                </p>
                <dl className="grid grid-cols-1 gap-3 border-t border-white/15 pt-6 sm:grid-cols-3">
                  {highlights.map((item) => (
                    <div
                      className="rounded-xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-md"
                      key={item.value}
                    >
                      <dt className="text-sm font-bold tracking-tight text-amber-400 sm:text-base">
                        {item.value}
                      </dt>
                      <dd className="mt-1 text-[11px] text-slate-300">
                        {item.label}
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

export function AuthBrand({ prominent = false }: { prominent?: boolean }) {
  return <BrandIdentity prominent={prominent} />;
}

export function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
