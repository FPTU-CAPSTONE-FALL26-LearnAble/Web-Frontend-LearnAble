---
name: LearnAble
description: Corporate modern, high-legibility academic workbench for FPT University.
colors:
  bg: "#ffffff"
  surface: "#ffffff"
  text: "#0f172a"
  text-muted: "#475569"
  primary: "#0f172a"
  primary-text: "#ffffff"
  action: "#f26f21"
  action-text: "#0f172a"
  secondary: "#176eb4"
  border: "#64748b"
  border-subtle: "#e2e8f0"
  error: "#dc2626"
  error-text: "#ffffff"
  success: "#16a34a"
  warning: "#eab308"
  focus: "#176eb4"
  selected-bg: "#ffffff"
  selected-text: "#0f172a"
typography:
  display:
    fontFamily: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1.35
  headline:
    fontFamily: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "1rem"
    lineHeight: 1.625
  label:
    fontFamily: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 600
rounded:
  control: "8px"
  base: "10px"
  panel: "12px"
  card: "16px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-6: "24px"
  space-8: "32px"
  space-12: "48px"
  space-16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-text}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
---

# Design System: LearnAble

## Overview

**Creative North Star: "The Academic Workbench"**

Corporate modern high-legibility for an inclusive university environment. Every route uses one normalized palette: white surfaces, navy/slate hierarchy, FPT orange actions, blue focus/information, green success, red error and yellow warning. Alpha and `color-mix()` variants may create restrained surfaces without introducing extra base colors. Avoid decorative glass effects, excessive gradients, and dense visual noise.

Mode: Operate. Preserve the incumbent visual identity and typography. All interface copy and technical announcements are English. Institutional identity supports focused academic work; the FPT asset and FPT-orange LearnAble lockup share one row on white, separated by a short vertical navy line and without a dark backing panel. Auth uses a visible 2px separator; staff sidebars, drawers and mobile headers use a lighter 1px separator. The FPT mark remains visually larger, and the dynamic role sits below LearnAble.

Admin, Lecturer and Examiner are standard staff-facing roles. Do not add personal assistive-mode controls, TTS/voice-reading controls, A11y scoring or filters, sonification controls, disability-specific dashboards, or accessibility-review actions to their workspaces. Continue to implement semantic HTML, keyboard access, visible focus, correct labels, status announcements and contrast as baseline engineering quality.

**Key Characteristics:**

- White work surfaces and readable navy/slate hierarchy.
- Restrained orange actions, blue focus and information cues, and consistent semantic states.
- Complete institutional identity, predictable navigation, responsive workbenches.
- Explicit loading, error, unavailable and local-only states.

## Colors

The normalized palette is normative in `src/shared/tokens/tokens.css`. Lecturer aliases in `src/features/lecturer/components/lecturer-theme.css` may change contextual roles, but every solid base resolves to one of the ten approved colors in the frontmatter.

- Primary: FPT orange marks decisive actions and retains navy action labels. Orange buttons remain exactly `#f26f21` at rest, hover and pressed; interaction is shown through border, shadow or movement rather than a second orange shade. The navy foundation has its own white foreground; these roles are distinct.
- Secondary actions: use a white surface, FPT-orange border and navy label. Hover and expanded states use the approved orange-tinted selected surface. Blue remains reserved for information and focus rather than button fills.
- Secondary: academic blue carries focus, selected type borders, text and rings on white. The shared CSS secondary token is blue with white foreground; the shadcn `secondary` utility is mapped to a white surface with navy foreground in `src/styles/index.css`. Preserve that distinction.
- Neutral: white owns the canvas, surfaces, muted surfaces, panels and selected backgrounds. Navy carries main and selected text; slate carries supporting text. Slate control borders remain stronger than quiet panel borders and dividers.
- Brand and action: FPT orange is the only orange. It marks decisive actions, selected navigation emphasis and the LearnAble wordmark.
- Semantic status: approved green identifies success; approved blue identifies information and focus; approved yellow identifies warning; approved red identifies errors and urgent work. Pale surfaces must be alpha or `color-mix()` variants of those same canonical colors. Status is never communicated by color alone.
- Focus tokens specify a 3px blue ring with a 2px offset; retain visible focus in shared and shadcn controls. Status always includes readable text or an icon rather than color alone.

**The Ten-Color Rule.** Solid UI colors are limited to the ten frontmatter hexes. Alpha and `color-mix()` variants are allowed; extra shade hexes and Tailwind chromatic utilities are forbidden.

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

### Authentication Surfaces

Mode: Operate. At desktop widths, the campus story occupies five columns and the authentication task occupies seven. On mobile, the form leads and the campus panel becomes a compact supporting region. The approved Stitch screenshots determine composition; all copy is translated to clear English.

### Lecturer Surfaces

The seven lecturer reference compositions are binding: Dashboard, Question Bank, Question Studio, Learning Materials, Upload Material, Exam Schedule & Rooms, and Attendance. Sources live under `C:\Capstone2026\Stichs\Lecturer Stichs\stitch_learn_able`. Apply the pinned English copy, palette, typography, shared sidebar/brand treatment, and honest real/unavailable data to those compositions. The dashboard prioritizes live exam operations, upcoming invigilation, and blocking work in that order. Dashboard, exam schedule and attendance data remain English fixtures until matching backend contracts exist. Preview-only actions must say they are not connected.

### Examiner Surfaces

The fourteen Examiner reference compositions under `C:\Capstone2026\Stichs\Examiner Stichs` are binding for hierarchy, density and operational topology. All Examiner routes share the 256px staff sidebar, mobile Sheet and shared brand lockup. Dashboard and monitoring may use restrained navy command bands for the current shift; authoring, scheduling and detailed work remain on bordered white panels.

Examiner data is an explicitly identified English simulation until matching deployed contracts exist. The E-06 accessibility-audit reference is adapted to a general exam-readiness review: preserve its review topology but omit NVDA, zoom, contrast-mode, scoring and other personal assistive controls. `EXAMINER_UI.md` records routes, fixture behavior and disconnected actions.

## Elevation & Depth

Use either a border or a soft shadow to express elevation, not both at equal emphasis. Lecturer summary cards and table panels are flat white surfaces with quiet borders and no shadows. Existing authentication and primary action surfaces retain their incumbent soft shadows. The exact card/control and image-text shadow values live in `src/shared/tokens/tokens.css` and the sidecar extensions. Retain the authentication image overlay only on its existing image composition.

## Shapes

Controls have gently curved 6–8px corners, shared base geometry uses 10px, and panels/cards use 12–16px corners. Keep forms structured by labels and spacing; placeholder text never carries essential instructions. Preserve full logo geometry and source transparency. Status badges may use pill geometry without turning every container into a pill.

## Components

Use shadcn/ui selectively for controls whose state, focus management or accessibility behavior benefits from it. Direct semantic HTML and Tailwind/CSS composition are equally valid when they reproduce the Stitch structure more faithfully. Stitch `code.html` and `screen.png` win over default component composition, while the normalized palette wins over Stitch colors. Use Lucide by default; add at most one external icon library, and only when Lucide genuinely lacks the required icon.

### Shared Primitives

Primary buttons use orange with navy labels, 44px minimum height, gentle control corners and the existing control shadow. Outline buttons and inputs use white, readable text and stronger control strokes. Include hover, visible focus, disabled and invalid states. Navigation uses readable labels, route state, white selected surfaces and the incumbent semantic border/text treatment. Status badges pair text with success, danger, warning or information tones. Summary cards use quiet borders, compact labels, tabular values and explanatory detail.

`BrandIdentity` is shared by authentication and staff navigation. In Lecturer and Examiner navigation, keep the complete FPT University asset and the full dark-orange LearnAble wordmark on one row, with the dynamic role below the wordmark. Transparent safe-area compensation may enlarge the image box, but the asset must remain `object-contain`, uncropped and visibly dominant. Reuse the component without changing unrelated authentication composition or campus imagery.

### Lecturer Dashboard

The `/lecturer/dashboard` composition follows the Live Shift Commander HTML: a compact greeting and Create question / Upload learning material actions, then a two-to-one desktop row pairing today's exam with upcoming invigilation. The exam panel contains a countdown/progress strip, a two-by-two information grid and its attendance action. The upcoming panel keeps compact dated shifts and schedule links. These regions stack below extra-large widths.

The urgent queue is one compact panel beneath that row, with filters and search in its header, a five-column table (type/identifier, item/course, priority, issue/status, action), and counts with the triage action below. Retain the reference hierarchy and quiet white bordered panels; do not append unrelated resource cards. Search and filters remain client-side over English fixtures, and unavailable operational actions explain that they are not connected.

### Question Bank

Question Management is an expandable sidebar group with two sibling destinations: `/lecturer/questions/exam` and `/lecturer/questions/practice`. The group opens whenever a descendant is active, and the active child remains visually explicit. `/lecturer/questions` redirects to the exam workspace rather than presenting a third bank.

Both purpose routes use the same configured workbench and follow the supplied Stitch composition: purpose-specific heading and import/export/create actions, four summary cards, search and labeled filters, then a wide question table with selection and pagination. Labels, usage language, empty states, bulk actions and create links reflect the selected purpose; shared layout and interaction behavior must not drift between the two banks. Summary cards and table panels are white, use subtle borders, and omit shadows. The summaries expand from one column to two and then four; filters expand to two and then three columns. On smaller screens, actions wrap and the minimum-1120px table scrolls within its named, keyboard-focusable container with an obvious horizontal-scroll affordance.

The purpose split currently uses distinct English simulation datasets; exam and practice rows must never be pooled or relabeled. Future backend support must add `Purpose = Exam | Practice`. `sourceType = Manual | Import` is provenance and must not be repurposed as purpose. Learning Materials reads `/api/v1/LearningMaterials` with `UploadedBy`; Subjects and Topics populate academic metadata. The deployed service is `https://backend-learnable.onrender.com`; local development uses the Vite proxy. Row selection remains local UI state. Show loading, empty, error and retry states without substituting one purpose's fixtures for the other. Missing aggregate, usage and accessibility metrics say “Not available”. Import/export and bulk tagging, validation, deactivation and deletion show a not-connected message; they do not mutate data or report backend success.

### Question Studio

The `/lecturer/questions/new` surface follows the Question Studio HTML as a viewport-height workspace, not a pair of floating cards. Its top bar contains breadcrumb navigation, the real subject/course selector and Cancel. At extra-large widths, the body divides into nearly balanced authoring and live-review panes (a 1.1:1 grid); each pane scrolls independently. Below that breakpoint, the panes stack inside one scrolling body. The action footer remains outside that body in the flex layout, so cancel, saved-draft deletion, local save and publishing are accessible without a sticky overlay obscuring focused fields.

The authoring pane uses compact section labels and metadata for topic, Bloom level and points, six icon-led type tiles, a question-content toolbar and editor, type-specific fields, and a pedagogical explanation. Choice answers use compact vertically stacked cards with correct-answer controls and answer text. The live-review pane contains the student-facing question card, points and local interactive answers. Do not add personal voice-reading, sonification or accessibility-audit controls to the staff-facing studio. Type selection includes an explicit pressed state and blue border/ring treatment; all field labels retain programmatic associations.

The six supported types are Single Choice, Multiple Choice, Essay, Write Code, MathML / LaTeX, and Diagram. Changing type retains common question metadata and content but resets its answer fields. Preview controls are local demonstrations; answers are neither submitted nor scored. LaTeX renders locally with KaTeX, trust disabled, and bounded expansion. MathML remains escaped source only. Code is displayed and never executed. Diagrams use an author-provided image, alt text and description.

Save draft explicitly stores text and answer fields in browser local storage under separate purpose-scoped keys: `learnable.question-draft.<userId>.exam` and `learnable.question-draft.<userId>.practice` (with an anonymous user fallback). Exam and practice drafts must never overwrite or restore into one another. This is not a backend save or automatic synchronization. Image and audio files use session-only object URLs and must be selected again after reload or leaving the editor. Restored-draft and save messages explain these limits; storage failures provide recovery copy. Unsaved changes trigger a leave confirmation. Delete saved draft removes only the active purpose's browser copy while retaining the open editor; delete assessment drafts before leaving a shared campus computer.

Publishing validates required fields locally and then explains that backend publishing is unavailable; no question is added to the bank. Bloom templates and formatting-toolbar actions show transparent not-connected messages. Keep these limitations visible and never imply submission or scoring. `QUESTION_UI.md` records the surface contract; the two route components and `src/features/lecturer/questions` are the implementation evidence.

### Learning Materials and Upload

The materials list retains its summary/filter/table composition, real paginated reads and local selection. Its minimum-1120px table follows the same named bounded-overflow contract as Question Bank. Upload is a split workbench with a dashed file-selection region, metadata controls, processing panel and action footer: normal document flow on mobile and sticky only at `xl`. PDF, DOCX, PPTX, MP3, MP4 and EPUB are selectable locally. File selection and metadata are local/session state; a leave guard protects unsaved edits. Upload, OCR, indexing and AI actions are not connected and must not report backend submission or processing success.

### Exams and Attendance

Exam Schedule & Rooms keeps its operational overview and detailed shift/room composition. Attendance pairs a scrollable seat map with student details and a bottom action bar. English fixtures support local exploration only; attendance changes, incidents, exports and other writes remain disconnected. Do not imply that a fixture status is a live institutional record.

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

### Documentation Scope

This document records the shipped visual world and component/data-state norms. It does not certify exact native pixel equivalence or completed automated accessibility audits. `PRODUCT.md`, `QUESTION_UI.md` and `LECTURER_UI.md` carry the detailed product/API and surface contracts; `.impeccable/review` contains desktop/mobile review evidence.
