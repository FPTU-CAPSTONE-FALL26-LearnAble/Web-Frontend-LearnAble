import { PublicPage } from "@/features/landing/components/PublicPage";
import { challenges } from "@/features/landing/content";

/** The barriers visually impaired students meet, each with what it costs them. */
export function ChallengesRoute() {
  return (
    <PublicPage
      title={challenges.title}
      eyebrow={challenges.eyebrow}
      heading={challenges.heading}
      intro={challenges.intro}
      image={{ src: "/assets/landing/inclusive-university-classroom.png", alt: challenges.imageAlt }}
      next={{ to: "/solution", title: challenges.nextTitle }}
    >
      <ol className="grid gap-6 lg:grid-cols-2">
        {challenges.items.map((item, index) => (
          <li key={item.title} className="flex flex-col gap-4 rounded-lg border-4 border-foreground bg-card p-6 text-card-foreground">
            <h2 className="flex items-start gap-4 text-3xl font-extrabold tracking-tight">
              <span
                aria-hidden
                className="flex size-12 shrink-0 items-center justify-center rounded-md bg-foreground text-2xl text-background"
              >
                {index + 1}
              </span>
              {item.title}
            </h2>
            <dl className="flex flex-col gap-4 text-lg leading-relaxed">
              <div>
                <dt className="font-extrabold tracking-wide uppercase">{challenges.whatLabel}</dt>
                <dd>{item.what}</dd>
              </div>
              <div className="border-t-2 border-border pt-4">
                <dt className="font-extrabold tracking-wide uppercase">{challenges.effectLabel}</dt>
                <dd>{item.effect}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </PublicPage>
  );
}
