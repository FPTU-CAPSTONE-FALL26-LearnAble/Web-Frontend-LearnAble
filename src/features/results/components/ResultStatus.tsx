import { CircleCheck, CircleHelp, Clock } from "lucide-react";
import { vi } from "@/shared/strings/vi";

export type ResultState = "graded" | "pending" | "notReleased";

const icons: Record<ResultState, typeof CircleCheck> = {
  graded: CircleCheck,
  pending: CircleHelp,
  notReleased: Clock,
};

/** State is an icon plus words in a bordered tag, never colour alone (§8.1). */
export function ResultStatus({ status }: { status: ResultState }) {
  const Icon = icons[status];
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-md border-2 border-foreground px-3 py-1 text-base font-extrabold tracking-wide uppercase">
      <Icon aria-hidden className="size-5" strokeWidth={2.5} />
      {vi.results.state[status]}
    </span>
  );
}
