import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LimitedMarkdown, parseBlocks } from "../LimitedMarkdown";

describe("LimitedMarkdown", () => {
  it("splits paragraphs, lists and fenced code", () => {
    expect(parseBlocks("One\ntwo\n\n- a\n- b\n\n1. x\n\n```\nint x;\n```")).toEqual([
      { type: "paragraph", text: "One two" },
      { type: "list", ordered: false, items: ["a", "b"] },
      { type: "list", ordered: true, items: ["x"] },
      { type: "code", text: "int x;" },
    ]);
  });

  it("renders real list, code and emphasis elements and never raw HTML", () => {
    const { container } = render(
      <LimitedMarkdown source={"Use `scanf` and **check** *carefully* <b>bold</b>\n\n- first"} />,
    );
    expect(screen.getByText("scanf").tagName).toBe("CODE");
    expect(screen.getByText("check").tagName).toBe("STRONG");
    expect(screen.getByText("carefully").tagName).toBe("EM");
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
    expect(container).toHaveTextContent("<b>bold</b>");
  });
});
