# Lecturer workbench

## Routes

- `/lecturer/dashboard`: English exam/work-queue fixtures.
- `/lecturer/questions`: redirects to the exam-question workspace.
- `/lecturer/questions/exam`: exam-purpose question workspace.
- `/lecturer/questions/practice`: practice-purpose question workspace.
- `/lecturer/questions/new?purpose=exam|practice`: shared six-type authoring studio, purpose-scoped local text draft and live preview.
- `/lecturer/materials`: authenticated LearningMaterials list.
- `/lecturer/materials/new`: session-only file selection and academic metadata.
- `/lecturer/exams`: English invigilation fixtures grouped by week.
- `/lecturer/exams/:examId/attendance`: fixture seat map and searchable student list.

All routes require a Lecturer session and share LecturerLayout/LecturerSidebar. BrandIdentity renders the complete FPT asset with preserved proportions, without cropping. Mobile navigation uses a Sheet.

Question Management is an expandable navigation group, not a single destination. It exposes Exam Questions and Practice Questions as sibling destinations, opens whenever a question route is active, and preserves a distinct active state for the selected child. The two banks share one purpose-configured UI so filtering, selection, pagination, empty states and responsive behavior remain consistent while titles, usage language, actions and data stay purpose-specific.

## Visual contract

Stitch `code.html` and `screen.png` are the authority for composition, hierarchy, spacing and density across all seven Lecturer routes. The normalized project palette overrides any colors found in Stitch: solid UI colors are limited to `#ffffff`, `#0f172a`, `#475569`, `#64748b`, `#e2e8f0`, `#f26f21`, `#176eb4`, fresh success green `#16a34a`, fresh danger red `#dc2626` and fresh warning yellow `#eab308`. Alpha and `color-mix()` variants are allowed; extra shade hexes and Tailwind chromatic utilities are not.

Orange action buttons must remain exactly `#f26f21` in default, hover and pressed states. Never darken orange with `color-mix()`, opacity or a second hex; use shadow, border or subtle movement for interaction feedback.

Secondary buttons use a white surface with an FPT-orange border and navy text. Hover and expanded states use the approved orange-tinted selected surface. Blue remains reserved for information and focus rather than button fills.

Primary Lecturer CTAs use the FPT-orange surface with white labels and icons. This Lecturer-specific foreground overrides the shared navy action label.

Exam code panels use one shared status contract across Dashboard, Exam Schedule and Attendance: `Opening soon` uses a fresh pastel warning-yellow surface and masks the code as `XXXXXX`; `Open` uses a fresh pastel success-green surface and reveals the code; `Closed` uses a fresh pastel danger-red surface. Status badges throughout Lecturer pages use the same visual language: lightly tinted background, colored border, saturated dot/icon and bold label. These surfaces are alpha mixes of the single canonical status token, never additional shade codes. Exam codes always stay on one line and use horizontal overflow as a last-resort safeguard on very narrow screens. Every state includes an icon or dot and a visible English label; color is never the only signal.
Upcoming shifts that have not entered the opening window use a neutral-gray `Not open yet` Exam Code state and mask the code as `XXXXXX`. Their compact Exam Code and the `Seating map` / `Attendance` actions sit in the upper-right action cluster beneath the time. `Attendance` stays disabled until 30 minutes before the scheduled start, while `Seating map` remains available for preparation. `Opening soon` is reserved for a shift already in its preparation window and waiting for the Examiner to open the code. The `Today` shift uses the same right-side Exam Code card and two-button arrangement as the priority overview; it must never expand into a full-width footer.
The Attendance action is governed by the 30-minute opening window even when a shift is labeled `Today`; a Today label alone must never enable it.

Attendance seating uses six mutually exclusive visible states with the same tone on the filter, seat card and badge. `Present` uses a white card with a success-green border; `Not checked in` is neutral gray; `Started` is information blue; only `Submitted` fills the complete card with success green; `Incident` is warning yellow; and `Cheating` is danger red. `All` is only a filter and is not a seat state. Manual attendance actions use solid semantic controls: `Present` is green and `Absent` is red, both with white labels.

Each student row reserves a large rectangular left-side photo slot that acts as a keyboard-accessible button and opens a focused image preview. All identity details and actions stay in the right column: name/status, seat location and student ID, CCCD, then Present/Absent controls. Attendance UI uses seat positions rather than PC labels. Lecturer attendance fixtures use Vietnamese student names. Fixture CCCD values, seat locations and avatar initials are synthetic and must never be presented as real identity data; replace them with authenticated roster fields when the backend exposes student photos and identity details.
For every shift that has not started—including a shift labeled `Today`—Room & location, Invigilators and Candidates form a compact information block directly beneath the subject name on the left. They must not appear as a separate full-width row below the action cluster.
Semester history navigation displays three semester tabs at a time, from Fall to Spring. Because Fall 2026 is the newest available semester, its group shows only the older-semesters arrow immediately after Spring 2026. Older groups show a newer-semesters arrow before their first tab and, when more history exists, an older-semesters arrow after their third tab. Each move changes one three-semester group and selects its first semester. Group changes use a short slide/fade transition that is disabled under `prefers-reduced-motion`.

All cards use a clearly visible neutral border instead of a faint default ring. On Exam Schedule cards, the `EXAM CODE` panel sits above the actions; `View seating map` and `Attendance` share one row beneath it.

Admin, Lecturer and Examiner are standard staff-facing roles. Their workspaces must not expose personal assistive-mode controls, TTS/voice-reading controls, accessibility scoring, A11y filters, sonification controls or disability-specific UI. Preserve normal web accessibility engineering—semantic HTML, keyboard operation, visible focus, labels, announcements and adequate contrast—because those are product-quality requirements rather than an assistive mode. Student accommodation information may only appear when it is a necessary operational requirement explicitly requested for an exam workflow.

The shared brand lockup has no dark backing panel. FPT University and LearnAble stay on one row with a thin vertical navy separator between them; the FPT asset is larger and never cropped, LearnAble uses the single system orange `#f26f21`, and the dynamic role label sits below it. Apply the same lockup to auth pages, every staff sidebar/drawer and mobile header.

Components may combine selective shadcn/ui with direct semantic HTML and Tailwind/CSS when the latter matches Stitch more accurately. Lucide is the default icon set; add no more than one external icon library, and only when Lucide has no suitable icon.

The complete FPT logo and orange LearnAble wordmark share one row. The logo remains `object-contain`, visibly larger than LearnAble and never cropped; the authenticated role is dynamic and appears beneath LearnAble.

## Deployed read contract

Swagger: https://backend-learnable.onrender.com/swagger/index.html. API base: `/api/v1`; `.env` uses the same-origin Vite proxy. Never reference the local backend checkout without an explicit request.

`src/api/lecturer.ts` validates the envelope `{ success, message, data }`. Pagination data contains `items`, `pageNumber`, `pageSize`, `totalCount`, `totalPages`, `hasPreviousPage` and `hasNextPage`. Questions query `CreatedBy`; materials query `UploadedBy`. Both use `SearchTerm`, `TopicId`, `Status`, `PageNumber`, `PageSize` and `SortBy` when applicable. Type queries follow their Swagger names. Course selection narrows Topics; it does not assume Subjects are CourseSections or invent an unsupported course filter.

Loading, empty, failed request, retry and expired session states are explicit. No real list mixes in fixture rows after an error. The total summary reflects the current query, not an unavailable aggregate. Exam/student usage and global statistics remain unavailable when no endpoint exists. Staff workspaces do not display A11y scores or TTS readiness.

The purpose-split question workspaces currently use separate English simulation datasets for UI validation; never merge or cross-label exam and practice rows. A future backend contract must expose a question `Purpose` with values `Exam` or `Practice` so each workspace can request its own records. `sourceType` describes provenance such as `Manual` or `Import`; it must not be reused to infer or store question purpose.

## Writes deliberately not connected

Question publishing/editing, import/export, bulk operations, material upload, OCR, AI and attendance writes only announce that the feature is not connected. They never submit a write or report backend success. Seat selection and filters change presentation only.

Upload accepts local PDF, DOCX, PPTX, MP3, MP4 and EPUB files. Filename/size are actual local metadata. No checksum, upload progress or OCR result is fabricated. Upload state and files last only for the session; unsaved navigation is guarded. Question drafts store text per user and per purpose in browser storage; exam and practice drafts use separate keys and must never overwrite or restore into the other workflow. Diagram images must be reselected after reload. Delete saved assessment drafts on shared computers.

## Verification

`npm run lint`, `npm run build`, `npm run test`, and `node scripts/check-contrast.mjs` verify source and tokens. Browser audit artifacts live under `.impeccable/review`; `browser-audit.json` records the seven pages at desktop 1600px and mobile 390px, axe findings, overflow and read/write requests. Automated accessibility checks do not replace manual assistive-technology review.
