/**
 * Large, heavy type, thick borders and filled calls to action: public pages
 * read at a glance for low-vision visitors, and every control is at least 56 px.
 */
export const cta = {
  base: "inline-flex min-h-14 items-center justify-center gap-3 rounded-md border-4 px-6 text-xl font-extrabold underline-offset-4 hover:underline",
  primary: "border-foreground bg-primary text-primary-foreground",
  secondary: "border-foreground bg-background text-foreground",
  /** On an inverted (ink-filled) band. */
  inverted: "border-background bg-background text-foreground",
};

export const eyebrow = "text-lg font-extrabold tracking-wider uppercase";
export const sectionTitle = "text-4xl font-extrabold tracking-tight";
export const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8";
