import { Check } from "lucide-react";
import { PublicPage } from "@/features/landing/components/PublicPage";
import { sectionTitle } from "@/features/landing/components/publicStyles";
import { howItWorks } from "@/features/landing/content";

/** The shared flow from preparation to results, and what each role does in it. */
export function HowItWorksRoute() {
  return (
    <PublicPage
      title={howItWorks.title}
      eyebrow={howItWorks.eyebrow}
      heading={howItWorks.heading}
      intro={howItWorks.intro}
      image={{ src: "/assets/landing/accessible-university-exam.png", alt: howItWorks.imageAlt }}
      next={{ to: "/accessibility", title: howItWorks.nextTitle }}
    >
      {/* Inverted band: ink becomes the fill, so it follows every colour theme. */}
      <section aria-labelledby="flow-title" className="flex flex-col gap-6 rounded-lg bg-foreground p-8 text-background">
        <h2 id="flow-title" className={sectionTitle}>
          {howItWorks.flowTitle}
        </h2>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.flow.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-lg border-4 border-background p-6">
              <span
                aria-hidden
                className="flex size-12 items-center justify-center rounded-md bg-background text-2xl font-extrabold text-foreground"
              >
                {index + 1}
              </span>
              <h3 className="text-2xl font-extrabold">{step.title}</h3>
              <p className="text-lg leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="roles-title" className="flex flex-col gap-6">
        <h2 id="roles-title" className={sectionTitle}>
          {howItWorks.rolesTitle}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {howItWorks.roles.map((role, index) => (
            <article
              key={role.title}
              aria-labelledby={`role-${index}`}
              className="flex flex-col gap-4 rounded-lg border-4 border-foreground bg-card p-6 text-card-foreground"
            >
              <h3 id={`role-${index}`} className="text-3xl font-extrabold tracking-tight">
                {role.title}
              </h3>
              <ul className="flex flex-col gap-3 text-lg leading-relaxed">
                {role.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check aria-hidden className="mt-1 size-6 shrink-0" strokeWidth={3} />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}
