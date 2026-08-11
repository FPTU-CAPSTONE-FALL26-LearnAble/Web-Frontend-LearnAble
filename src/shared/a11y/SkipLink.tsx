import { vi } from "@/shared/strings/vi";

/**
 * Node focus được ĐẦU TIÊN của mọi trang. Ẩn cho tới khi nhận focus.
 * Đích là <main id="main"> — mọi layout phải có.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:block focus:bg-[var(--color-primary)] focus:text-[var(--color-primary-text)] focus:px-4 focus:py-3 focus:rounded-[var(--radius)]"
    >
      {vi.app.skipToMain}
    </a>
  );
}
