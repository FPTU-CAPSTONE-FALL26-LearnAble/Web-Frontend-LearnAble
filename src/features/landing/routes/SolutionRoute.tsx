import { ArrowDown, ArrowRight } from "lucide-react";
import { PublicPage } from "@/features/landing/components/PublicPage";
import { sectionTitle } from "@/features/landing/components/publicStyles";
import { solution } from "@/features/landing/content";

/** Each barrier from the challenge page, paired with what LearnAble does about it. */
export function SolutionRoute() {
  return (
    <PublicPage
      title={solution.title}
      eyebrow={solution.eyebrow}
      heading={solution.heading}
      intro={solution.intro}
      next={{ to: "/how-it-works", title: solution.nextTitle }}
    >
      <ol className="flex flex-col gap-6">
        {solution.items.map((item) => (
          <li
            key={item.barrier}
            className="grid gap-4 rounded-lg border-4 border-foreground bg-card p-6 text-card-foreground md:grid-cols-[2fr_auto_3fr] md:items-start"
          >
            <div className="flex flex-col gap-2">
              <p className="text-base font-extrabold tracking-wide uppercase">{solution.barrierLabel}</p>
              <h2 className="text-2xl font-extrabold tracking-tight">{item.barrier}</h2>
            </div>
            <ArrowRight aria-hidden className="hidden size-8 md:mt-8 md:block" strokeWidth={3} />
            <ArrowDown aria-hidden className="size-8 md:hidden" strokeWidth={3} />
            <div className="flex flex-col gap-2">
              <p className="text-base font-extrabold tracking-wide uppercase">{solution.answerLabel}</p>
              <p className="text-lg leading-relaxed">{item.answer}</p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="limits-title" className="flex max-w-4xl flex-col gap-4 border-s-8 border-foreground ps-6">
        <h2 id="limits-title" className={sectionTitle}>
          {solution.limitsTitle}
        </h2>
        <p className="text-xl leading-relaxed">{solution.limitsBody}</p>
      </section>
    </PublicPage>
  );
}
