import { cn } from "@/shared/ui/cn";
import { Label } from "@/shared/ui/primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { QuestionFrame, type QuestionFrameProps } from "./QuestionFrame";
export interface MatchTarget {
  id: string;
  label: string;
  x?: number;
  y?: number;
}
export interface MatchingQuestionProps extends Omit<
  QuestionFrameProps,
  "children" | "hasAnswer"
> {
  options: { id: string; label: string }[];
  targets: MatchTarget[];
  value: Record<string, string>;
  onValueChange: (value: Record<string, string>) => void;
  visual?: "inline" | "graphic" | "drag";
}
export function MatchingQuestion({
  questionNumber,
  stem,
  options,
  targets,
  value,
  onValueChange,
  onReset,
  flagged,
  onToggleFlag,
  visual = "inline",
  className,
}: MatchingQuestionProps) {
  const update = (targetId: string, optionId: string) =>
    onValueChange({ ...value, [targetId]: optionId });
  return (
    <QuestionFrame
      questionNumber={questionNumber}
      stem={stem}
      hasAnswer={Object.values(value).some(Boolean)}
      onReset={onReset}
      flagged={flagged}
      onToggleFlag={onToggleFlag}
      className={className}
    >
      {visual === "drag" ? (
        <div className="grid gap-4 rounded bg-muted p-4 outline outline-1 outline-black/10 dark:outline-white/10">
          <p className="text-base text-muted-foreground">
            Drag an event onto a destination. The answer controls below provide
            a keyboard alternative.
          </p>
          <div className="flex flex-wrap gap-2" aria-label="Draggable answers">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                draggable
                onDragStart={(event) =>
                  event.dataTransfer.setData("text/plain", option.id)
                }
                className="min-h-11 cursor-grab rounded bg-card px-3 text-base shadow-sm outline outline-1 outline-black/10 active:cursor-grabbing active:scale-[0.96] dark:outline-white/10"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {targets.map((target) => {
              const selected = options.find(
                (option) => option.id === value[target.id],
              );
              return (
                <div
                  key={target.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    update(target.id, event.dataTransfer.getData("text/plain"));
                  }}
                  className="min-h-24 rounded border-2 border-dashed border-border bg-background p-3"
                >
                  <p className="text-base font-medium">{target.label}</p>
                  <p className="mt-2 text-base text-muted-foreground">
                    {selected?.label ?? "Drop answer here"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          "grid gap-4",
          visual === "graphic" &&
            "relative min-h-80 rounded bg-muted p-4 outline outline-1 outline-black/10 dark:outline-white/10",
        )}
      >
        {targets.map((target) => (
          <div
            key={target.id}
            className={cn(
              "grid gap-2 rounded bg-card p-3 shadow-sm sm:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1fr)] sm:items-center",
              visual === "graphic" && "sm:absolute sm:w-64",
            )}
            style={
              visual === "graphic"
                ? { left: `${target.x ?? 10}%`, top: `${target.y ?? 10}%` }
                : undefined
            }
          >
          <Label htmlFor={`match-${questionNumber}-${target.id}`} className="text-base">
              {target.label}
            </Label>
            <Select
              value={value[target.id] ?? ""}
              onValueChange={(optionId) => update(target.id, optionId)}
            >
              <SelectTrigger
                id={`match-${questionNumber}-${target.id}`}
                className="h-11 bg-card"
              >
                <SelectValue placeholder="Choose an answer" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </QuestionFrame>
  );
}
