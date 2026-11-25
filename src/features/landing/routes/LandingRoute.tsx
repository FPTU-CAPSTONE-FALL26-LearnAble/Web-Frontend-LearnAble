import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { PublicPage } from "@/features/landing/components/PublicPage";
import { cta, sectionTitle } from "@/features/landing/components/publicStyles";
import { home } from "@/features/landing/content";
import { cn } from "@/shared/ui/cn";

/** The public home page: what LearnAble is, and a door to each other page. */
export function LandingRoute() {
  return (
    <PublicPage
      title={home.title}
      eyebrow={home.eyebrow}
      heading={home.heading}
      intro={home.intro}
      image={{ src: "/assets/landing/inclusive-learning.png", alt: home.imageAlt }}
    >
      <section aria-labelledby="explore-title" className="flex flex-col gap-6">
        <div className="flex max-w-3xl flex-col gap-3">
          <h2 id="explore-title" className={sectionTitle}>
            {home.exploreTitle}
          </h2>
          <p className="text-xl leading-relaxed">{home.exploreIntro}</p>
        </div>
        <ul className="grid gap-6 md:grid-cols-2">
          {home.explore.map((page) => (
            <li key={page.to}>
              {/* The whole card is one link, named by its heading. */}
              <Link
                to={page.to}
                className="group flex h-full flex-col gap-3 rounded-lg border-4 border-foreground bg-card p-6 text-card-foreground"
              >
                <span className="flex items-center justify-between gap-4 text-3xl font-extrabold tracking-tight underline-offset-4 group-hover:underline">
                  {page.title}
                  <ArrowRight aria-hidden className="size-8 shrink-0" strokeWidth={3} />
                </span>
                <span className="text-lg leading-relaxed">{page.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Inverted band: ink becomes the fill, so it follows every colour theme. */}
      <section
        aria-labelledby="student-title"
        className="flex flex-col items-start gap-5 rounded-lg bg-foreground p-8 text-background"
      >
        <h2 id="student-title" className={sectionTitle}>
          {home.studentTitle}
        </h2>
        <p className="max-w-3xl text-xl leading-relaxed">{home.studentBody}</p>
        <Link to="/student/login" className={cn(cta.base, cta.inverted)}>
          {home.primary} <ArrowRight aria-hidden className="size-6" strokeWidth={3} />
        </Link>
      </section>
    </PublicPage>
  );
}
