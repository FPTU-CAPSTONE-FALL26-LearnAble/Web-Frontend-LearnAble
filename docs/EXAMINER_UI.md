# Examiner workbench

## Routes and source

The Examiner workspace implements the fourteen reference compositions in `C:\Capstone2026\Stichs\Examiner Stichs`. Preserve this information architecture:

1. `/examiner/dashboard` — operations dashboard.
2. `/examiner/exams` — exam-paper bank.
3. `/examiner/exams/new/setup` — exam-paper setup.
4. `/examiner/exams/new/questions` — question selection.
5. `/examiner/exams/new/operations` — operational settings.
6. `/examiner/exams/new/readiness` — general readiness review.
7. `/examiner/schedule` — schedule cockpit.
8. `/examiner/schedule/new/details` — schedule details.
9. `/examiner/schedule/new/rooms` — room allocation.
10. `/examiner/schedule/new/candidates` — candidate allocation.
11. `/examiner/schedule/new/readiness` — scheduling readiness review.
12. `/examiner/monitoring` — live room monitoring.
13. `/examiner/monitoring/:roomId` — room and kiosk monitoring.
14. `/examiner/monitoring/:roomId/candidates/:candidateId` — candidate detail.

All routes live under `/examiner`, require the normalized `Examiner` role and share `ExaminerLayout`, `ExaminerSidebar` and the project `BrandIdentity`. Desktop navigation is a persistent 256px rail from `lg` (1024px); mobile navigation uses the same four top-level destinations in a Sheet. Keep nested wizard and monitoring routes out of the primary navigation: they remain contextual task flows under those four destinations. The FPT mark remains larger than LearnAble, uncropped and on the same row, separated by the shared 1px vertical navy rule. The dynamic role appears below the orange LearnAble wordmark. Do not fork or redraw this identity for Examiner.

## Visual and interaction contract

# IMPORTANT: THESE ARE FOR REFERENCES ONLY. USE [`DESIGN.md`](file:///d:/Study/2026_Fall/SEP490/Web-Frontend-LearnAble/DESIGN.md) FILE AS THE ONLY SOURCE OF TRUTH

Stitch `screen.png` and `code.html` control information hierarchy, density, panel topology and task order; they are directional references rather than permission to import conflicting colors or copy. Project tokens control color, typography, controls, focus and status semantics. Primitive colors follow the Tailwind CSS v4 palette mapped to semantic aliases in `src/shared/tokens/tokens.css`. Inter Variable is the only interface family. All visible and announced copy is English. Work surfaces are flat white with quiet slate borders (`border-border`) and no shadows; dark command bands, tinted gray canvas backgrounds, and decorative glass effects are strictly prohibited.

Orange (`bg-action` / `--color-orange-500`) identifies primary actions and selected navigation emphasis, blue (`--color-blue-700`) identifies information and keyboard focus rings (3px with 2px offset), green identifies success/ready states, yellow identifies warnings/review states, and red identifies errors, critical incidents and urgent work. Pale status surfaces must be derived with `color-mix()` from these semantic tokens and `--color-bg`, and every status also needs readable text or an icon. Do not use orange as a generic warning or status color.

Examiner compositions live in `src/features/examiner/` and consume canonical shared primitives in `src/shared/ui/primitives/` and platform-neutral exam patterns in `src/shared/ui/patterns/exam/`. Examiner is a standard staff role. Do not expose personal assistive-mode controls, screen-reader simulators, zoom modes, accessibility scores, sonification or disability-specific dashboards. The E-06 reference is adapted into a general exam-readiness review. Normal accessibility engineering—semantic structure, labels, keyboard operation, visible focus, reduced motion and non-color status cues—remains mandatory.

## Data and honesty

The deployed backend currently exposes no matching exam, schedule, room, candidate, incident or monitoring contracts. Examiner screens therefore use typed English fixtures from `src/features/examiner/data/fixtures.ts` and identify operational views as simulation data. Search, filters, question selection, matrix balancing, room choice and seat exploration are local UI behaviors only. They do not persist across sessions unless a future contract explicitly provides that behavior.

Publishing, scheduling, importing, broadcasting, emergency actions, kiosk commands, incident resolution and candidate changes are disconnected writes. Triggering one must explain that the feature is not connected and must never mutate a fixture, issue a substitute request or report backend success. The shared sidebar Emergency entry follows this same rule.

When real contracts arrive, replace fixtures with explicit loading, empty, error and retry states. Never fall back to fixture rows after a failed real request and never present simulated telemetry as a live institutional record.
