import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/shared/ui/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id: idProp, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy =
      [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

    const textareaElement = (
      <textarea
        ref={ref}
        id={label ? id : idProp}
        data-slot="textarea"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "flex min-h-28 w-full rounded-[var(--radius)] border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-[length:var(--text-body)] text-[var(--color-text)] transition-colors outline-none placeholder:text-[var(--color-text-muted)] focus-visible:outline focus-visible:outline-[var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[var(--color-error)]",
          className,
        )}
        {...props}
      />
    );

    if (label || hint || error) {
      return (
        <div className="flex flex-col gap-2">
          {label ? (
            <label htmlFor={id} className="font-medium text-[var(--color-text)]">
              {label}
            </label>
          ) : null}
          {hint ? (
            <p id={hintId} className="text-[var(--color-text-muted)] text-[length:var(--text-sm)]">
              {hint}
            </p>
          ) : null}
          {textareaElement}
          {error ? (
            <p id={errorId} role="alert" className="font-medium text-[var(--color-error)]">
              {error}
            </p>
          ) : null}
        </div>
      );
    }

    return textareaElement;
  },
);
Textarea.displayName = "Textarea";
