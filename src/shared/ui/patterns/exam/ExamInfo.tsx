import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";

export interface ExamInfoProps {
  /** e.g. "PRO192 - Final Exam". */
  name: string;
  /** The exam's identifier, e.g. "07342". */
  id: string;
  /**
   * Image issued by the exam server so candidates can confirm the exam is
   * genuine. Until it arrives, a neutral placeholder keeps the layout steady.
   */
  image?: { src: string; alt?: string };
  className?: string;
}

/** Exam identity in the player header: server-issued image, exam name and ID. */
export function ExamInfo({ name, id, image, className }: ExamInfoProps) {
  const strings = vi.exam.info;
  return (
    <div className={cn("flex min-w-0 items-center gap-4", className)}>
      {image ? (
        <img
          src={image.src}
          alt={image.alt ?? strings.imageAlt(name)}
          className="h-12 w-20 shrink-0 object-cover"
        />
      ) : (
        <div aria-hidden className="h-12 w-20 shrink-0 bg-muted" />
      )}
      <div className="flex min-w-0 flex-col *:leading-tight">
        <p className="truncate text-base font-semibold text-foreground">
          {name}
        </p>
        <p className="text-base text-muted-foreground">
          <span className="sr-only">{strings.idLabel} </span>
          {id}
        </p>
      </div>
    </div>
  );
}
