import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useOutletContext } from "react-router";
import { getUnreadNotificationCount } from "@/api/notifications";
import { PageKeys } from "@/lib/a11y/PageKeys";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { vi } from "@/shared/strings/vi";
import { cn } from "@/shared/ui/cn";

const t = vi.home;

type ItemId = keyof typeof t.items;
/** The number is the item's single-key shortcut. Sign out sits apart, on 9, so it is not pressed by mistake. */
const ITEMS: { id: ItemId; key: string; to: string | null }[] = [
  { id: "practice", key: "1", to: "/practice" },
  { id: "assistant", key: "2", to: "/assistant" },
  { id: "progress", key: "3", to: "/progress" },
  { id: "schedule", key: "4", to: "/schedule" },
  { id: "results", key: "5", to: "/results" },
  { id: "notifications", key: "6", to: "/notifications" },
  { id: "settings", key: "7", to: "/settings/accessibility" },
  { id: "signOut", key: "9", to: null },
];

/** Remembers the item a student left from, so "back to menu" lands on it again. */
const LAST_ITEM = "learnable.home.lastItem";
function lastIndex() {
  try {
    const index = ITEMS.findIndex((item) => item.id === sessionStorage.getItem(LAST_ITEM));
    return index < 0 ? 0 : index;
  } catch {
    return 0;
  }
}
function remember(id: ItemId) {
  try {
    sessionStorage.setItem(LAST_ITEM, id);
  } catch {
    // Without storage the menu simply opens on its first item.
  }
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

export type StudentShellContext = { signOut: () => void };

/**
 * The student's start page: every destination as one numbered list.
 *
 * It is a `role="menu"` with a roving tab stop — one Tab reaches the list,
 * arrows move inside it and wrap, Home/End jump to the ends, and the number
 * shown on an item opens it from anywhere on the page.
 */
export function StudentHomeRoute() {
  useRouteAnnouncer(t.pageTitle, t.title);
  const navigate = useNavigate();
  const { signOut } = useOutletContext<StudentShellContext>();
  const unread = useQuery({
    queryKey: ["my-notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    staleTime: 30_000,
  });
  const unreadCount = unread.data?.unreadCount ?? 0;

  const [active, setActive] = useState(lastIndex);
  const [focused, setFocused] = useState(false);
  /** The item under the pointer, highlighted the same way as the focused one. */
  const [hovered, setHovered] = useState<number | null>(null);
  const items = useRef<(HTMLElement | null)[]>([]);

  // Arriving on the menu puts the keyboard on the item the student left from.
  useEffect(() => {
    items.current[lastIndex()]?.focus();
  }, []);

  const open = (index: number) => {
    const item = ITEMS[index];
    remember(item.id);
    if (item.to) navigate(item.to);
    else signOut();
  };

  // Number keys work from anywhere on the page, but never while typing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const index = ITEMS.findIndex((item) => item.key === event.key);
      if (index < 0) return;
      event.preventDefault();
      const item = ITEMS[index];
      remember(item.id);
      if (item.to) navigate(item.to);
      else signOut();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, signOut]);

  const move = (event: React.KeyboardEvent) => {
    const last = ITEMS.length - 1;
    const next =
      event.key === "ArrowDown"
        ? active === last
          ? 0
          : active + 1
        : event.key === "ArrowUp"
          ? active === 0
            ? last
            : active - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    items.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-6 text-lg">
      <header>
        <h1 id="home-menu-title" tabIndex={-1} className="text-3xl font-bold">
          {t.title}
        </h1>
        <p id="home-menu-hint" className="mt-2">
          {t.hint(ITEMS.length)}
        </p>
      </header>

      <div
        role="menu"
        // Focus lives on the items (roving tab stop); the container is never a stop itself.
        tabIndex={-1}
        aria-labelledby="home-menu-title"
        aria-describedby="home-menu-hint"
        aria-orientation="vertical"
        className="flex flex-col gap-3"
        onKeyDown={move}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {ITEMS.map((item, index) => {
          const copy = t.items[item.id];
          const current = index === active;
          // Wherever the student is — keyboard focus or pointer — that item stands out.
          const highlighted = (current && focused) || hovered === index;
          const showUnread = item.id === "notifications" && unreadCount > 0;
          const className = cn(
            "flex min-h-16 w-full items-center gap-4 rounded-xl border-4 p-4 text-start",
            "focus:outline-4 focus:outline-offset-2 focus:outline-ring",
            highlighted ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card",
          );
          const content = (
            <>
              <kbd
                aria-hidden
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-md font-mono text-xl font-bold",
                  highlighted ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {item.key}
              </kbd>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-xl font-bold">{copy.label}</span>
                <span className="text-muted-foreground">
                  {showUnread ? `${t.unread(unreadCount)} · ` : null}
                  {copy.description}
                </span>
              </span>
              {showUnread ? (
                <span aria-hidden className="rounded-md bg-success px-2 py-1 text-base font-bold text-success-foreground uppercase">
                  {t.newBadge}
                </span>
              ) : null}
              {current && focused ? (
                <span aria-hidden className="text-base font-bold tracking-wide uppercase">
                  {t.focus(index + 1, ITEMS.length)}
                </span>
              ) : null}
            </>
          );
          const shared = {
            role: "menuitem",
            tabIndex: current ? 0 : -1,
            "aria-keyshortcuts": item.key,
            className,
            "data-highlighted": highlighted ? "" : undefined,
            onFocus: () => setActive(index),
            onMouseEnter: () => setHovered(index),
            onMouseLeave: () => setHovered(null),
            ref: (node: HTMLElement | null) => {
              items.current[index] = node;
            },
          } as const;
          return item.to ? (
            <Link key={item.id} to={item.to} onClick={() => remember(item.id)} {...shared}>
              {content}
            </Link>
          ) : (
            <button key={item.id} type="button" onClick={() => open(index)} {...shared}>
              {content}
            </button>
          );
        })}
      </div>

<PageKeys
        keys={[
          ["↑ ↓", t.keys.move],
          ["Enter", t.keys.open],
          ["1–9", t.keys.jump],
        ]}
      />
    </div>
  );
}
