import { useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { AccessibilityCard } from "@/features/accessibility/components/AccessibilityCard";
import { getUnreadNotificationCount } from "@/api/notifications";
import { KeyHints, PAGE_KEYS_SLOT } from "@/lib/a11y/PageKeys";
import { useArrowKeyNavigation } from "@/lib/a11y/useArrowKeyNavigation";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import { useAuthStore } from "@/features/auth/store/authStore";

const navItems = [
  { to: "/home", label: vi.app.nav.home },
  { to: "/practice", label: vi.app.nav.practice },
  { to: "/assistant", label: vi.app.nav.assistant },
  { to: "/progress", label: vi.app.nav.progress },
  { to: "/schedule", label: vi.app.nav.schedule },
  { to: "/results", label: vi.app.nav.results },
  { to: "/notifications", label: vi.app.nav.notifications },
  { to: "/settings/accessibility", label: vi.app.nav.settings },
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

  // Signing out returns to the public home page. Leave the student area first and
  // sign out once that page is showing: signing out while a student page is still
  // mounted would let the sign-in guard send the student to the sign-in page instead.
  const signOut = useCallback(() => {
    void Promise.resolve(navigate("/", { replace: true, flushSync: true })).then(logout);
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
      <header role="banner" className="border-b-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 md:px-8">
          <Link to="/home" className="text-3xl font-extrabold tracking-tight">
            {vi.app.name}
          </Link>
          <div className="ms-auto flex flex-wrap items-center gap-3">
            {user ? <p className="text-lg font-bold">{user.fullName}</p> : null}
            <button
              type="button"
              onClick={signOut}
              className="min-h-12 rounded-md border-2 border-foreground px-4 text-lg font-bold hover:bg-foreground hover:text-background"
            >
              {vi.common.logout}
            </button>
            <AccessibilityCard />
          </div>
        </div>
        {/* The page that is open is marked by a thick bar under its name, not by colour alone. */}
        <nav aria-label={vi.app.name} className="border-t-2 border-border">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-x-1 px-2 sm:px-4 md:px-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-h-14 items-center gap-2 px-3 text-lg font-bold underline-offset-8 hover:underline",
                    isActive && "after:absolute after:inset-x-3 after:bottom-0 after:h-1.5 after:rounded-t after:bg-foreground",
                  )
                }
              >
                {item.label}
                {item.to === "/notifications" && unreadCount > 0 ? (
                  <span className="rounded-full border-2 border-foreground px-2 text-base font-extrabold">
                    <span aria-hidden>{unreadCount > 99 ? "99+" : unreadCount}</span>
                    <span className="sr-only">{vi.notifications.navUnread(unreadCount)}</span>
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 md:px-8">
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
