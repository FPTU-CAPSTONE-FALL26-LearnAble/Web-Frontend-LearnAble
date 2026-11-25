import { useId } from "react";
import {
  TextSizeSelect,
  ThemeSwatches,
  useSaveStatus,
} from "@/features/accessibility/components/DisplayControls";
import { PublicPage } from "@/features/landing/components/PublicPage";
import { sectionTitle } from "@/features/landing/components/publicStyles";
import { accessibility } from "@/features/landing/content";

/** What the platform is built for, with the display controls to try right away. */
export function PublicAccessibilityRoute() {
  const idPrefix = useId();
  const { failed, track } = useSaveStatus();

  return (
    <PublicPage
      title={accessibility.title}
      eyebrow={accessibility.eyebrow}
      heading={accessibility.heading}
      intro={accessibility.intro}
    >
      <section aria-labelledby="principles-title" className="flex flex-col gap-6">
        <h2 id="principles-title" className={sectionTitle}>
          {accessibility.principlesTitle}
        </h2>
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accessibility.principles.map((item) => (
            <li key={item.title} className="flex flex-col gap-3 rounded-lg border-4 border-foreground bg-card p-6 text-card-foreground">
              <h3 className="text-2xl font-extrabold tracking-tight">{item.title}</h3>
              <p className="text-lg leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="try-title"
        className="grid gap-8 rounded-lg border-4 border-foreground bg-card p-6 text-card-foreground md:p-8 lg:grid-cols-2"
      >
        <div className="flex flex-col gap-4">
          <h2 id="try-title" className={sectionTitle}>
            {accessibility.tryTitle}
          </h2>
          <p className="text-lg leading-relaxed">{accessibility.tryBody}</p>
        </div>
        <div className="flex flex-col gap-6">
          <TextSizeSelect idPrefix={`${idPrefix}-page`} onSave={track} />
          <ThemeSwatches idPrefix={`${idPrefix}-page`} onSave={track} />
          {failed ? (
            <p role="alert" className="font-bold text-destructive">
              {accessibility.saveFailed}
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="feedback-title" className="flex max-w-4xl flex-col gap-4 border-s-8 border-foreground ps-6">
        <h2 id="feedback-title" className={sectionTitle}>
          {accessibility.feedbackTitle}
        </h2>
        <p className="text-xl leading-relaxed">{accessibility.feedbackBody}</p>
      </section>
    </PublicPage>
  );
}
