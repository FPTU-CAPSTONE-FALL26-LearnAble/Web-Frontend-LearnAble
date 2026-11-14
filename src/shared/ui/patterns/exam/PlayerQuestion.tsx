import type { ComponentProps } from "react";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { vi } from "@/shared/strings/vi";
import {
  decodedAnswer,
  type Answer,
  type PlayerQuestion as PlayerQuestionData,
} from "./assessment-player-types";
import { CompositeQuestion } from "./CompositeQuestion";
import { GraphicTextEntryQuestion } from "./GraphicTextEntryQuestion";
import { HotspotQuestion } from "./HotspotQuestion";
import { InlineChoiceQuestion } from "./InlineChoiceQuestion";
import { MatchingQuestion } from "./MatchingQuestion";
import { MultipleChoiceQuestion } from "./MultipleChoiceQuestion";
import { MultipleResponseQuestion } from "./MultipleResponseQuestion";
import { TextAreaQuestion } from "./TextAreaQuestion";
import { TextEntryQuestion } from "./TextEntryQuestion";
import { TrueFalseQuestion } from "./TrueFalseQuestion";
import { UploadAssignmentQuestion } from "./UploadAssignmentQuestion";

export interface PlayerQuestionProps {
  question: PlayerQuestionData;
  /** 1-based position in the assessment. */
  questionNumber: number;
  questionCount: number;
  answer: Answer;
  flagged: boolean;
  onAnswerChange: (value: Answer) => void;
  onReset: () => void;
  onToggleFlag: () => void;
  className?: string;
}

const selectClassName =
  "h-11 rounded border border-input bg-card px-3 text-base";

/** Renders the question pattern that matches `question.kind`. */
export function PlayerQuestion({
  question,
  questionNumber,
  questionCount,
  answer,
  flagged,
  onAnswerChange,
  onReset,
  onToggleFlag,
  className,
}: PlayerQuestionProps) {
  const strings = vi.exam.player;
  const value = typeof answer === "string" ? answer : "";
  const options = question.options ?? [];
  const shared = {
    questionNumber,
    stem: question.prompt,
    flagged,
    onToggleFlag,
    onReset,
    className,
  };

  switch (question.kind) {
    case "single":
      return (
        <MultipleChoiceQuestion
          {...shared}
          image={question.image}
          options={options.map((option) => ({ id: option, text: option }))}
          value={value || null}
          onValueChange={onAnswerChange}
        />
      );
    case "multi": {
      const selected = Array.isArray(answer) ? answer : [];
      return (
        <MultipleResponseQuestion
          {...shared}
          image={question.image}
          imageLayout="above"
          options={options.map((option) => ({ id: option, text: option }))}
          selectedOptionIds={selected}
          onSelectionChange={(optionId, isSelected) =>
            onAnswerChange(
              isSelected
                ? [...selected, optionId]
                : selected.filter((id) => id !== optionId),
            )
          }
        />
      );
    }
    case "inline": {
      const values = decodedAnswer(answer);
      return (
        <InlineChoiceQuestion
          {...shared}
          image={question.image}
          segments={question.segments ?? []}
          slots={question.slots ?? []}
          values={values}
          onValueChange={(slotId, next) =>
            onAnswerChange(JSON.stringify({ ...values, [slotId]: next }))
          }
        />
      );
    }
    case "boolean":
      return (
        <TrueFalseQuestion
          {...shared}
          questionCount={questionCount}
          title={question.title}
          value={value || null}
          onValueChange={onAnswerChange}
        />
      );
    case "text":
    case "numeric":
      return (
        <TextEntryQuestion
          {...shared}
          value={value}
          numeric={question.kind === "numeric"}
          suffix={question.suffix}
          onValueChange={onAnswerChange}
        />
      );
    case "essay":
    case "textarea":
      return (
        <TextAreaQuestion
          {...shared}
          value={value}
          rows={question.kind === "essay" ? 14 : 7}
          label={
            question.kind === "essay"
              ? strings.essayLabel
              : strings.responseLabel
          }
          onValueChange={onAnswerChange}
        />
      );
    case "upload":
      return (
        <UploadAssignmentQuestion
          {...shared}
          value={value}
          onValueChange={onAnswerChange}
        />
      );
    case "hotspot":
      return (
        <HotspotQuestion
          {...shared}
          value={value}
          options={question.hotspots ?? []}
          onValueChange={onAnswerChange}
        />
      );
    case "graphic-text":
      return (
        <GraphicTextEntryQuestion
          {...shared}
          value={decodedAnswer(answer)}
          fields={question.fields ?? []}
          onValueChange={(next) => onAnswerChange(JSON.stringify(next))}
        />
      );
    case "drag":
    case "graphic-gap":
    case "inline-gap":
      return (
        <MatchingQuestion
          {...shared}
          value={decodedAnswer(answer)}
          onValueChange={(next) => onAnswerChange(JSON.stringify(next))}
          visual={
            question.kind === "drag"
              ? "drag"
              : question.kind === "graphic-gap"
                ? "graphic"
                : "inline"
          }
          options={options.map((label, index) => ({
            id: `option-${index}`,
            label,
          }))}
          targets={question.targets ?? []}
        />
      );
    case "composite":
      return (
        <CompositeAnswer
          question={question}
          value={value}
          shared={shared}
          onAnswerChange={onAnswerChange}
        />
      );
  }
}

function CompositeAnswer({
  question,
  value,
  shared,
  onAnswerChange,
}: {
  question: PlayerQuestionData;
  value: string;
  shared: Omit<
    ComponentProps<typeof CompositeQuestion>,
    "children" | "hasAnswer"
  >;
  onAnswerChange: (value: string) => void;
}) {
  const config = question.composite;
  if (!config) return null;

  const strings = vi.exam.player;
  const [first = "", second = ""] = value.split("|");
  const update = (part: 0 | 1, next: string) =>
    onAnswerChange(part === 0 ? `${next}|${second}` : `${first}|${next}`);
  const hasAnswer = Boolean(first || second);

  if (config.variant === "true-false-multiple-response") {
    const selected = second ? second.split(",") : [];
    const toggle = (item: string, checked: boolean) =>
      update(
        1,
        checked
          ? [...selected, item].join(",")
          : selected.filter((entry) => entry !== item).join(","),
      );
    return (
      <CompositeQuestion {...shared} hasAnswer={hasAnswer}>
        <fieldset className="grid gap-2">
          <legend className="font-medium">{config.partOneLabel}</legend>
          {(["true", "false"] as const).map((option) => (
            <label key={option} className="flex min-h-11 items-center gap-2">
              <Input
                type="radio"
                name={question.id}
                checked={first === option}
                onChange={() => update(0, option)}
              />{" "}
              {strings[option]}
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="font-medium">{config.partTwoLabel}</legend>
          {config.choices.map((item) => (
            <label key={item} className="flex min-h-11 items-center gap-2">
              <Input
                type="checkbox"
                checked={selected.includes(item)}
                onChange={(event) => toggle(item, event.target.checked)}
              />{" "}
              {item}
            </label>
          ))}
        </fieldset>
      </CompositeQuestion>
    );
  }

  const choiceSelect = (part: 0 | 1, current: string) => (
    <select
      value={current}
      onChange={(event) => update(part, event.target.value)}
      className={selectClassName}
    >
      <option value="">{strings.selectAlternative}</option>
      {config.choices.map((choice) => (
        <option key={choice}>{choice}</option>
      ))}
    </select>
  );

  if (config.variant === "numeric-multiple-choice") {
    const inputId = `composite-numeric-${question.id}`;
    return (
      <CompositeQuestion {...shared} hasAnswer={hasAnswer}>
        <div className="grid gap-2">
          <Label htmlFor={inputId}>{config.partOneLabel}</Label>
          <Input
            id={inputId}
            inputMode="decimal"
            value={first}
            onChange={(event) => update(0, event.target.value)}
            className="h-11 bg-card"
          />
        </div>
        <label className="grid gap-2">
          {config.partTwoLabel}
          {choiceSelect(1, second)}
        </label>
      </CompositeQuestion>
    );
  }

  const inputId = `composite-second-${question.id}`;
  return (
    <CompositeQuestion {...shared} hasAnswer={hasAnswer}>
      <label className="grid gap-2">
        {config.partOneLabel}
        {choiceSelect(0, first)}
      </label>
      <div className="grid gap-2">
        <Label htmlFor={inputId}>{config.partTwoLabel}</Label>
        <Input
          id={inputId}
          value={second}
          onChange={(event) => update(1, event.target.value)}
          className="h-11 bg-card"
        />
      </div>
    </CompositeQuestion>
  );
}
