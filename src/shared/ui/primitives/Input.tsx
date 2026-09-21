import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/ui/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, "aria-describedby": describedBy, ...props }, ref) => {
    const hintId = hint && id ? `${id}-hint` : undefined;
    const errorId = error && id ? `${id}-error` : undefined;
    const descriptions = [hintId, errorId, describedBy].filter(Boolean).join(" ") || undefined;

    const inputElement = (
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={descriptions}
        className={cn(
          "w-full min-h-[var(--target-min)] rounded-[var(--radius)] border-2 border-[var(--color-border-strong)] bg-white px-3 py-2 text-[length:var(--text-body)] transition-colors focus-visible:outline-[var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)] focus-visible:outline-offset-[var(--focus-ring-offset)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface)] disabled:opacity-70",
          error && "border-[var(--color-error)]",
          className,
        )}
        {...props}
      />
    );

    if (!label && !hint && !error) {
      return inputElement;
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={id} className="font-medium text-[length:var(--text-body)]">
            {label}
          </label>
        ) : null}
        {inputElement}
        {hint && !error ? (
          <p id={hintId} className="text-sm text-[var(--color-text-muted)]">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-sm font-medium text-[var(--color-error)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
