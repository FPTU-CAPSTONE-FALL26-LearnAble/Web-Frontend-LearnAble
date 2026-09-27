import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useId } from "react";
export function ChoiceField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select an option",
  visuallyHiddenLabel = false,
}: {
  label: string;
  value: string;
  options: (string | { value: string; label: string })[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  visuallyHiddenLabel?: boolean;
}) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-2">
      <Label
        htmlFor={id}
        className={visuallyHiddenLabel ? "sr-only" : undefined}
      >
        {label}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="min-h-11 w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => {
            const item =
              typeof option === "string"
                ? { value: option, label: option }
                : option;
            return (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  error,
  visuallyHiddenLabel = false,
  disabled = false,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  disabled?: boolean;
  error?: string;
  visuallyHiddenLabel?: boolean;
}) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className={visuallyHiddenLabel ? "sr-only" : undefined}
      >
        {label}
      </Label>
      {multiline ? (
        <Textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-28"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
