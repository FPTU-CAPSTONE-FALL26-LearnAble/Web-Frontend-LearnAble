import { create } from "zustand";

export type StepStatus = "pending" | "running" | "done" | "failed";
export type OperationStep = { label: string; status: StepStatus };

type OperationState = {
  /** A tracker is on screen. */
  open: boolean;
  title: string;
  steps: OperationStep[];
  phase: "running" | "done" | "failed";
  /** What the last step ended with: the result, or the reason it failed. */
  message: string;
  minimized: boolean;
  toggle: () => void;
  close: () => void;
};

export const useOperationProgress = create<OperationState>()((set) => ({
  open: false,
  title: "",
  steps: [],
  phase: "running",
  message: "",
  minimized: false,
  toggle: () => set((state) => ({ minimized: !state.minimized })),
  close: () => set({ open: false }),
}));

const update = (patch: Partial<OperationState>) => useOperationProgress.setState(patch);

/**
 * Drives the floating progress tracker from anywhere. The tracker lives in the examiner layout,
 * so it keeps showing while the examiner moves to the next step.
 */
export const operation = {
  /** Opens the tracker with the first step running. */
  start(title: string, labels: string[]) {
    update({
      open: true,
      title,
      phase: "running",
      message: "",
      minimized: false,
      steps: labels.map((label, index) => ({ label, status: index === 0 ? "running" : "pending" })),
    });
  },
  /** Marks every step before `index` as done and `index` as running. */
  step(index: number) {
    const { steps } = useOperationProgress.getState();
    update({ steps: steps.map((item, position) => ({ ...item, status: position < index ? "done" : position === index ? "running" : "pending" })) });
  },
  finish(message = "") {
    const { steps } = useOperationProgress.getState();
    update({ phase: "done", message, steps: steps.map((item) => ({ ...item, status: "done" })) });
  },
  fail(message: string) {
    const { steps } = useOperationProgress.getState();
    let failedAt = steps.findIndex((item) => item.status === "running");
    if (failedAt < 0) failedAt = 0;
    update({
      phase: "failed",
      message,
      minimized: false,
      steps: steps.map((item, position) => ({ ...item, status: position === failedAt ? "failed" : item.status === "running" ? "pending" : item.status })),
    });
  },
};
