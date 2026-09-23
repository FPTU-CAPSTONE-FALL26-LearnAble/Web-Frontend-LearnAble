---
name: learnable-design-system
description: "Design and build accessible, evidence-led learning, examination, and academic workbench interfaces for LearnAble. Use for student practice, desktop examination, authentication, lecturer, and examiner surfaces."
---

Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components.

## Tokens — Colors

### Semantic Color Tokens

| Name                           | Primitive (Light / Dark)                              | Token                          | Role                                                                                                                          |
| :----------------------------- | :---------------------------------------------------- | :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **Background**                 | `var(--color-white)` / `var(--color-slate-950)`       | `--background`                 | Root page canvas providing the baseline high-contrast surface (≥ 7:1 contrast against foreground text).                       |
| **Foreground**                 | `var(--color-slate-950)` / `var(--color-slate-50)`    | `--foreground`                 | Primary body text and heading ink; ensures absolute legibility and ink density across primary canvases.                       |
| **Card Surface**               | `var(--color-white)` / `var(--color-slate-900)`       | `--card`                       | Elevated container surface for exam questions, academic tables, summary panels, and modular dialogs.                          |
| **Card Foreground**            | `var(--color-slate-950)` / `var(--color-slate-50)`    | `--card-foreground`            | Primary text, titles, and icons housed within card containers.                                                                |
| **Popover Surface**            | `var(--color-white)` / `var(--color-slate-900)`       | `--popover`                    | Surface background for overlay dialogs, dropdown menus, context menus, and tooltips.                                          |
| **Popover Foreground**         | `var(--color-slate-950)` / `var(--color-slate-50)`    | `--popover-foreground`         | High-contrast text and interactive items inside floating popovers and dropdowns.                                              |
| **Primary Action**             | `var(--color-brand-500)` / `var(--color-brand-600)`   | `--primary`                    | Core brand color (FPT Orange), primary action buttons (Submit, Save, Confirm), active indicators, and high-priority controls. |
| **Primary Foreground**         | `var(--color-white)` / `var(--color-brand-50)`        | `--primary-foreground`         | Text and icons rendered on top of primary filled buttons (guaranteeing ≥ 7:1 contrast).                                       |
| **Primary Hover**              | `var(--color-brand-600)` / `var(--color-brand-600)`   | `--primary-hover`              | Interactive hover and active pressed state feedback for primary buttons and CTAs.                                             |
| **Secondary Surface**          | `var(--color-slate-100)` / `var(--color-slate-800)`   | `--secondary`                  | Nested secondary surface when element is housed inside a card/popover; secondary button fills and tag chips.                  |
| **Secondary Foreground**       | `var(--color-slate-800)` / `var(--color-slate-50)`    | `--secondary-foreground`       | High-contrast typography and icons for secondary buttons and nested container labels.                                         |
| **Muted Surface**              | `var(--color-slate-200)` / `var(--color-slate-800)`   | `--muted`                      | Muted background when element rests directly on root canvas, disabled controls, track bars, and subtle tags.                  |
| **Muted Foreground**           | `var(--color-slate-600)` / `var(--color-slate-400)`   | `--muted-foreground`           | Secondary copy, timestamps, captions, helper text, and inactive icons (maintaining ≥ 4.5:1 contrast).                         |
| **Accent Surface**             | `var(--color-slate-100)` / `var(--color-slate-800)`   | `--accent`                     | Subtle highlight surface for hovered list items, selectable options, tab backgrounds, and active pill states.                 |
| **Accent Foreground**          | `var(--color-slate-900)` / `var(--color-slate-50)`    | `--accent-foreground`          | Text rendered on top of accent-highlighted surfaces.                                                                          |
| **Border**                     | `var(--color-slate-300)` / `var(--color-slate-800)`   | `--border`                     | Structural 1px boundary lines, card outlines, table borders, and divider rules (≥ 4.5:1 non-text contrast).                   |
| **Input Border**               | `var(--color-slate-200)` / `var(--color-slate-800)`   | `--input`                      | Default perimeter border stroke for inputs, textareas, checkboxes, and select triggers.                                       |
| **Focus Ring**                 | `var(--color-brand-600)` / `var(--color-brand-100)`   | `--ring`, `--color-focus`      | High-visibility 4px focus indicator ring with 4px offset for all keyboard-focused interactive controls.                       |
| **Destructive / Error**        | `var(--color-red-600)` / `var(--color-red-400)`       | `--destructive`                | Error banners, destructive buttons (Delete, Abort), validation error messages, and critical alerts.                           |
| **Warning**                    | `var(--color-yellow-100)` / `var(--color-yellow-900)` | `--warning`                    | Cautionary notifications, time-expiring warnings, and non-blocking security alerts.                                           |
| **Warning Foreground**         | `var(--color-yellow-900)` / `var(--color-yellow-100)` | `--warning-foreground`         | High-contrast text and icons on warning banners.                                                                              |
| **Success**                    | `var(--color-green-100)` / `var(--color-green-900)`   | `--success`                    | Successful completion banners, submitted status tags, verified indicators, and passing grades.                                |
| **Success Foreground**         | `var(--color-green-900)` / `var(--color-green-100)`   | `--success-foreground`         | Text and icons on success status tags and banners.                                                                            |
| **Sidebar Surface**            | `var(--color-slate-50)` / `var(--color-slate-900)`    | `--sidebar`                    | Dedicated background canvas for persistent navigation sidebars (lecturer workbench and navigation drawers).                   |
| **Sidebar Foreground**         | `var(--color-slate-950)` / `var(--color-slate-50)`    | `--sidebar-foreground`         | Navigation link text, section headers, and user profile information in the sidebar.                                           |
| **Sidebar Primary**            | `var(--color-brand-600)` / `var(--color-brand-500)`   | `--sidebar-primary`            | Active route navigation highlight marker and primary action fill inside the sidebar.                                          |
| **Sidebar Primary Foreground** | `var(--color-brand-50)` / `var(--color-brand-950)`    | `--sidebar-primary-foreground` | Text/icon contrast color for active sidebar items.                                                                            |
| **Sidebar Accent**             | `var(--color-slate-100)` / `var(--color-slate-800)`   | `--sidebar-accent`             | Hover and subtle pressed state background for sidebar navigation items.                                                       |
| **Sidebar Accent Foreground**  | `var(--color-slate-900)` / `var(--color-slate-50)`    | `--sidebar-accent-foreground`  | High-contrast label for hovered sidebar navigation items.                                                                     |
| **Sidebar Border**             | `var(--color-slate-200)` / `var(--color-slate-800)`   | `--sidebar-border`             | Vertical boundary stroke separating the persistent sidebar from the primary workbench canvas.                                 |
| **Sidebar Ring**               | `var(--color-brand-600)` / `var(--color-brand-200)`   | `--sidebar-ring`               | Focus ring outline for keyboard-focused items within the sidebar.                                                             |
| **Chart Series 1–5**           | `var(--color-sky-300)` – `var(--color-sky-800)`       | `--chart-1` – `--chart-5`      | Cohesive sky-blue categorical palette for academic analytics, grade distributions, and charts.                                |

### Brand Primitive Palette (OKLCH Scale)

Backed by FPT Orange spectrum configured in `@theme default inline`:

- `--color-brand-50`: `oklch(96.146% 0.059 60.999)`
- `--color-brand-100`: `oklch(92.01% 0.07747 52.892)`
- `--color-brand-200`: `oklch(81.758% 0.13352 45.306)`
- `--color-brand-300`: `oklch(74.696% 0.17496 41.756)`
- `--color-brand-400`: `oklch(67.774% 0.19083 39.878)`
- `--color-brand-500`: `oklch(62.035% 0.17986 39.596)` _(Primary Action baseline)_
- `--color-brand-600`: `oklch(56.028% 0.16325 39.397)` _(Primary Hover / Active Focus baseline)_
- `--color-brand-700`: `oklch(50.305% 0.14588 39.586)`
- `--color-brand-800`: `oklch(44.581% 0.12896 39.689)`
- `--color-brand-900`: `oklch(39.186% 0.11447 39.291)`
- `--color-brand-950`: `oklch(35.094% 0.09851 40.946)`

## Tokens — Typography

Typography is calibrated for high legibility, ink density balance, and Vietnamese language support (RULE-17). Root font size is `16px` (`html { font-size: 16px; }`). Line heights adhere strictly to `--leading-body` (`1.5`) and `--leading-heading` (`1.35`) to prevent clipping on stacked Vietnamese diacritics (ế, ộ, ữ, ự).

---

### Inter / InterVariable — Display & Headings

- **Substitute:** `InterVariable`, `Inter`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`
- **Weights:** `500` (Medium) for H1, H2, and H3 to balance ink density at large scales; `600` (SemiBold) for H4 and Card Titles.
- **Sizes:** `text-xl` (20px) to `text-4xl` (36px)
- **Line height:** `1.35` (`--leading-heading`)
- **OpenType features:** `"liga" 1, "calt" 1` (configured in `index.css`)
- **Role:** Display headers, page titles, section divides, and dialog headers. Deliberately avoids heavy bold weights (700+) at large scales to prevent visual clutter while preserving high contrast.

---

### Inter / InterVariable — Body & Interactive Controls

- **Substitute:** `InterVariable`, `Inter`, `system-ui`, `sans-serif`
- **Weights:** `400` (Regular) for standard body copy; `500` (Medium) for navigation links and chips; `600` (SemiBold) for strong emphasis, labels, and button actions.
- **Sizes:** `text-base` (16px / 1rem) default baseline; `text-lg` (18px / 1.125rem) for primary exam question stems; `text-sm` (14px) for compact data tables; `text-xs` (12px) for micro uppercase labels.
- **Line height:** `1.5` (`--leading-body`)
- **Role:** Question stems, multiple-choice options, button labels, form inputs, tooltips, dialog copy, and academic instructions.

---

### IBM Plex Mono — Monospace, Code & Academic Metadata

- **Substitute:** `"IBM Plex Mono"`, `ui-monospace`, `Menlo`, `Monaco`, `Consolas`, `monospace`
- **Weights:** `400` (Regular), `600` (SemiBold)
- **Sizes:** `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-xl` (20px)
- **Line height:** `1.5`
- **Features:** `tabular-nums`
- **Role:** Student candidate IDs (`SE180291`), room codes (`FPTU-EXAM-902`), exam countdown timers (`42:18 / 60:00`), SHA-256 submission integrity hashes and audit logs.

---

### Type Scale (Tailwind CSS Font Size Primitive Tokens)

| Role                | Family        | Weight    | Tailwind Token | Rem / Px        | Line Height | Context & Usage                                                   |
| :------------------ | :------------ | :-------- | :------------- | :-------------- | :---------- | :---------------------------------------------------------------- |
| **micro**           | Inter         | 600       | `text-xs`      | 0.75rem / 12px  | 1.5         | Uppercase badges, category labels, input helper text              |
| **compact**         | Inter         | 400 / 500 | `text-sm`      | 0.875rem / 14px | 1.5         | Compact table cells, metadata values, secondary notes             |
| **body**            | Inter         | 400 / 600 | `text-base`    | 1.00rem / 16px  | 1.5         | Standard body text, form inputs, button labels (RULE-17 baseline) |
| **body-lg**         | Inter         | 500 / 600 | `text-lg`      | 1.125rem / 18px | 1.5         | Question stems, emphasized options, subheadings                   |
| **heading-sm (H4)** | Inter         | 600       | `text-xl`      | 1.25rem / 20px  | 1.35        | Card titles, modal headers, subsection titles                     |
| **heading-md (H3)** | Inter         | 500       | `text-2xl`     | 1.50rem / 24px  | 1.35        | Section headings, panel titles                                    |
| **heading-lg (H2)** | Inter         | 500       | `text-3xl`     | 1.875rem / 30px | 1.35        | Page titles, major view headings                                  |
| **heading-xl (H1)** | Inter         | 500       | `text-4xl`     | 2.25rem / 36px  | 1.35        | Primary screen headlines, auth welcome headers                    |
| **mono-code**       | IBM Plex Mono | 400 / 600 | `font-mono`    | —               | 1.5         | Candidate IDs, timers, hash receipts, hotkey badges               |

## Tokens — Spacing & Shapes

### Spacing Scale

Spacing is strictly anchored to Tailwind CSS primitive spacing tokens on a **4px base grid (`0.25rem`)** relative to the `16px` root font size (`1rem = 16px`). All padding, margins, and layout gaps must adhere to this scale to maintain consistent optical rhythm across mobile, web, and desktop kiosk interfaces.

- **Base grid unit:** `4px` (`0.25rem`)
- **Density:** comfortable

| Step    | Rem        | Pixels | Tailwind Token          | Context & Usage Role                                             |
| :------ | :--------- | :----- | :---------------------- | :--------------------------------------------------------------- |
| **0.5** | `0.125rem` | 2px    | `--spacing-0.5` (`0.5`) | Micro-adjustments, border offsets, tight badge padding           |
| **1**   | `0.25rem`  | 4px    | `--spacing-1` (`1`)     | Tight inline gaps, icon-to-label spacing, badge vertical padding |
| **1.5** | `0.375rem` | 6px    | `--spacing-1.5` (`1.5`) | Compact button padding, chip vertical spacing                    |
| **2**   | `0.5rem`   | 8px    | `--spacing-2` (`2`)     | Standard element gap, compact card padding, list item gap        |
| **2.5** | `0.625rem` | 10px   | `--spacing-2.5` (`2.5`) | Control inner padding, medium badge padding                      |
| **3**   | `0.75rem`  | 12px   | `--spacing-3` (`3`)     | Standard horizontal input/button padding, compact card gap       |
| **4**   | `1.00rem`  | 16px   | `--spacing-4` (`4`)     | Default component padding, modal content gap, form field gap     |
| **5**   | `1.25rem`  | 20px   | `--spacing-5` (`5`)     | Medium container padding, option card padding                    |
| **6**   | `1.50rem`  | 24px   | `--spacing-6` (`6`)     | Card internal padding, desktop modal padding, header gutter      |
| **8**   | `2.00rem`  | 32px   | `--spacing-8` (`8`)     | Section content padding, feature card padding, stack spacing     |
| **10**  | `2.50rem`  | 40px   | `--spacing-10` (`10`)   | Large panel spacing, hero subsection gap                         |
| **11**  | `2.75rem`  | 44px   | `--spacing-11` (`11`)   | Standard control height, intermediate section gap                |
| **12**  | `3.00rem`  | 48px   | `--spacing-12` (`12`)   | Major section division, desktop workbench gutter                 |
| **16**  | `4.00rem`  | 64px   | `--spacing-16` (`16`)   | Persistent sidebar width offset, page header height              |
| **20**  | `5.00rem`  | 80px   | `--spacing-20` (`20`)   | Major landmark vertical spacing                                  |
| **24**  | `6.00rem`  | 96px   | `--spacing-24` (`24`)   | Large section separation gap                                     |
| **40**  | `10.0rem`  | 160px  | `--spacing-40` (`40`)   | Landmark landing divider gap, maximal whitespace bound           |

### Shadows

Elevation in LearnAble is restrained and functional. As a core principle, **use either a structural 1px border or a soft shadow to express elevation, not both at heavy emphasis**. The high-contrast border remains the primary structural boundary, while shadows provide subtle depth cues for interactive controls, elevated cards, and floating modal layers.

| Level / Name | CSS Box-Shadow Value                                                  | Tailwind Token | Context & Usage Role                                                                 |
| :----------- | :-------------------------------------------------------------------- | :------------- | :----------------------------------------------------------------------------------- |
| **none**     | `0 0 #0000`                                                           | `shadow-none`  | Flat academic panels, lecturer workbench cards, and bordered table rows              |
| **2xs**      | `0 1px rgb(0 0 0 / 0.05)`                                             | `shadow-2xs`   | Micro-elevation for `<kbd>` shortcut badges and active toggle chips                  |
| **xs**       | `0 1px 2px 0 rgb(0 0 0 / 0.05)`                                       | `shadow-xs`    | Standard interactive controls: buttons, text inputs, checkboxes, and select triggers |
| **sm**       | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`       | `shadow-sm`    | Default elevated cards, exam question container, and summary receipt card            |
| **md**       | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`    | `shadow-md`    | Floating select dropdowns, context menus, and tooltips (`--popover`)                 |
| **lg**       | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`  | `shadow-lg`    | Slide-over navigation sheets, examiner command drawers, and sticky banners           |
| **xl**       | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | `shadow-xl`    | High-priority overlay modals (Exam Submission confirmation, Supervisor alert)        |

### Layout Geometry

- **Max workspace width:** `1280px` (`max-w-7xl`) for student practice & exam routes; `1440px` for lecturer workbench.
- **Outer gutters:** `16px` (`px-4`) on mobile, `24px` (`px-6`) on tablet, `32px` (`px-8`) on desktop.

## Do's and Don'ts

### Do

- **Enforce High-Contrast by Default:** Maintain WCAG 2.2 AAA contrast (≥ 7:1 for text against canvas/card, ≥ 4.5:1 for non-text UI) as the default and only theme (RULE-17, NFR-15); verify automatically with `npm run check:contrast`.
- **Support Vietnamese Diacritics:** Maintain `16px` root font size, `--leading-body: 1.5` for body copy, and `--leading-heading: 1.35` for headings to accommodate stacked accent marks (ế, ộ, ữ, ự) without vertical clipping.
- **Consume Semantic Tokens:** Always use semantic classes (`bg-background`, `text-foreground`, `bg-primary`, `border-border`, `text-muted-foreground`); never use hardcoded hex colors in component code, unless there's no equivalent semantic classes for the situation. In that case, use raw Tailwind palette classes (e.g., `text-orange-500`, `bg-slate-900`).
- **Follow Surface Hierarchy:** Use `--secondary` for secondary surfaces housed inside a `card` or `popover`; use `--muted` for elements resting directly on top of the root `background` canvas.
- **Preserve Focus Rings:** Ensure high-visibility focus rings (`3px solid var(--ring)` with 2–4px offset) on every focusable control; always provide visible keyboard focus affordance (`:focus-visible`).
- **Provide Accessible Names:** Always include explicit `aria-label` or visible text descriptions for icon-only buttons, progress bars, and custom interactive widgets.
- **Announce Dynamic State Changes:** Announce route changes with `useRouteAnnouncer` and live status updates (timer countdowns, save confirmations, supervisor alerts) via `LiveRegion` / `announce()`.
- **Use Monospace for Academic Data:** Format student candidate IDs (`SE180291`), room identifiers, countdown timers, etc.
- **Follow Canonical Select Composition:** When building `Select` elements, strictly structure them as `Select` → `SelectTrigger` (`SelectValue`) → `SelectContent` → `SelectGroup` (`SelectLabel`, `SelectItem`) → `SelectSeparator`.

### Don't

- **Do not introduce tiny text:** Never render interface text smaller than `1rem` (16px) for body reading copy or below `0.75rem` (12px) for micro-metadata tags.
- **Do not use low-contrast muted grays:** Avoid faded grays (`#9ca3af`, `#d1d5db`, or unverified slate shades) that fail the 4.5:1 / 7:1 WCAG contrast thresholds.
- **Do not suppress focus indicators:** Never write `outline: none` or remove focus-visible rings without providing an immediate compliant replacement.
- **Do not apply decorative skeuomorphism:** Avoid gradient card fills, frosted glassmorphism, multi-layered drop shadows, or ornamental card-in-card nesting.
- **Do not mix staff and student assistive features:** Never add student-facing assistive controls (TTS narration, audio playback bars, disability filters) into lecturer, examiner, or admin workbenches.
- **Do not import from outer modules into `src/shared/`:** Preserve the UI sync boundary (`UI_SYNC.md`) — `src/shared/` primitives, tokens, and strings must remain completely self-contained.
- **Do not hardcode arbitrary spacing or sizing:** Never use ad-hoc pixel values outside the 4px Tailwind primitive scale (e.g., avoid `p-[17px]`, `gap-[13px]`).

## Layout

LearnAble employs an academic workbench layout model designed for cognitive focus, task clarity, and accessibility across diverse screen viewports.

- **Centered Task Container:** Max width `1280px` with responsive gutters (`px-4 sm:px-6 md:px-8`).
- **Clean Vertical Rhythm:** Auth forms and submission receipts sit centrally with generous vertical margins, avoiding card-in-card visual clutter.

---

## Similar Influences

- **Vercel Geist:** Monochrome baseline, precision 1px borders, tight typography, and keyboard shortcut chips (`<kbd>`).
- **Linear:** High-contrast restrained palette, deliberate elevation control, and keyboard-first accessibility workflows.
- **Gov.uk Design System:** Uncompromising accessibility standards (WCAG 2.2 AAA), legible typography, high contrast defaults, and clear non-text cues.
- **Primer (GitHub):** Resilient semantic token hierarchy, high information density academic tables, and robust light/dark mode parity.

---

## Quick Start

### CSS Custom Properties

Include in your root CSS stylesheet (`tokens.css` / `index.css`) to define the LearnAble design tokens:

```css
@import "tailwindcss";
@import "shadcn/tailwind.css";
@import "tw-animate-css";

/* Brand primitive scale (OKLCH - FPT Orange spectrum) */
@theme default inline {
  --color-brand-50: oklch(96.146% 0.059 60.999);
  --color-brand-100: oklch(92.01% 0.07747 52.892);
  --color-brand-200: oklch(81.758% 0.13352 45.306);
  --color-brand-300: oklch(74.696% 0.17496 41.756);
  --color-brand-400: oklch(67.774% 0.19083 39.878);
  --color-brand-500: oklch(62.035% 0.17986 39.596);
  --color-brand-600: oklch(56.028% 0.16325 39.397);
  --color-brand-700: oklch(50.305% 0.14588 39.586);
  --color-brand-800: oklch(44.581% 0.12896 39.689);
  --color-brand-900: oklch(39.186% 0.11447 39.291);
  --color-brand-950: oklch(35.094% 0.09851 40.946);
}

:root {
  /* High-Contrast Canvas & Typography */
  --background: var(--color-white);
  --foreground: var(--color-slate-950);
  --card: var(--color-white);
  --card-foreground: var(--color-slate-950);
  --popover: var(--color-white);
  --popover-foreground: var(--color-slate-950);

  /* Primary Brand Action (FPT Orange) */
  --primary: var(--color-brand-500);
  --primary-foreground: var(--color-white);
  --primary-hover: var(--color-brand-600);

  /* Secondary & Muted Surfaces */
  --secondary: var(--color-slate-100);
  --secondary-foreground: var(--color-slate-800);
  --muted: var(--color-slate-200);
  --muted-foreground: var(--color-slate-600);
  --accent: var(--color-slate-100);
  --accent-foreground: var(--color-slate-900);

  /* Semantic Feedback States */
  --destructive: var(--color-red-600);
  --warning: var(--color-yellow-100);
  --warning-foreground: var(--color-yellow-900);
  --success: var(--color-green-100);
  --success-foreground: var(--color-green-900);

  /* Structural Borders & Focus Ring */
  --border: var(--color-slate-300);
  --input: var(--color-slate-200);
  --ring: var(--color-brand-600);
  --color-focus: var(--color-brand-600);
  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;
  --radius: 0.5rem;

  /* Typography Line Heights (Vietnamese Diacritics Support) */
  --leading-body: 1.5;
  --leading-heading: 1.35;

  /* Sidebar Tokens */
  --sidebar: var(--color-slate-50);
  --sidebar-foreground: var(--color-slate-950);
  --sidebar-primary: var(--color-brand-600);
  --sidebar-primary-foreground: var(--color-brand-50);
  --sidebar-accent: var(--color-slate-100);
  --sidebar-accent-foreground: var(--color-slate-900);
  --sidebar-border: var(--color-slate-200);
  --sidebar-ring: var(--color-brand-600);

  /* Charts */
  --chart-1: var(--color-sky-300);
  --chart-2: var(--color-sky-500);
  --chart-3: var(--color-sky-600);
  --chart-4: var(--color-sky-700);
  --chart-5: var(--color-sky-800);
}

.dark {
  --background: var(--color-slate-950);
  --foreground: var(--color-slate-50);
  --card: var(--color-slate-900);
  --card-foreground: var(--color-slate-50);
  --popover: var(--color-slate-900);
  --popover-foreground: var(--color-slate-50);
  --primary: var(--color-brand-600);
  --primary-foreground: var(--color-brand-50);
  --primary-hover: var(--color-brand-600);
  --secondary: var(--color-slate-800);
  --secondary-foreground: var(--color-slate-50);
  --muted: var(--color-slate-800);
  --muted-foreground: var(--color-slate-400);
  --accent: var(--color-slate-800);
  --accent-foreground: var(--color-slate-50);
  --destructive: var(--color-red-400);
  --warning: var(--color-yellow-900);
  --warning-foreground: var(--color-yellow-100);
  --success: var(--color-green-900);
  --success-foreground: var(--color-green-100);
  --border: var(--color-slate-800);
  --input: var(--color-slate-800);
  --ring: var(--color-brand-100);
  --color-focus: var(--color-brand-100);
  --sidebar: var(--color-slate-900);
  --sidebar-foreground: var(--color-slate-50);
  --sidebar-primary: var(--color-brand-500);
  --sidebar-primary-foreground: var(--color-brand-950);
  --sidebar-accent: var(--color-slate-800);
  --sidebar-accent-foreground: var(--color-slate-50);
  --sidebar-border: var(--color-slate-800);
  --sidebar-ring: var(--color-brand-200);
}
```

---

### Tailwind CSS v4 Configuration (`@theme inline`)

```css
@theme inline {
  /* Typography Families */
  --font-heading: var(--font-sans);
  --font-sans:
    InterVariable, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;

  /* Semantic Color Aliases */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-hover: var(--primary-hover);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-focus: var(--color-focus);

  /* Focus & Radii */
  --focus-ring-width: var(--focus-ring-width);
  --focus-ring-offset: var(--focus-ring-offset);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);

  /* Sidebar & Charts */
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
}
```
