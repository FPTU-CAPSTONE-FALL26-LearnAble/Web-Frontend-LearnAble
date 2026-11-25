import { useState } from "react";
import { Check } from "lucide-react";
import {
  CONTRAST_THEMES,
  setContrastTheme,
  useContrastTheme,
  type ContrastTheme,
} from "@/lib/a11y/displayPreferences";
import { announce } from "@/shared/a11y/announcer";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";

const t = vi.a11ySettings;

/**
 * Colour themes as one radio group: arrow keys move between themes and the
 * page changes at once, so a student judges each by reading with it. Each
 * option previews itself in its own colours and is named in words. The choice
 * is saved to the account; a failed save says so in words and keeps the theme.
 */
export function ContrastThemePicker() {
  const theme = useContrastTheme();
  const [saveFailed, setSaveFailed] = useState(false);
  const choose = (next: ContrastTheme) => {
    const saved = setContrastTheme(next);
    announce(t.themeChanged(t.themes[next].name));
    setSaveFailed(false);
    saved.catch(() => setSaveFailed(true));
  };
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 font-medium">{t.themeLegend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {CONTRAST_THEMES.map((option) => {
          const selected = option === theme;
          return (
            <label
              key={option}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border-2 p-3",
                "has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                selected ? "border-foreground" : "border-border",
              )}
            >
              <input
                type="radio"
                name="contrast-theme"
                className="size-6 shrink-0 accent-primary"
                value={option}
                checked={selected}
                onChange={() => choose(option)}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 font-semibold">
                  {t.themes[option].name}
                  {selected ? <Check aria-hidden className="size-5 shrink-0" /> : null}
                </span>
                <span className="text-muted-foreground">{t.themes[option].description}</span>
              </span>
              <span
                aria-hidden
                data-contrast={option}
                className="shrink-0 rounded-md border-2 border-border bg-background px-3 py-2 font-semibold text-foreground"
              >
                {t.themeSample}
              </span>
            </label>
          );
        })}
      </div>
      {saveFailed ? (
        <p role="alert" className="text-destructive">
          {t.themeSaveFailed}
        </p>
      ) : null}
    </fieldset>
  );
}
