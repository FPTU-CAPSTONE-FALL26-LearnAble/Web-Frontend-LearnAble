import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { Label } from "@/shared/ui/primitives/label";
import { vi } from "@/shared/strings/vi";

export interface AnswerOption {
  id: string;
  /** "A", "B", "C"… — đọc trước nội dung để sinh viên khiếm thị định vị nhanh */
  letter: string;
  text: string;
}

export interface AnswerOptionListProps {
  options: AnswerOption[];
  value: string | null;
  onChange: (optionId: string) => void;
  disabled?: boolean;
}

/**
 * Danh sách phương án của một câu hỏi — SCR-03 và SCR-04 dùng chung (FR-07).
 * Native radio state supplies selection feedback.
 */
export function AnswerOptionList({ options, value, onChange, disabled }: AnswerOptionListProps) {
  return (
    <RadioGroup
      aria-label={vi.exam.answerOptionsLabel}
      value={value ?? ""}
      disabled={disabled}
      onValueChange={onChange}
    >
      {options.map((opt) => (
        <div key={opt.id} className="flex min-h-[44px] items-center gap-3">
          <RadioGroupItem id={`option-${opt.id}`} value={opt.id} />
          <Label htmlFor={`option-${opt.id}`} className="cursor-pointer text-base leading-relaxed">
            {`${opt.letter}. ${opt.text}`}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
