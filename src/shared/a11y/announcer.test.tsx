import { describe, expect, it, vi as vitestMock } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { LiveRegion } from "@/shared/a11y/LiveRegion";
import { announce } from "@/shared/a11y/announcer";

// jsdom không có requestAnimationFrame ổn định — thay bằng chạy ngay
vitestMock.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
});

describe("announcer", () => {
  it("ghi thông điệp vào node polite", async () => {
    const { container } = render(<LiveRegion />);
    announce("Đã lưu");
    await waitFor(() => {
      expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent("Đã lưu");
    });
  });

  it("assertive đi vào node assertive", async () => {
    const { container } = render(<LiveRegion />);
    announce("Mất kết nối", { assertive: true });
    await waitFor(() => {
      expect(container.querySelector('[aria-live="assertive"]')).toHaveTextContent("Mất kết nối");
    });
  });
});
