import { useId, useMemo, useState, type KeyboardEvent } from "react";
import {
  CircleCheck,
  CircleDot,
  Ear,
  FlaskConical,
  RotateCcw,
  Send,
  Volume2,
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { cn } from "@/lib/utils";
import { comboFromEvent, sameCombo, type ShortcutRules } from "./shortcutKeys";
import {
  OPTION_LETTERS,
  SAMPLE_QUESTIONS,
  applyEffect,
  initialPreview,
  previewEffect,
  type PreviewEffect,
} from "./shortcutPreview";

export type TestableShortcut = {
  actionCode: string;
  actionName: string;
  keyCombination: string;
  isEnabled: boolean;
};

type Result = { combo: string; message: string; firedKey: string | null };

/** A changed combination counts as untested again. */
const testKey = (item: TestableShortcut) => `${item.actionCode}|${item.keyCombination}`;

function Keys({ combo, fired }: { combo: string; fired?: boolean }) {
  return (
    <kbd
      className={cn(
        "rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-sm font-bold whitespace-nowrap",
        fired && "border-foreground ring-2 ring-ring",
      )}
    >
      {combo}
    </kbd>
  );
}

/**
 * A sample exam the admin drives with the saved shortcuts: pressing the keys
 * for "Select option A" visibly selects option A, "Next question" turns the
 * page, and so on. Nothing is saved and no exam is touched.
 *
 * It checks the mapping in this browser only. It cannot prove the desktop exam
 * app receives the keys, and the browser keeps a few combinations (for example
 * Ctrl+W or Ctrl+T) for itself, so those never reach this field.
 */
export function ShortcutTester({
  shortcuts,
  rules,
}: {
  shortcuts: TestableShortcut[];
  rules: ShortcutRules;
}) {
  const id = useId();
  const fieldId = `${id}-field`;
  const [result, setResult] = useState<Result | null>(null);
  const [tested, setTested] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState(initialPreview);
  const [listening, setListening] = useState(false);

  const items = useMemo(
    () =>
      shortcuts.map((shortcut) => ({
        shortcut,
        key: testKey(shortcut),
        effect: previewEffect({ code: shortcut.actionCode, name: shortcut.actionName }),
      })),
    [shortcuts],
  );
  const active = items.filter((item) => item.shortcut.isEnabled);
  const done = active.filter((item) => tested.has(item.key)).length;
  /** Shortcuts drawn on the option they select; the rest go in the action bar. */
  const forOption = (option: number) =>
    active.filter(
      (item) => item.effect.kind === "selectOption" && item.effect.option === option,
    );
  const otherActions = active.filter((item) => item.effect.kind !== "selectOption");

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const plain = !event.ctrlKey && !event.altKey && !event.metaKey;
    // Tab and Escape keep working so nobody is trapped in the field.
    if (event.key === "Tab" && plain) return;
    if (event.key === "Escape") return;
    event.preventDefault();
    const combo = comboFromEvent(event.nativeEvent, rules);
    if (!combo) return;
    const match = items.find((item) => sameCombo(item.shortcut.keyCombination, combo));
    if (!match) {
      setResult({
        combo,
        message: `${combo} is not assigned to any action.`,
        firedKey: null,
      });
      return;
    }
    const { actionName } = match.shortcut;
    if (!match.shortcut.isEnabled) {
      setResult({
        combo,
        message: `${combo} belongs to “${actionName}”, but that shortcut is turned off, so it does nothing in the exam.`,
        firedKey: null,
      });
      return;
    }
    const next = applyEffect(preview, match.effect);
    setPreview(next.state);
    setResult({
      combo,
      message: `${combo} triggers “${actionName}”. ${next.detail}`,
      firedKey: match.key,
    });
    setTested((old) => new Set(old).add(match.key));
  };

  const question = SAMPLE_QUESTIONS[preview.index];
  const selected = preview.selected[preview.index];
  const highlighted = preview.highlighted[preview.index];
  const usesHighlight = active.some((item) =>
    (["selectHighlighted", "highlightNext", "highlightPrevious"] as PreviewEffect["kind"][]).includes(
      item.effect.kind,
    ),
  );

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="min-w-0 rounded-2xl border border-border"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div className="flex items-center gap-2">
          <FlaskConical aria-hidden className="size-5" />
          <h2 id={`${id}-title`} className="text-lg font-bold">
            Test shortcuts
          </h2>
        </div>
        <Button
          variant="outline"
          disabled={!result && tested.size === 0}
          onClick={() => {
            setResult(null);
            setTested(new Set());
            setPreview(initialPreview());
          }}
        >
          <RotateCcw aria-hidden />
          Reset test
        </Button>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor={fieldId}>Test area</Label>
          <Input
            id={fieldId}
            readOnly
            value={result?.combo ?? ""}
            placeholder="Focus here and press a shortcut"
            onKeyDown={onKeyDown}
            onFocus={() => setListening(true)}
            onBlur={() => setListening(false)}
            aria-describedby={`${id}-help`}
            className="font-mono text-base font-bold"
          />
          <p id={`${id}-help`} className="text-sm text-muted-foreground">
            Focus the field and press a saved shortcut: the sample exam below
            reacts the way the exam app would. Nothing is changed or saved.
            This checks the keys in this browser only; if nothing happens, the
            browser or operating system has taken that combination. Tab moves
            to the next control.
          </p>
          <p role="status" className="min-h-6 font-bold">
            {result?.message ?? ""}
          </p>
        </div>

        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No shortcut is turned on yet, so there is nothing to test.
          </p>
        ) : (
          /* A picture of the exam, not a control: clicking it only moves focus
             to the test area, which is where keyboard users already are. */
          <div
            data-testid="shortcut-preview"
            onClick={() => document.getElementById(fieldId)?.focus()}
            className={cn(
              "space-y-4 rounded-xl border-2 border-dashed border-border p-4",
              listening && "border-solid border-foreground",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold tabular-nums">
                Sample exam · Question {preview.index + 1} of {SAMPLE_QUESTIONS.length}
              </p>
              <p className="inline-flex items-center gap-1.5 text-sm font-bold">
                {listening && <Ear aria-hidden className="size-4" />}
                {listening ? "Listening for keys" : "Click here or focus the test area to start"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-lg font-bold">{question.text}</p>
              {preview.reading && (
                <p className="inline-flex items-center gap-1.5 text-sm font-bold">
                  <Volume2 aria-hidden className="size-4" />
                  Reading the question aloud…
                </p>
              )}
            </div>

            <ol className="space-y-2">
              {question.options.map((text, option) => {
                const isSelected = selected === option;
                const isHighlighted = usesHighlight && highlighted === option;
                return (
                  <li
                    key={text}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-lg border-2 border-border px-3 py-2",
                      isHighlighted && "border-dashed border-foreground",
                      isSelected && "border-solid border-foreground bg-muted",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-border font-bold">
                      {OPTION_LETTERS[option]}
                    </span>
                    <span className="min-w-0 flex-1">{text}</span>
                    {/* Shape and words carry the state, never colour alone. */}
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 font-bold">
                        <CircleCheck aria-hidden className="size-4" />
                        Selected
                      </span>
                    )}
                    {isHighlighted && !isSelected && (
                      <span className="inline-flex items-center gap-1 text-sm font-bold">
                        <CircleDot aria-hidden className="size-4" />
                        Highlighted
                      </span>
                    )}
                    {forOption(option).map((item) => (
                      <span key={item.key} className="inline-flex items-center gap-1">
                        <Keys
                          combo={item.shortcut.keyCombination}
                          fired={result?.firedKey === item.key}
                        />
                        {tested.has(item.key) && (
                          <span className="sr-only">tested</span>
                        )}
                      </span>
                    ))}
                  </li>
                );
              })}
            </ol>

            {preview.saved[preview.index] && (
              <p className="inline-flex items-center gap-1.5 font-bold">
                <Send aria-hidden className="size-4" />
                Answer submitted
              </p>
            )}

            {preview.submitOpen && (
              <div className="rounded-lg border-2 border-foreground p-3">
                <p className="font-bold">Submit the exam?</p>
                <p className="text-sm text-muted-foreground">
                  The exam app asks the student to confirm here. Nothing is
                  submitted in this preview.
                </p>
              </div>
            )}

            {otherActions.length > 0 && (
              <ul className="flex flex-wrap gap-2 border-t border-border pt-4">
                {otherActions.map((item) => (
                  <li
                    key={item.key}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm",
                      result?.firedKey === item.key && "border-foreground",
                    )}
                  >
                    <span className="font-bold">{item.shortcut.actionName}</span>
                    <Keys
                      combo={item.shortcut.keyCombination}
                      fired={result?.firedKey === item.key}
                    />
                    {tested.has(item.key) && (
                      <CircleCheck aria-label="tested" className="size-4" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {active.length > 0 && (
          <p className="text-sm font-bold tabular-nums">
            {done} of {active.length} shortcuts tested
          </p>
        )}
      </div>
    </section>
  );
}
