import { useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router";
import { getUnreadNotificationCount } from "@/api/notifications";
import { KeyHints, PAGE_KEYS_SLOT } from "@/lib/a11y/PageKeys";
import { useArrowKeyNavigation } from "@/lib/a11y/useArrowKeyNavigation";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import { useAuthStore } from "@/features/auth/store/authStore";

const navItems = [
  { to: "/home", label: vi.home.nav },
  { to: "/practice", label: vi.practice.title },
  { to: "/assistant", label: vi.assistant.title },
  { to: "/progress", label: vi.progress.title },
  { to: "/schedule", label: vi.schedule.title },
  { to: "/results", label: vi.results.title },
  { to: "/notifications", label: vi.notifications.title },
  { to: "/settings/accessibility", label: vi.a11ySettings.title },
];

/** Layout chung (trừ màn làm bài — màn đó full-screen qua ExamShell). */
export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const unread = useQuery({
    queryKey: ["my-notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    staleTime: 30_000,
  });
  const unreadCount = unread.data?.unreadCount ?? 0;
  // ↑ ↓ travel the controls of whichever page is open.
  useArrowKeyNavigation("main");

  const signOut = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  // Alt+H returns to the main menu from any student page.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.code !== "KeyH" && event.key.toLowerCase() !== "h") return;
      event.preventDefault();
      navigate("/home");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header role="banner" className="border-b-2 border-border px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-lg font-bold">{vi.app.name}</p>
          <nav aria-label={vi.app.name} className="flex flex-wrap gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-11 items-center gap-2 rounded-md px-3 font-medium hover:bg-accent",
                    isActive && "bg-accent text-accent-foreground",
                  )
                }
              >
                {item.label}
                {item.to === "/notifications" && unreadCount > 0 ? (
                  <span className="rounded-full border-2 border-foreground px-2 text-sm font-bold">
                    <span aria-hidden>{unreadCount > 99 ? "99+" : unreadCount}</span>
                    <span className="sr-only">{vi.notifications.navUnread(unreadCount)}</span>
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-3">
            {user ? <p className="text-muted-foreground">{user.fullName}</p> : null}
            <Button variant="ghost" onClick={signOut}>
              {vi.common.logout}
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 p-6">
        <Outlet context={{ signOut }} />
      </main>
      {/* Always in view. Page keys and keys that work everywhere are separate, labelled groups. */}
      <footer
        role="contentinfo"
        className="sticky bottom-0 flex flex-wrap items-center gap-x-8 gap-y-2 border-t-2 border-border bg-background px-6 py-3"
      >
        <p className="font-bold">{vi.app.name}</p>
        <div
          role="group"
          aria-label={vi.app.keys.barLabel}
          className="ms-auto grid gap-x-8 gap-y-2 sm:grid-cols-[auto_auto]"
        >
          <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 has-[kbd]:flex">
            <p className="font-semibold text-muted-foreground">{vi.app.keys.page}:</p>
            <div id={PAGE_KEYS_SLOT} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:border-s-2 sm:border-border sm:ps-8">
            <p className="font-semibold text-muted-foreground">{vi.app.keys.everywhere}:</p>
            <KeyHints
              keys={[
                ["↑ ↓", vi.app.keys.moveControls],
                [vi.app.keys.backToMenuKey, vi.app.keys.backToMenu],
              ]}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
