import { Bookmark, Check, ChevronLeft, ChevronRight, List } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import {
  answerState,
  type Answers,
  type PlayerQuestion,
  type PlayerView,
} from "./assessment-player-types";

export interface AssessmentPlayerFooterProps {
  answers: Answers;
  currentIndex: number;
  flagged: string[];
  questions: PlayerQuestion[];
  view: PlayerView;
  onGoTo: (index: number) => void;
  onViewChange: (view: "contents" | "review") => void;
}

export function AssessmentPlayerFooter({
  answers,
  currentIndex,
  flagged,
  questions,
  view,
  onGoTo,
  onViewChange,
}: AssessmentPlayerFooterProps) {
  const strings = vi.exam.player;
  return (
    <div className="relative shrink-0">
      <nav
        aria-label={strings.previousNext}
        tabIndex={0}
        className="absolute bottom-[calc(100%+1rem)] right-4 z-30 flex gap-1 sm:right-6 md:right-8 [&_[data-slot=button]]:rounded!"
      >
        <Button
          variant="ghost"
          size="icon-xl"
          className="bg-gray-300 hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary/30 focus-visible:ring-0"
          aria-label={strings.previous}
          disabled={view === "contents"}
          onClick={() => {
            if (view === "review") {
              onGoTo(questions.length - 1);
            } else if (currentIndex === 0) {
              onViewChange("contents");
            } else {
              onGoTo(currentIndex - 1);
            }
          }}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-xl"
          className="bg-gray-300 hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary/30 focus-visible:ring-0"
          aria-label={strings.next}
          disabled={view === "review"}
          onClick={() => {
            if (view === "contents") {
              onGoTo(0);
            } else if (currentIndex === questions.length - 1) {
              onViewChange("review");
            } else {
              onGoTo(currentIndex + 1);
            }
          }}
        >
          <ChevronRight aria-hidden />
        </Button>
      </nav>
      <footer className="border-t border-border bg-background shadow-lg [&_[data-slot=button]]:!translate-y-0 [&_[data-slot=button]]:border-0 [&_[data-slot=button]]:rounded-none [&_[data-slot=button]]:transition-none overflow-x-auto">
        <nav aria-label={strings.questions} className="flex items-start">
          <Button
            variant="secondary"
            size="icon-xl"
            aria-label={strings.tableOfContents}
            aria-pressed={view === "contents"}
            className={cn(
              "hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary/30 focus-visible:text-foreground focus-visible:ring-0 py-4.5 px-6 mr-0.5",
              view === "contents" && "bg-primary text-primary-foreground",
            )}
            onClick={() => onViewChange("contents")}
          >
            <List aria-hidden />
          </Button>
          <div
            aria-label={strings.questionNavigation}
            className="hidden min-w-0 max-w-full flex-1 items-center justify-start gap-0.5 overflow-x-auto lg:flex px-0.5"
          >
            {questions.map((question, questionIndex) => {
              const answered = answerState(answers[question.id]);
              const isFlagged = flagged.includes(question.id);
              const isCurrent =
                view === "question" && questionIndex === currentIndex;
              return (
                <div key={question.id} className="relative min-w-14 flex-1">
                  <Button
                    variant="secondary"
                    size="xl"
                    aria-label={strings.stripButtonLabel(
                      questionIndex + 1,
                      answered,
                      isFlagged,
                    )}
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => onGoTo(questionIndex)}
                    className={cn(
                      "relative w-full mt-1 mb-0.5 rounded-none text-muted-foreground font-normal hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary/30 focus-visible:ring-2 focus-visible:text-foreground",
                      isCurrent
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-secondary",
                    )}
                  >
                    {questionIndex + 1}
                    {isFlagged ? (
                      <Bookmark
                        aria-hidden
                        className="absolute left-1/2 top-0.5 size-3 -translate-x-1/2 fill-current text-current"
                      />
                    ) : null}
                  </Button>
                  <div
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-x-0 top-0 h-1",
                      answered
                        ? "bg-primary"
                        : isCurrent
                          ? "bg-border"
                          : "bg-transparent",
                    )}
                  />
                </div>
              );
            })}
          </div>
          <Button
            variant="secondary"
            className={cn(
              "hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary/30 focus-visible:text-foreground focus-visible:ring-0 py-4.5 px-6 ml-0.5",
              view === "review" && "bg-primary text-primary-foreground",
            )}
            size="xl"
            aria-pressed={view === "review"}
            onClick={() => onViewChange("review")}
          >
            <Check aria-hidden />
            {strings.review}
          </Button>
        </nav>
      </footer>
    </div>
  );
}
