import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/ui/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label luôn bắt buộc và luôn hiển thị — không dùng placeholder thay label. */
  label: string;
  hint?: string;
  error?: string;
}

/**
 * Input "cứng": label gắn bằng htmlFor, hint/error nối qua aria-describedby,
 * lỗi đánh dấu aria-invalid và hiển thị bằng cả màu lẫn chữ (không chỉ màu).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id: idProp, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy =
      [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="text-[var(--color-text-muted)] text-[length:var(--text-sm)]">
            {hint}
          </p>
        ) : null}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-h-[var(--target-min)] rounded-[var(--radius)] border-2 border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[length:var(--text-body)]",
            error && "border-[var(--color-error)]",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="font-medium text-[var(--color-error)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
