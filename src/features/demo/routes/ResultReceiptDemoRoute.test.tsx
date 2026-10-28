import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ResultReceiptDemoRoute } from "./ResultReceiptDemoRoute";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

function renderResultDemo() {
  return render(
    <MemoryRouter>
      <ResultReceiptDemoRoute />
    </MemoryRouter>,
  );
}

describe("ResultReceiptDemoRoute", () => {
  const writeTextMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeTextMock.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });
  });

  it("renders the confirmation title and candidate details", () => {
    renderResultDemo();

    expect(
      screen.getByText("Bài thi đã được nộp thành công"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/SWE201 – Kiến Trúc Phần Mềm/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Lê Nguyễn Nam Kha/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/SE180291/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/FPTU-EXAM-902/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("20 / 20 câu")).toBeInTheDocument();
  });

  it("renders voice narration and print controls", () => {
    renderResultDemo();

    expect(
      screen.getByRole("button", {
        name: /Phát âm thanh đọc toàn bộ biên nhận/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /In \/ Lưu biên lai điện tử/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Đăng xuất an toàn/i }),
    ).toBeInTheDocument();
  });

  it("copies the SHA-256 hash when clicking copy button", async () => {
    renderResultDemo();

    const copyBtn = screen.getByRole("button", { name: /Sao chép mã/i });
    copyBtn.click();

    expect(writeTextMock).toHaveBeenCalledWith(
      "FPT-EXAM-SWE201-984A-21C0-8D3E-SHA256",
    );
  });

  it("passes axe-core accessibility checks with no violations", async () => {
    const view = renderResultDemo();
    await expectNoAxeViolations(view.container);
  });
});
