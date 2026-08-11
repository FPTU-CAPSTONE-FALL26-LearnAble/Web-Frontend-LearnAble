import { useEffect } from "react";
import { announce } from "@/shared/a11y/announcer";

/**
 * Đổi route là "im lặng" với screen reader — mỗi screen component gọi hook này
 * khi mount: đặt document.title, announce tiêu đề, và dời focus vào <h1>.
 *
 * <h1> phải có tabIndex={-1} (các screen dùng qua headingRef của hook không cần
 * nhớ điều đó — hook tự đặt).
 */
export function useRouteAnnouncer(documentTitle: string, headingText: string): void {
  useEffect(() => {
    document.title = documentTitle;
    announce(headingText);
    const h1 = document.querySelector("main h1");
    if (h1 instanceof HTMLElement) {
      if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: false });
    }
  }, [documentTitle, headingText]);
}
