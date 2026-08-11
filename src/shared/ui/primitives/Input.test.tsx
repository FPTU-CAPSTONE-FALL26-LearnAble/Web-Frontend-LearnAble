import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "@/shared/ui/primitives/Input";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

describe("Input", () => {
  it("nối lỗi qua aria-describedby và aria-invalid", () => {
    render(<Input label="Email" error="Email không hợp lệ" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const errorId = input.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId!)).toHaveTextContent("Email không hợp lệ");
  });

  it("axe-core sạch (có lỗi hiển thị)", async () => {
    const { container } = render(
      <Input label="Mật khẩu" hint="Tối thiểu 8 ký tự" error="Nhập mật khẩu" />,
    );
    await expectNoAxeViolations(container);
  });
});
