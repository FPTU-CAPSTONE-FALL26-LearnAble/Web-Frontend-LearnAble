import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ExamDemoRoute } from "./ExamDemoRoute";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

function renderExamDemo() {
  return render(
    <MemoryRouter>
      <ExamDemoRoute />
    </MemoryRouter>,
  );
}

describe("ExamDemoRoute", () => {
  beforeEach(() => {
    window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
      onvoiceschanged: null,
      paused: false,
      pending: false,
      speaking: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as SpeechSynthesis;
  });

  it("renders exam header, timer, student info, and current question", () => {
    renderExamDemo();

    expect(screen.getByText(/Kiosk Lockdown Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Môn: SWE301c/i)).toBeInTheDocument();
    expect(screen.getByText(/Thí sinh: SE180291/i)).toBeInTheDocument();
    expect(screen.getByText(/CÂU HỎI 05 \/ 20/i)).toBeInTheDocument();
    expect(screen.getByText(/Thời gian còn lại/i)).toBeInTheDocument();
  });

  it("selects an option when clicked", async () => {
    const user = userEvent.setup();
    renderExamDemo();

    const option1 = screen.getByRole("radio", {
      name: /Báo cáo tiến độ chi tiết từng giờ làm việc/i,
    });
    expect(option1).toHaveAttribute("aria-checked", "false");

    await user.click(option1);

    expect(option1).toHaveAttribute("aria-checked", "true");
  });

  it("navigates questions using Next and Previous buttons", async () => {
    const user = userEvent.setup();
    renderExamDemo();

    expect(screen.getByText(/CÂU HỎI 05 \/ 20/i)).toBeInTheDocument();

    const nextButton = screen.getByRole("button", {
      name: /Chuyển sang câu tiếp theo/i,
    });
    await user.click(nextButton);

    expect(screen.getByText(/CÂU HỎI 06 \/ 20/i)).toBeInTheDocument();

    const prevButton = screen.getByRole("button", {
      name: /Quay lại câu hỏi trước/i,
    });
    await user.click(prevButton);

    expect(screen.getByText(/CÂU HỎI 05 \/ 20/i)).toBeInTheDocument();
  });

  it("flags and unflags a question", async () => {
    const user = userEvent.setup();
    renderExamDemo();

    const flagButton = screen.getByRole("button", {
      name: /Đánh dấu xem lại câu hỏi này/i,
    });
    await user.click(flagButton);

    expect(
      screen.getByRole("button", {
        name: /Đánh dấu xem lại câu hỏi này/i,
      }),
    ).toHaveTextContent("Đã đánh dấu (F)");
  });

  it("navigates via question matrix grid", async () => {
    const user = userEvent.setup();
    renderExamDemo();

    const q1Button = screen.getByRole("button", { name: /^Câu 1:/i });
    await user.click(q1Button);

    expect(screen.getByText(/CÂU HỎI 01 \/ 20/i)).toBeInTheDocument();
  });

  it("opens terminology modal and explains key term", async () => {
    const user = userEvent.setup();
    renderExamDemo();

    const explainButton = screen.getByRole("button", {
      name: /Giải nghĩa thuật ngữ chuyên ngành/i,
    });
    await user.click(explainButton);

    expect(
      screen.getByText(/Giải nghĩa thuật ngữ chuyên ngành/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Daily Standup \(Scrum Meeting\):/i),
    ).toBeInTheDocument();
  });

  it("opens supervisor help modal and allows dismissing", async () => {
    const user = userEvent.setup();
    renderExamDemo();

    const helpButton = screen.getByRole("button", {
      name: /Báo sự cố cho giám thị phòng thi/i,
    });
    await user.click(helpButton);

    expect(
      screen.getByText(/Báo sự cố cho Giám thị phòng thi/i),
    ).toBeInTheDocument();

    const dismissBtn = screen.getByRole("button", {
      name: /Đã hiểu & Đóng/i,
    });
    await user.click(dismissBtn);

    expect(
      screen.queryByText(/Báo sự cố cho Giám thị phòng thi/i),
    ).not.toBeInTheDocument();
  });

  it("opens submission confirmation modal", async () => {
    const user = userEvent.setup();
    renderExamDemo();

    const submitButton = screen.getByRole("button", {
      name: /Nộp bài thi chính thức/i,
    });
    await user.click(submitButton);

    expect(
      screen.getByRole("heading", { name: /Xác nhận nộp bài thi/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Tiếp tục làm bài/i }),
    ).toBeInTheDocument();
  });

  it("passes axe accessibility checks without violations", async () => {
    const { container } = renderExamDemo();
    await expectNoAxeViolations(container);
  });
});
