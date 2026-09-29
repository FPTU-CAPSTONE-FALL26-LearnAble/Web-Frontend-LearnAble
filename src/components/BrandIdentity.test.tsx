import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandIdentity } from "./BrandIdentity";

describe("BrandIdentity", () => {
  it("renders the complete Lecturer lockup with a dynamic role", () => {
    render(<BrandIdentity lecturer roleLabel="Examiner" />);

    const logo = screen.getByAltText("FPT University");
    expect(logo).toHaveClass("object-contain");
    expect(screen.getByText("LearnAble")).toHaveClass("text-primary");
    expect(
      screen.getByText("LearnAble").parentElement?.previousElementSibling,
    ).toHaveClass("h-10", "w-px", "bg-foreground");
    expect(screen.getByText("LearnAble").parentElement).not.toHaveClass(
      "bg-foreground",
    );
    expect(screen.getByText("Examiner")).toBeInTheDocument();
  });

  it("keeps the authentication identity unchanged", () => {
    render(<BrandIdentity />);
    expect(screen.getByText("Accessible learning")).toBeInTheDocument();
    expect(
      screen.getByText("LearnAble").parentElement?.previousElementSibling,
    ).toHaveClass("h-12", "w-[2px]", "bg-foreground");
  });
});
