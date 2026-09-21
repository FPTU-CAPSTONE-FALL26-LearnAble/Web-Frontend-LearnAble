import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { announce } from "@/shared/a11y/announcer";
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
 * Chọn đáp án announce NGAY trong handler (NFR-12 ≤ 1s), lạc quan —
 * lưu thất bại thì save queue announce đính chính sau.
 */
export function AnswerOptionList({ options, value, onChange, disabled }: AnswerOptionListProps) {
  return (
    <RadioGroup
      aria-label={vi.exam.answerOptionsLabel}
      value={value ?? ""}
      disabled={disabled}
      onValueChange={(id) => {
        const opt = options.find((o) => o.id === id);
        if (opt) announce(vi.announce.answerSelected(opt.letter));
        onChange(id);
      }}
    >
      {options.map((opt) => (
        <RadioGroupItem key={opt.id} value={opt.id} label={`${opt.letter}. ${opt.text}`} />
      ))}
    </RadioGroup>
  );
}
