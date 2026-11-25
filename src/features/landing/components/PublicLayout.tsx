import { ArrowRight } from "lucide-react";
import { Link, NavLink, Outlet, ScrollRestoration } from "react-router";
import { BrandIdentity } from "@/components/BrandIdentity";
import { AccessibilityCard } from "@/features/accessibility/components/AccessibilityCard";
import { normalizeSupportedRole } from "@/features/auth/roleRouting";
import { useAuthStore } from "@/features/auth/store/authStore";
import { publicPages, site } from "@/features/landing/content";
import { cta } from "@/features/landing/components/publicStyles";
import { GUEST, useDisplayPreferenceScope } from "@/lib/a11y/displayPreferences";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { cn } from "@/shared/ui/cn";

/**
 * The frame of every public page: brand, sign-in, the Accessibility card and
 * one navigation bar that names each page. Visitors set the text size and
 * colours before signing in: a guest's choice stays in this browser, while a
 * signed-in student sees and edits their account's own.
 */
export function PublicLayout() {
  const user = useAuthStore((state) => state.user);
  const studentId = normalizeSupportedRole(user?.role) === "student" ? (user?.id ?? null) : null;
  useDisplayPreferenceScope(studentId ?? GUEST);

  return (
    <>
      {/* A new page starts at its top, not where the last one was scrolled to. */}
      <ScrollRestoration />
      <SkipLink />
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="border-b-4 border-foreground bg-background">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-5 sm:px-6 md:px-8">
            <Link to="/" aria-label={site.homeLabel} className="shrink-0">
              <BrandIdentity prominent />
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/student/login" className={cn(cta.base, cta.primary)}>
                {site.signIn} <ArrowRight aria-hidden className="size-6" strokeWidth={3} />
              </Link>
              <AccessibilityCard />
            </div>
          </div>
          <nav aria-label={site.navLabel} className="border-t-2 border-border">
            <ul className="mx-auto flex max-w-7xl flex-wrap gap-x-2 px-2 sm:px-4 md:px-6">
              {publicPages.map((page) => (
                <li key={page.to}>
                  <NavLink
                    to={page.to}
                    end={"end" in page}
                    className={({ isActive }) =>
                      cn(
                        "relative flex min-h-14 items-center px-3 text-xl font-extrabold underline-offset-8 hover:underline",
                        // The current page is marked by a thick bar, not by colour.
                        isActive && "after:absolute after:inset-x-3 after:bottom-0 after:h-1.5 after:bg-foreground",
                      )
                    }
                  >
                    {page.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main id="main" className="flex-1">
          <Outlet />
        </main>

        <footer className="bg-foreground py-10 text-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-start md:justify-between md:px-8">
            <div className="flex flex-col gap-2">
              <p className="text-3xl font-extrabold tracking-tight">{site.name}</p>
              <p className="max-w-md text-lg">{site.tagline}</p>
            </div>
            <nav aria-label={site.footerNavLabel}>
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {publicPages.map((page) => (
                  <li key={page.to}>
                    <Link
                      to={page.to}
                      className="inline-flex min-h-11 items-center text-lg font-bold underline decoration-2 underline-offset-4 hover:decoration-4"
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
