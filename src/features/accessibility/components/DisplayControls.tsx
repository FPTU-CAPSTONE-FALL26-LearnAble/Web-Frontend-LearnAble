import { useCallback, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  CONTRAST_THEMES,
  TEXT_SCALES,
  setContrastTheme,
  setTextScale,
  useDisplayPreferences,
  type TextScale,
} from "@/lib/a11y/displayPreferences";
import { announce } from "@/shared/a11y/announcer";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";

const t = vi.a11ySettings;

/**
 * Whether the last choice failed to reach the account. A new choice clears it;
 * a guest's choice never fails because it stays in this browser.
 */
export function useSaveStatus() {
  const [failed, setFailed] = useState(false);
  const track = useCallback((saved: Promise<void>) => {
    setFailed(false);
    saved.catch(() => setFailed(true));
  }, []);
  return { failed, track };
}

type ControlProps = {
  /** Unique per page, so two copies of a control never share an id. */
  idPrefix: string;
  onSave: (saved: Promise<void>) => void;
};

/**
 * Text size as a native select: every screen reader and platform knows how to
 * operate it, and its list never leaves the panel that holds it.
 */
export function TextSizeSelect({ idPrefix, onSave }: ControlProps) {
  const { textScale } = useDisplayPreferences();
  const id = `${idPrefix}-text-size`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-lg font-bold">
        {t.textSize}
      </label>
      <div className="relative">
        <select
          id={id}
          value={textScale}
          onChange={(event) => {
            const next = Number(event.target.value) as TextScale;
            onSave(setTextScale(next));
            announce(t.textSizeChanged(next));
          }}
          className="min-h-12 w-full appearance-none rounded-md border-2 border-foreground bg-background ps-4 pe-12 text-lg font-bold text-foreground"
        >
          {TEXT_SCALES.map((scale) => (
            <option key={scale} value={scale}>
              {t.textSizeValue(scale)}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2"
        />
      </div>
    </div>
  );
}

/**
 * Themes as round "A" swatches, each drawn in its own colours. They are native
 * radios, so arrow keys move between themes and the page changes at once. The
 * chosen one carries a tick and a thick ring, and its name is written below,
 * so the choice never depends on seeing colour.
 */
export function ThemeSwatches({ idPrefix, onSave }: ControlProps) {
  const { theme } = useDisplayPreferences();
  const currentId = `${idPrefix}-theme-current`;
  return (
    <fieldset aria-describedby={currentId} className="flex flex-col gap-3">
      <legend className="mb-3 text-lg font-bold">{t.card.theme}</legend>
      <div className="flex flex-wrap gap-3">
        {CONTRAST_THEMES.map((option) => {
          const selected = option === theme;
          return (
            <label key={option} className="relative cursor-pointer" title={t.themes[option].name}>
              <input
                type="radio"
                name={`${idPrefix}-theme`}
                value={option}
                checked={selected}
                onChange={() => {
                  onSave(setContrastTheme(option));
                  announce(t.themeChanged(t.themes[option].name));
                }}
                className="peer sr-only"
              />
              <span className="sr-only">{t.themes[option].name}</span>
              <span
                aria-hidden
                data-contrast={option}
                className={cn(
                  "flex size-14 items-center justify-center rounded-full border-2 border-foreground bg-background text-2xl font-extrabold text-foreground",
                  "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-ring",
                  selected && "border-4",
                )}
              >
                A
              </span>
              {selected ? (
                <span
                  aria-hidden
                  className="absolute -end-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-card bg-foreground text-background"
                >
                  <Check className="size-4" strokeWidth={3} />
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
      <p id={currentId} className="font-semibold">
        {t.card.themeCurrent(t.themes[theme].name)}
      </p>
    </fieldset>
  );
}
