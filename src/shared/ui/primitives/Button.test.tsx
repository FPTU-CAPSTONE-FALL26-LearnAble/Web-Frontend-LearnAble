import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/shared/ui/primitives/Button";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";

describe("Button", () => {
  it("mặc định type=button để không tự submit form", () => {
    render(<Button>Lưu</Button>);
    expect(screen.getByRole("button", { name: "Lưu" })).toHaveAttribute("type", "button");
  });

  it("axe-core sạch", async () => {
    const { container } = render(<Button>Đăng nhập</Button>);
    await expectNoAxeViolations(container);
  });
});
