# Plan 002: Migrate the assessment player demo route to the desktop app

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat eb952f4..HEAD -- src/features/demo/routes/AssessmentPlayerDemoRoute.tsx src/shared/ui/patterns/exam src/shared/ui/primitives src/shared/strings`
> and, in the desktop repo, `npm run sync:check`. If either shows changes
> not described in "Current state", compare before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (changes the public `src/shared/` API consumed by desktop)
- **Depends on**: none
- **Category**: migration
- **Planned at**: web commit `eb952f4` (`feat/exam-question-types`), desktop
  synced from `86d0651` (`feat/kbd-primitive`), 2026-10-24

## Goal

Run the assessment player currently at web `/demo/assessment-player` inside
the Electron app, without hand-maintaining a second copy of the player.

## Current state

- `src/features/demo/routes/AssessmentPlayerDemoRoute.tsx` (~1 000 lines) is a
  web-only feature route. It contains, all in one file:
  - mock data: `questions: PlayerQuestion[]` (18 items, 15 `QuestionKind`s)
  - answer encoding helpers: `answerState`, `decodedAnswer` (JSON maps,
    `a|b` pipe-joined composites, comma lists)
  - `QuestionResponse` (true/false radio group)
  - `AdvancedPlayerQuestion` (dispatch for text/numeric/essay/textarea/
    upload/hotspot/graphic-text/matching/composite kinds)
  - `AssessmentPlayerHeader`, `AssessmentPlayerFooter` (question strip,
    prev/next, contents, review)
  - the options overlay (`Dialog`), contents/review `Table`, and the
    `AssessmentPlayerDemoRoute` state container (index, answers, flagged,
    view, filter).
- Its only imports are `@/shared/ui/primitives/*`,
  `@/shared/ui/patterns/exam/*`, `@/shared/ui/cn` and `lucide-react` — all of
  which already exist in desktop (`src/renderer/shared/`) and are in sync
  (only the `SYNCED FROM` header differs).
- The `Web-Frontend-LearnAble` and `web-info-token` copies of the route
  differ only in Prettier formatting.
- Desktop (`DesktopApplication-Frontend-Learnable`):
  - hash router in `src/renderer/app/router.tsx`, Vietnamese slugs.
  - `features/demo/DesktopHomeDemoRoute.tsx` already links cards to
    `/thi-thu` (mock exam), which has **no route** today — the natural
    landing spot for the player.
  - `src/renderer/public/economist-portrait.png` exists at the public root;
    web references `/assets/exam/economist-portrait.png`.
  - packaged build loads from `file://`, so absolute `/assets/...` URLs break.
- Hard-coded English UI copy in the route (header, options, filters, table
  headings, "Your answer is saved as you work.") is not in `src/shared/strings`.

## Approach (decision)

**Lift the player UI into the shared exam pattern layer on web, sync it to
desktop, and keep only thin route wrappers + mock data in each app.**

Rejected alternative: copy the route file into desktop `features/`. It works
in an hour but creates two implementations of the same screen, which
`AGENTS.md` and `UI_SYNC.md` explicitly forbid (web is the source of truth,
one-way sync). Every later fix would have to be made twice.

## Steps

### 1. Web — extract the player into `src/shared/ui/patterns/exam/`

Split by responsibility; no behaviour change.

| New file | Content moved from the route |
|---|---|
| `assessment-player-types.ts` | `QuestionKind`, `PlayerQuestion`, `Answers`, `PlayerView`, `PlayerFilter`, `answerState`, `decodedAnswer` |
| `TrueFalseQuestion.tsx` | the `boolean` branch + `QuestionResponse` (make it a real pattern with `questionNumber`, `stem`, `flagged`, `onToggleFlag`, `onReset`, like its siblings) |
| `PlayerQuestion.tsx` | one dispatcher: `{ question, questionNumber, answer, flagged, onAnswerChange, onReset, onToggleFlag }` → renders the right pattern. Absorbs the `single`/`multi`/`inline` branches from the route body and `AdvancedPlayerQuestion`. |
| `AssessmentPlayerHeader.tsx` | header; candidate id/name and connection status become props |
| `AssessmentPlayerFooter.tsx` | footer as-is |
| `AssessmentPlayerOptions.tsx` | options overlay; each row gets an `onSelect` callback prop (currently dead buttons) |
| `QuestionContentsTable.tsx` | contents/review table |
| `AssessmentPlayer.tsx` | composition + view/filter/index state. Answers and flags are **controlled** (`answers`, `flagged`, `onAnswerChange`, `onToggleFlag`, `onStartOver`) so desktop can wire autosave later. Props also: `questions`, `sectionTitle`, `candidate`, `connectionStatus`, `onSubmit`. |

Rules while extracting:

- No imports from `@/features`, `@/api`, `@/app`, `@/lib`, `@/mocks` (the
  `check:ui` script enforces this).
- Question-specific fixture data now hard-coded inside the dispatcher
  (hotspot coordinates, matching targets, inline-choice segments/slots,
  composite sub-options, the `"bits"` suffix) moves onto `PlayerQuestion`
  as optional typed fields (`hotspots`, `targets`, `segments`, `slots`,
  `parts`, `suffix`). The dispatcher must not branch on `question.id`
  (today it does for `tf-mqr` / `numeric-mcq`) — add a `compositeVariant`
  field instead.
- Images come in as `question.image.src`; the pattern never builds a URL.
- Move all UI copy into `src/shared/strings/en.ts` under `exam.player.*`
  and read it through the existing `vi` alias, as sibling patterns do.

### 2. Web — make the demo route a thin wrapper

`src/features/demo/routes/AssessmentPlayerDemoRoute.tsx` keeps only:
`mockPlayerQuestions` (move to `src/features/demo/data/assessmentPlayer.ts`),
`useState` for answers/flags, and `<AssessmentPlayer … />`.

Verify (web):

```powershell
npx vitest run src/features/demo/routes/AssessmentPlayerDemoRoute.test.tsx
npm run lint; npm run test; npm run build; npm run check:ui
```

The 6 existing route tests (including the axe check) must pass unchanged —
that is the proof the extraction did not change behaviour. Add pattern tests
under `src/shared/ui/patterns/exam/tests/` for `PlayerQuestion` (one render
per kind) and `AssessmentPlayer` (navigation + filter), since these now ship
to desktop and run there too.

### 3. Desktop — sync

After the web PR is reviewed/merged, in `DesktopApplication-Frontend-Learnable`
on a fresh branch (e.g. `feat/assessment-player`, cut from `main`, not from
`feat/device-check` which has uncommitted work):

```powershell
npm run sync:ui -- ../Web-Frontend-LearnAble
npm run sync:check
npm test
```

Commit `src/renderer/shared/` and `.ui-sync.json` together in one commit
(`chore(ui): sync assessment player from web`).

### 4. Desktop — add the route

- `src/renderer/features/demo/data/assessmentPlayer.ts`: desktop mock
  questions. Import the image through Vite so it resolves under `file://`:
  `import portrait from "@/public/economist-portrait.png"` (or move the PNG to
  `src/renderer/assets/exam/` and import it there) — do **not** use
  `"/assets/exam/..."`.
- `src/renderer/features/demo/AssessmentPlayerDemoRoute.tsx`: same thin
  wrapper as web, plus `useRouteAnnouncer(...)` like `DesktopHomeDemoRoute`.
- `src/renderer/app/router.tsx`: register `{ path: "/thi-thu", element: <AssessmentPlayerDemoRoute /> }`
  so the existing home-screen cards work. Optionally also
  `/desktop-demos/assessment-player` for direct access.
- Port `AssessmentPlayerDemoRoute.test.tsx` to
  `src/renderer/features/demo/AssessmentPlayerDemoRoute.test.tsx`, wrapping in
  `MemoryRouter` the same way.

Verify (desktop):

```powershell
npm run typecheck; npm test; npm run sync:check; npm run build
npm run dev   # open #/desktop-demos/home → card → /thi-thu
```

Manual check in the Electron window: image renders, options overlay covers
the window, footer strip scrolls, prev/next works, Tab order and focus rings
are intact, and NVDA reads question buttons as "Question N Answered/Not
attempted [Flagged]".

### 5. Desktop — follow-ups (separate PRs, out of scope here)

- Wire `onAnswerChange` to `features/exam/hooks/useAutoSave` and real
  `useSessionQuestions` data inside `ExamRoute` (replacing `QuestionCard`/
  `AnswerOptionList` there), plus the timer and "Hide remaining time" option.
- Keyboard shortcuts via `lib/keymap` (next/prev/flag/review) — needs the
  shortcut map defined in shared strings first.
- Hook the options rows (language, contrast, text size) to real settings.

## STOP conditions

- `npm run sync:check` fails before step 3 (hand-edited desktop copy) — fix
  upstream first.
- Extraction needs a new runtime dependency in `src/shared/` that desktop's
  `package.json` lacks.
- Any existing desktop caller of a changed shared export
  (`grep -r "patterns/exam" ../DesktopApplication-Frontend-Learnable/src/renderer`)
  would break.
- The existing route tests need assertion changes to pass.

## Open decision

Desktop was last synced from `web-info-token` (`feat/kbd-primitive`,
`86d0651`), but this route's newest edits live uncommitted in
`Web-Frontend-LearnAble` (`feat/exam-question-types`, formatting only, plus a
`button.tsx` `icon-xl` max-size tweak). Pick one branch to do step 1 on and
land both into it first, or the next sync will drop one side's changes.
