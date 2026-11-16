import type { AssistantConversation } from "@/api/learningAssistant";
import { vi } from "@/shared/strings/vi";

/** 44×44 CSS-pixel target for every control on this student surface. */
export const TARGET = "min-h-11 min-w-11";

export const FIELD =
  "min-h-11 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-base text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring";

export type TextSize = "normal" | "large" | "xlarge";
/** Reading size of questions and answers; low-vision students pick what they can read. */
export const TEXT_SIZE: Record<TextSize, string> = {
  normal: "text-lg",
  large: "text-2xl",
  xlarge: "text-3xl",
};

export type AssistantCourse = { courseId: string; name: string };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
export const formatActivity = (iso: string) => dateFormat.format(new Date(iso));

export const courseNameOf = (
  conversation: AssistantConversation,
  courses: AssistantCourse[],
): string | null =>
  conversation.courseName ??
  courses.find((course) => course.courseId === conversation.courseId)?.name ??
  null;

export const conversationTitle = (
  conversation: AssistantConversation,
  courses: AssistantCourse[],
): string =>
  conversation.title ?? courseNameOf(conversation, courses) ?? vi.assistant.untitledConversation;
