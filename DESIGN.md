---
name: learnable-design-guidelines
description: "Design and build accessible, evidence-led learning, examination, and academic workbench interfaces for LearnAble. Use for student practice, desktop examination, authentication, lecturer, and examiner surfaces."
---

# Design System: LearnAble

## Overview

**Creative North Star: "The Academic Workbench"**

Corporate modern high-legibility for an inclusive university environment. Every route uses one normalized palette: white surfaces, navy/slate hierarchy, FPT orange actions, blue focus/information, green success, red error and yellow warning. Alpha and `color-mix()` variants may create restrained surfaces without introducing extra base colors. Avoid decorative glass effects, excessive gradients, and dense visual noise.

Mode: Operate. Preserve the incumbent visual identity and typography. All interface copy and technical announcements are English. Institutional identity supports focused academic work; the FPT asset and FPT-orange LearnAble lockup share one row on white, separated by a short vertical navy line and without a dark backing panel. Auth uses a visible 2px separator; staff sidebars, drawers and mobile headers use a lighter 1px separator. The FPT mark remains visually larger, and the dynamic role sits below LearnAble.

Admin, Lecturer and Examiner are standard staff-facing roles. Do not add personal assistive-mode controls, TTS/voice-reading controls, A11y scoring or filters, sonification controls, disability-specific dashboards, or accessibility-review actions to their workspaces. Continue to implement semantic HTML, keyboard access, visible focus, correct labels, status announcements and contrast as baseline engineering quality.

## Design priorities

When requirements compete, protect them in this order:

1. Preserve assessment integrity, supplied facts, privacy, role permissions,
   time limits, scoring status, and clear limits of disconnected features.
2. Preserve accessibility: keyboard operation, visible focus, readable type,
   explicit labels and errors, non-colour state cues, and 44×44px minimum
   interactive targets.
3. Make the user's immediate task and the next safe action obvious.
4. Preserve LearnAble and FPT institutional identity, shared tokens, and the
   web-to-desktop UI boundary.
5. Choose a composition that fits the task rather than applying a generic
   dashboard, hero, or card-grid template.
6. Refine responsive layout and interaction only when they strengthen clarity,
   trust, or continuity.

Do not invent exam state, backend success, deadlines, ownership, accessibility
scores, score changes, or AI capability. If a fact is unavailable, use clear
copy such as “Not available”, “Preview only”, or “Not connected”.

## Design in four passes

### 1. Frame the user’s job

Before designing or modifying a screen, identify the actor, their immediate
task, the consequence of an error, the assistive modality that matters, and the
one piece of information or action that must be understood first.

- Student practice and examination surfaces prioritize answer confidence,
  progress, time awareness, recovery, and unambiguous submission.
- Lecturer and examiner surfaces prioritize operational status, filtering,
  accurate data state, and safe next actions.
- Authentication prioritizes identity, task completion, and explicit failure
  recovery.

Support two reading speeds where a surface contains data: the first read should
make the operational state and next action clear; the audit read should retain
exact labels, filters, status definitions, dates, units, and source limits.

### 2. Establish the hierarchy

The first viewport should communicate the task, current state, and primary
action without requiring users to decode a decorative heading or a field of
equal-weight cards. Give each section one reader question. Combine duplicate
summaries rather than repeating the same answer in a card, chart, table, and
conclusion.

Use type, alignment, spacing, and density before adding surfaces, borders, or
color. Empty space must clarify a relationship; rebalance underfilled splits
and orphaned grid cells rather than filling them with decoration.

### 3. Compose the evidence and controls

Use the representation that makes the task easier:

- Use prose for one conclusion or instruction.
- Use a semantic table for exact lookup, with headers aligned to their cells.
- Use charts only when a relationship, trend, threshold, or comparison becomes
  faster to understand visually; include units, a caption, and a text/table
  alternative for material data.
- Use controls when users need to safely change state or test an assumption;
  controls must have persistent labels, clear units, visible focus, and honest
  feedback.

Never use visual emphasis to imply a fact the data does not support. Do not
compare counts as rates, crop an encoding to exaggerate a difference, or use a
favorable color without a sourced semantic meaning.

### 4. Verify the result

Review desktop and narrow layouts, keyboard flow, loading/empty/error states,
and reduced-motion behavior. Fix systemic problems first: hierarchy, target
size, focus, token misuse, overflow, repeated components, or inaccurate state
copy. Do not ship a screen that is visually polished but misleading, inaccessible,
or impossible to operate with a keyboard.

## Colors

Tailwind CSS v4's published palette is the primitive color source. Do not add
project-owned hex values, custom shade scales, or new `--color-*` primitives.
Use Tailwind palette variables through semantic aliases in
`src/shared/tokens/tokens.css`; components consume the semantic alias, not a
raw palette color.

```text
Primitive palette token          Semantic role
--color-white                   background, surface, panel
--color-slate-950               foreground, primary text
--color-slate-600               muted text
--color-slate-500               control border
--color-slate-200               subtle border
--color-orange-500              decisive action and selection emphasis
--color-blue-700                focus and information
--color-green-600               success
--color-yellow-500              warning
--color-red-600                 destructive/error
```

The semantic layer remains intentionally small: `background`, `foreground`,
`primary`, `action`, `secondary`, `muted`, `border`, `focus`, `success`,
`warning`, and `destructive`. A primitive component uses names such as
`bg-action`, `text-foreground`, and `border-border`; it must not use a raw
class such as `bg-orange-500` or a raw `var(--color-orange-500)` reference.
This lets the visual role remain stable when the palette mapping changes.

- White owns the canvas and work surfaces; slate carries text and borders.
- Orange is reserved for decisive actions and selected navigation emphasis.
- Blue is reserved for focus, information, and selection affordances rather
  than generic button fills.
- Green, yellow, and red represent sourced semantic states only. Every state
  also needs readable text, an icon, or another non-colour cue.
- Pale state surfaces must be derived with `color-mix()` from the relevant
  semantic alias and the background; do not add a lighter palette shade merely
  for a background.
- Focus uses a 3px blue ring with a 2px offset and must meet contrast
  requirements against its surrounding surface.

**Palette rule.** Tailwind palette tokens are the only solid UI color values.
Supplied institutional image assets may retain their native brand colors, but
new UI CSS, component classes, and tokens must not introduce a custom hex,
RGB, HSL, OKLCH, or duplicate Tailwind shade.

## Typography

- Family: Plus Jakarta Sans for every interface role, with the installed variable family first and system sans-serif fallback.
- Display: use the display token; compact display treatment is 32/40 on mobile.
- Page heading: use the headline token for the shared baseline; lecturer list headings retain their incumbent 30px extra-bold treatment. Dashboard greeting is compact (24px); Question Studio uses compact uppercase section labels. Compact shared page headings use 26/34.
- Section heading: 20–24px, weight 600–700.
- Body: use the body token; important supporting copy may use 18/28.
- Labels: 13–15px, weight 600, with restrained tracking; some lecturer contextual labels use compact 10–12px text.
- Keep body lines below 68 characters when possible. Counts and pagination use tabular numerals.

## Layout

- Use the frontmatter spacing rhythm and minimum 44px interactive targets.
- Shared/authentication content retains its incumbent 1280px bound and 24px desktop / 16px mobile gutters. Lecturer content has a 1440px maximum inside the remaining workspace, 16px mobile, 24px small-screen and 32px desktop gutters.
- Lecturer and Examiner tools share a persistent 256px staff sidebar from the `lg` breakpoint (1024px), with a 64px mobile header and Sheet navigation below it. The complete FPT University asset and LearnAble lockup sit on one row. The logo uses object containment plus negative safe-area compensation so its visible mark remains larger than the full dark-orange LearnAble wordmark without cropping; the dynamic `user.role` label sits beneath LearnAble.
- Workbench columns split at extra-large widths (1280px) and stack below. Question Studio is a desktop viewport workbench with independently scrolling panes and an in-layout action footer; on mobile its footer returns to normal document flow. Upload uses normal-flow mobile actions and becomes sticky only at `xl`, where the footer cannot cover focused content. Dense tables use a minimum 1120px table width inside named, keyboard-focusable bounded overflow regions with a visible mobile scrollbar/edge affordance. Seating maps use the same bounded-scroll principle; page actions wrap.

## Elevation & Depth

Use either a border or a soft shadow to express elevation, not both at equal emphasis. Lecturer summary cards and table panels are flat white surfaces with quiet borders and no shadows. Existing authentication and primary action surfaces retain their incumbent soft shadows. The exact card/control and image-text shadow values live in `src/shared/tokens/tokens.css` and the sidecar extensions. Retain the authentication image overlay only on its existing image composition.

## Shapes

Controls have gently curved 6–8px corners, shared base geometry uses 10px, and panels/cards use 12–16px corners. Keep forms structured by labels and spacing; placeholder text never carries essential instructions. Preserve full logo geometry and source transparency. Status badges may use pill geometry without turning every container into a pill.

## Components

Use shadcn/ui selectively for controls whose state, focus management or accessibility behavior benefits from it. Direct semantic HTML and Tailwind/CSS composition are equally valid when they reproduce the Stitch structure more faithfully. Stitch `code.html` and `screen.png` win over default component composition, while the normalized palette wins over Stitch colors. Use Lucide by default; add at most one external icon library, and only when Lucide genuinely lacks the required icon.

### Shared Primitives

Primary buttons use orange with navy labels, 44px minimum height, gentle control corners and the existing control shadow. Outline buttons and inputs use white, readable text and stronger control strokes. Include hover, visible focus, disabled and invalid states. Navigation uses readable labels, route state, white selected surfaces and the incumbent semantic border/text treatment. Status badges pair text with success, danger, warning or information tones. Summary cards use quiet borders, compact labels, tabular values and explanatory detail.

The shared component boundary has two layers:

```text
src/shared/ui/primitives/       # A — canonical controls and accessibility behavior
src/shared/ui/patterns/exam/    # B — platform-neutral exam/practice compositions
src/features/<actor>/           # actor- and web-specific compositions
```

Primitives are context-free: they must not know an actor, route, API state, or
exam workflow. They expose semantic variants and size/density choices while
preserving the 44px minimum. The exam pattern layer composes the larger,
exam-appropriate controls and interaction rules so screens do not duplicate
one-off sizing classes. Only patterns used by both web practice and desktop
examination belong in `src/shared/ui/patterns/exam/`.

Use shadcn and Radix as implementation tools, not as the product visual
language. Generated components must adopt LearnAble tokens, the shared `cn`
utility, accessibility rules, and desktop-compatible dependencies before they
become canonical primitives.

`BrandIdentity` is shared by authentication and staff navigation. In Lecturer and Examiner navigation, keep the complete FPT University asset and the full dark-orange LearnAble wordmark on one row, with the dynamic role below the wordmark. Transparent safe-area compensation may enlarge the image box, but the asset must remain `object-contain`, uncropped and visibly dominant. Reuse the component without changing unrelated authentication composition or campus imagery.

## Do's and Don'ts

### Do:

- Do use only the ten approved base colors; derive lighter state surfaces with alpha or `color-mix()`.
- Do keep the FPT logo and LearnAble on one row in Lecturer and Examiner navigation, with the logo visually dominant, the LearnAble wordmark fully dark orange and the dynamic role directly below it.
- Do preserve binding reference composition while applying English copy, shared branding and honest data states.
- Do show loading, empty, error, retry, local-only and “Not available” states clearly.
- Do retain persistent labels, explicit errors, keyboard-complete controls, visible focus, minimum 44px targets, reduced motion and non-color status cues.

### Don't:

- Don't crop the FPT logo, hide its complete geometry, redraw institutional identity or make LearnAble visually dominate it.
- Don't add extra shade hexes or Tailwind chromatic utilities, even when the Stitch source uses them.
- Don't add a second external icon library or replace Lucide when it already provides the required icon.
- Don't replace failed authenticated reads with fixture data.
- Don't report backend success for local drafts, session files or disconnected writes, OCR, AI, scoring or accessibility audits.
- Don't introduce decorative glass effects, excessive gradients, tinted gray page backgrounds or dense visual noise.

### Accessibility Contract

Persistent labels, explicit error descriptions, keyboard-complete controls, visible focus, minimum 44px targets, reduced motion, and non-color status cues are mandatory. Placeholder text never carries essential instructions.

## Restraint and interaction rules

The interface should feel calm and operational, not sparse by default and not
decorative. Do not use gradients, glass effects, glows, animated backgrounds,
stock imagery, fake product screenshots, decorative icon tiles, ornamental
shadows, or cards nested inside cards. Use a border _or_ a soft shadow to show
elevation, not both with equal emphasis.

Default to stillness. Motion may confirm an action, preserve continuity during
a state change, or reveal a necessary relationship. Never gate reading behind
animation, use auto-scrolling content, pulse decorative elements, or add
parallax, bouncing, or simulated typing. The complete experience must work with
`prefers-reduced-motion`.

Icons are functional aids, not decoration. Use Lucide when an icon is faster to
recognize than a label; pair ambiguous icons with accessible text or an
accessible name. Do not add another icon library unless Lucide cannot provide a
required symbol.

## Review checklist

Before hand-off, inspect the real route rather than only the component source.

1. **Task and truth:** Is the actor’s next safe action clear? Are data states,
   backend limits, and local-only behavior described honestly?
2. **Hierarchy:** Does the first viewport make the task and current state clear?
   Does every section answer a distinct question?
3. **Layout:** Are grid edges, baselines, numeric columns, and action rows
   aligned? Does responsive reflow avoid clipping, accidental whitespace, and
   character-level wrapping?
4. **Accessibility:** Are labels, error text, focus, keyboard behavior, target
   size, headings, landmarks, and non-colour state cues complete?
5. **Evidence:** Are units, dates, filters, table headers, data bases, and
   chart scales explicit and faithful?
6. **Restraint:** Can a card, border, icon, color, paragraph, or animation be
   removed without losing meaning or affordance? If so, remove it.
7. **System fit:** Does the change use the approved tokens and shared primitive
   layers, and will it remain safe to synchronize to desktop?

### Documentation Scope

This document records the shipped visual world and component/data-state norms.
It does not certify exact native pixel equivalence or completed automated
accessibility audits. `docs/PRODUCT.md`, `docs/QUESTION_UI.md`,
`docs/LECTURER_UI.md`, and `docs/EXAMINER_UI.md` carry detailed product/API
and surface contracts; `.impeccable/review` contains desktop/mobile review
evidence.
