import { QuestionFrame, type QuestionFrameProps } from "./QuestionFrame";
export function CompositeQuestion({ children, ...props }: Omit<QuestionFrameProps, "children"> & { children: React.ReactNode }) { return <QuestionFrame {...props}><div className="space-y-6">{children}</div></QuestionFrame>; }
