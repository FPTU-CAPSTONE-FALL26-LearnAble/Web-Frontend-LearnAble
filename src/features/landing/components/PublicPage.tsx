import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { site } from "@/features/landing/content";
import { container, cta, eyebrow as eyebrowClass } from "@/features/landing/components/publicStyles";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { cn } from "@/shared/ui/cn";

type PublicPageProps = {
  /** Short page name for the browser tab. */
  title: string;
  eyebrow: string;
  heading: string;
  intro: string;
  image?: { src: string; alt: string };
  children: ReactNode;
  next?: { to: string; title: string };
};

/**
 * One public page: its own tab title, a heading that takes focus when the page
 * opens (so a screen reader starts reading there), and a link to the next page.
 */
export function PublicPage({ title, eyebrow, heading, intro, image, children, next }: PublicPageProps) {
  useRouteAnnouncer(`${title}${site.titleSuffix}`, heading);

  return (
    <>
      <div className="border-b-4 border-foreground">
        <div className={cn(container, "grid gap-8 py-12 lg:grid-cols-[3fr_2fr] lg:items-center")}>
          <div className="flex max-w-4xl flex-col gap-5">
            <p className={eyebrowClass}>{eyebrow}</p>
            <h1 tabIndex={-1} className="text-5xl leading-tight font-extrabold tracking-tight">
              {heading}
            </h1>
            <p className="max-w-3xl text-xl leading-relaxed">{intro}</p>
          </div>
          {image ? (
            <img
              src={image.src}
              alt={image.alt}
              className="aspect-[4/3] w-full rounded-lg border-4 border-foreground object-cover"
            />
          ) : null}
        </div>
      </div>

      <div className={cn(container, "flex flex-col gap-16 py-14")}>{children}</div>

      {next ? (
        <div className="border-t-4 border-foreground">
          <div className={cn(container, "py-10")}>
            <Link to={next.to} className={cn(cta.base, cta.primary)}>
              <span>
                <span className="sr-only">{site.next}: </span>
                {next.title}
              </span>
              <ArrowRight aria-hidden className="size-6" strokeWidth={3} />
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
