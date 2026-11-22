import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { ComponentDemoRoute } from "./ComponentDemoRoute"
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations"

describe("ComponentDemoRoute", () => {
  function renderDemo() {
    return render(
      <MemoryRouter>
        <ComponentDemoRoute />
      </MemoryRouter>
    )
  }

  it("renders the component showcase headings and sections", () => {
    renderDemo()
    expect(
      screen.getByRole("heading", { name: /LearnAble Component Showcase/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /1\. Buttons & Actions/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /2\. Form Controls & Inputs/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /3\. Data Display & Status Badges/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /4\. Alerts & Notifications/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /5\. Overlays, Dialogs & Sheets/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /6\. Semantic Table/i })
    ).toBeInTheDocument()
  })

  it("renders key interactive buttons and triggers", () => {
    renderDemo()
    expect(
      screen.getByRole("button", { name: /Primary Action/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Open Standard Dialog/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Open Confirm Alert Dialog/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Open Side Sheet/i })
    ).toBeInTheDocument()
  })

  it("passes axe-core accessibility checks with no violations", async () => {
    const view = renderDemo()
    await expectNoAxeViolations(view.container)
  })
})
