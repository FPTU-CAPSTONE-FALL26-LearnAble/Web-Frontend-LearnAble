import { useEffect } from "react";
import { announce } from "@/shared/a11y/announcer";

/** Focus owns screen entry speech. Announce only when no heading is available. */
export function useRouteAnnouncer(documentTitle: string, headingText: string): void {
  useEffect(() => {
    document.title = documentTitle;
    const h1 = document.querySelector("main h1");
    if (h1 instanceof HTMLElement) {
      if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: false });
    } else {
      announce(headingText);
    }
  }, [documentTitle, headingText]);
}
