import { NavLink, Outlet, useNavigate } from "react-router";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/cn";
import { vi } from "@/shared/strings/vi";
import { useAuthStore } from "@/features/auth/store/authStore";

const navItems = [
  { to: "/practice", label: vi.practice.title },
  { to: "/assistant", label: vi.assistant.title },
  { to: "/progress", label: vi.progress.title },
  { to: "/results", label: vi.results.title },
  { to: "/settings/accessibility", label: vi.a11ySettings.title },
];

/** Layout chung (trừ màn làm bài — màn đó full-screen qua ExamShell). */
export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header role="banner" className="border-b-2 border-[var(--color-border)] px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-[length:var(--text-lg)] font-bold">{vi.app.name}</p>
          <nav aria-label={vi.app.name} className="flex flex-wrap gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-[var(--target-min)] items-center rounded-[var(--radius)] px-3 font-medium hover:bg-[var(--color-surface)]",
                    isActive && "bg-[var(--color-selected-bg)] text-[var(--color-selected-text)]",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-3">
            {user ? <p className="text-[var(--color-text-muted)]">{user.fullName}</p> : null}
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              {vi.common.logout}
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 p-6">
        <Outlet />
      </main>
      <footer role="contentinfo" className="border-t-2 border-[var(--color-border)] px-6 py-3 text-[var(--color-text-muted)]">
        {vi.app.name}
      </footer>
    </div>
  );
}
