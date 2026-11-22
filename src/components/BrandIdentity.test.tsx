import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandIdentity } from "./BrandIdentity";

describe("BrandIdentity", () => {
  it("renders the LearnAble identity with a dynamic role", () => {
    render(<BrandIdentity lecturer roleLabel="Examiner" />);

    expect(
      screen.getByAltText("LearnAble — Accessible learning"),
    ).toHaveAttribute("src", "/assets/brand/learnable-logo.png");
    expect(screen.getByText("Examiner")).toBeInTheDocument();
  });

  it("renders the authentication identity without the FPT logo", () => {
    render(<BrandIdentity />);
    expect(
      screen.getByAltText("LearnAble — Accessible learning"),
    ).toBeInTheDocument();
    expect(screen.queryByAltText("FPT University")).not.toBeInTheDocument();
  });
});
