import type { ReactNode } from "react";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router";
import { BrandIdentity } from "@/components/BrandIdentity";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { cn } from "@/shared/ui/cn";

const frame = "mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8";

export const signInTextLink =
  "inline-flex min-h-11 w-fit items-center text-lg font-bold underline decoration-2 underline-offset-4 hover:decoration-4";

type SignInFrameProps = {
  /** The Accessibility card; the router passes it in, since features do not import each other. */
  displayControls?: ReactNode;
  titleId: string;
  eyebrow: string;
  title: string;
  intro: ReactNode;
  /** The form and anything that belongs with it. */
  children: ReactNode;
  aside: { titleId: string; title: string; image?: string; children: ReactNode };
};

/**
 * The frame both sign-in pages share: brand and Accessibility card on top, the
 * form in a bordered panel, and a quieter side panel after it. The form comes
 * first in reading and Tab order, and stacks above the side panel on phones.
 */
export function SignInFrame({ displayControls, titleId, eyebrow, title, intro, children, aside }: SignInFrameProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SkipLink />
      <header className="border-b-4 border-foreground">
        <div className={cn(frame, "flex flex-wrap items-center justify-between gap-4 py-4")}>
          <Link to="/" aria-label="Go to LearnAble home page" className="shrink-0">
            <BrandIdentity prominent />
          </Link>
          {displayControls}
        </div>
      </header>

      <main id="main" className={cn(frame, "grid flex-1 items-start gap-8 py-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:py-14")}>
        <section
          aria-labelledby={titleId}
          className="flex flex-col gap-8 rounded-lg border-4 border-foreground bg-card p-6 text-lg text-card-foreground sm:p-10"
        >
          <div className="flex flex-col gap-3">
            <p className="text-base font-extrabold tracking-wider uppercase">{eyebrow}</p>
            <h1 id={titleId} className="text-4xl font-extrabold tracking-tight outline-none sm:text-5xl">
              {title}
            </h1>
            <div className="text-xl leading-relaxed">{intro}</div>
          </div>
          {children}
        </section>

        {/* Inverted panel: ink becomes the fill, so it follows every colour theme. */}
        <aside aria-labelledby={aside.titleId} className="flex flex-col gap-6 rounded-lg bg-foreground p-6 text-lg text-background sm:p-10">
          {aside.image ? <img src={aside.image} alt="" className="aspect-[16/9] w-full rounded-md object-cover" /> : null}
          <h2 id={aside.titleId} className="text-3xl font-extrabold tracking-tight">
            {aside.title}
          </h2>
          {aside.children}
        </aside>
      </main>
    </div>
  );
}

/** An error in words next to its field, with an icon so it never relies on red alone. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-center gap-2 text-base font-bold leading-relaxed text-destructive">
      <CircleAlert aria-hidden className="size-5 shrink-0" />
      {children}
    </p>
  );
}

/** One fixed name; the pressed state tells a screen reader whether the password is shown. */
export function ShowPasswordToggle({
  controls,
  shown,
  onToggle,
}: {
  controls: string;
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={shown}
      aria-controls={controls}
      onClick={onToggle}
      className="inline-flex min-h-11 items-center gap-2 self-start rounded-md px-1 text-base font-bold underline decoration-2 underline-offset-4 hover:decoration-4"
    >
      {shown ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
      Show password
    </button>
  );
}
