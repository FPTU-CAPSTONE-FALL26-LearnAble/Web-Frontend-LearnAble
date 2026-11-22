# Plan 001: Consolidate the cross-platform primitive layer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 8e9f6b3..HEAD -- src/components/ui src/shared/ui src/shared/tokens src/styles/index.css package.json package-lock.json components.json UI_SYNC.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `8e9f6b3`, 2026-09-21

## Why this matters

The web app currently has two independently implemented primitive sets:
`src/components/ui/` is used by staff and authentication screens, while
`src/shared/ui/primitives/` is used by student, practice, results, and the
synced examination surface. They have different APIs, visual tokens, and
sizing behaviour. That allows the same control to behave differently depending
on which route imports it, and makes desktop synchronization unsafe.

After this migration, `src/shared/ui/primitives/` is the sole primitive layer
(A). It supplies safe baseline and large/exam sizing. `src/shared/ui/patterns/exam/`
is the tailored cross-platform layer (B) for the exam shell and question
controls. Feature-owned actor layouts remain outside `src/shared/`.

## Current state

- `UI_SYNC.md:3-19` defines `src/shared/ui/`, `src/shared/a11y/`,
  `src/shared/tokens/`, and `src/shared/strings/` as the only four synced
  folders. In particular, shared code must not import from `features`, `lib`,
  `api`, or `mocks`.
- `src/components/ui/` contains the staff/auth shadcn-style set: alert dialog,
  alert, avatar, badge, button, card, checkbox, input, label, progress,
  radio group, select, separator, sheet, table, and textarea. These components
  currently import `cn` from `@/lib/utils`.
- `src/shared/ui/primitives/` contains a second set: `Button`, `Card`,
  `Checkbox`, `Dialog`, `Input`, `RadioGroup`, `Select`, and `Toast`.
  Its `Button` only exposes `primary | secondary | danger | ghost`; the
  component-ui button also exposes `default | outline | secondary | ghost |
  destructive | link` plus sizes. Neither API is currently canonical.
- `src/shared/ui/patterns/ExamShell.tsx:33-111` already represents the common
  exam/practice shell. It uses direct question-nav `<button>` elements and the
  shared `Button` for previous/next controls, so it is the correct place for
  exam-specific control defaults rather than individual screens.
- `src/shared/ui/primitives/Button.test.tsx` demonstrates the local test
  convention: Vitest + Testing Library + `expectNoAxeViolations`.
- The application’s verified commands are in `package.json`: `npm run lint`,
  `npm run test`, `npm run build`, and `npm run check:ui`.

### Required architecture

```text
src/shared/
  ui/
    cn.ts
    primitives/              # A: the only primitive import path
    patterns/
      exam/                  # B: only platform-neutral exam compositions
  tokens/
  a11y/
  strings/

src/features/<actor>/components/  # actor- or web-specific compositions only
```

Use semantic sizing, not actor names, in primitives: `size="default"` and
`size="exam"` (plus an `icon` form only when it is at least 44×44px).
Every interactive primitive must retain the documented minimum 44×44px target,
visible focus, programmatic labels, and non-colour state cues. B may choose
`size="exam"` by default; A must not encode `lecturer`, `examiner`, or route
knowledge.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Check working tree | `git status --short` | Only the executor’s intended changes plus the pre-existing docs changes reported by the operator |
| Find old imports | `rg -n '@/components/ui|@/shared/ui/primitives/[A-Z]' src` | No matches after the migration |
| Lint | `npm run lint` | Exit 0 |
| Tests | `npm run test` | Exit 0, including new primitive and exam-pattern tests |
| Typecheck/build | `npm run build` | Exit 0 |
| Design checks | `npm run check:ui` | Exit 0 |

## Scope

**In scope**

- `src/shared/ui/cn.ts`, `src/shared/ui/primitives/**`, and their unit tests.
- `src/shared/ui/patterns/**`, including a new `patterns/exam/` folder.
- All imports under `src/app/`, `src/components/`, and `src/features/` that
  point to either old primitive directory.
- `src/components/ui/**` only for removal after all callers migrate.
- `src/shared/tokens/tokens.css` and `src/styles/index.css` only to provide
  tokens required by the single primitive contract.
- `package.json`, `package-lock.json`, `components.json`, and lint rules only
  if required to remove obsolete primitive dependencies or enforce the new
  import boundary.
- `UI_SYNC.md` and `DESIGN.md` only to document the final ownership model.

**Out of scope**

- Feature behaviour, API calls, routing, fixture data, and actor-specific
  layout redesigns.
- Copying files into `DesktopApplication-Frontend-Learnable` or changing the
  desktop app. This web repository remains the source of truth; desktop sync
  happens after this branch is reviewed.
- The existing unrelated deleted root Markdown files and untracked `docs/`
  directory. Preserve them exactly as found.
- Adopting the whole `feat/exam-shell` branch. It is a reference for its
  components only; merging it would pull unrelated route and theme work.

## Git workflow

- Work on the already-created `fix/ui-primitives` branch.
- Make one commit per logical stage, using the existing conventional style,
  for example `feat(ui): consolidate shared primitives`.
- Do not push, open a PR, or synchronize the desktop app unless separately
  instructed.

## Steps

### Step 1: Lock the contract and audit desktop consumers before changing APIs

Read `UI_SYNC.md` and inventory the desktop repository’s imports of the
existing shared primitive files. Record, in the PR description or a short
compatibility note, every exported symbol and prop shape currently consumed by
desktop. Treat the desktop consumers as callers of a public API.

Choose lowercase shadcn-compatible filenames inside
`src/shared/ui/primitives/` (for example `button.tsx`, `dialog.tsx`) and
update all web imports to that one path. Add a single `index.ts` only if it
makes exports clearer; do not retain per-component re-export wrappers under
the old PascalCase filenames.

**Verify**: `rg -n '@/shared/ui/primitives/(Button|Card|Checkbox|Dialog|Input|RadioGroup|Select|Toast)' src` lists only intentional transitional files before migration; the compatibility inventory names every desktop call site.

### Step 2: Establish A as the sole shared primitive implementation

Port the behaviour needed from `src/components/ui/` into
`src/shared/ui/primitives/`, adapting every import so shared files use only
third-party packages or `@/shared/...`. In particular, replace
`@/lib/utils` with `@/shared/ui/cn` and do not let shared files import feature
or application code.

Keep the stronger accessibility behaviour from the existing shared controls:
default button `type="button"`, label/hint/error linkage for inputs, dialog
title/description semantics, Radix focus management, and Vietnamese strings
from `src/shared/strings/` where the component supplies copy. Preserve the
useful generated controls that have no current shared equivalent (alert dialog,
avatar, badge, label, progress, separator, sheet, table, textarea) only if
they are genuinely primitive and platform-neutral. Do not move a feature
layout into the shared tree.

Normalize the public API deliberately rather than copying both APIs. Use one
button variant vocabulary: `primary`, `secondary`, `outline`, `ghost`,
`danger`, and `link`; document any necessary mapping from the old `default`
and `destructive` names at call sites. Expose `default`, `exam`, and accessible
icon sizes. No size may be below 44×44px. For inputs and comparable controls,
provide a `density` or `size` option only where it changes an actual control
dimension; do not add meaningless props everywhere.

**Verify**: `rg -n 'from "@/lib/|from "@/features/|from "@/api/|from "@/mocks/' src/shared` returns no matches; `npm run lint` exits 0.

### Step 3: Build B as reusable exam patterns, not a second primitive library

Move the existing examination patterns into `src/shared/ui/patterns/exam/`:
`ExamShell`, `QuestionCard`, `AnswerOptionList`, and `SaveStatus` (or keep a
small re-export-free move with corresponding import updates). Add only the
exam-specific composed controls needed to keep screens from manually selecting
large sizes, such as a question-navigation control if its visual state cannot
be represented by A’s generic button.

Make `ExamShell` select A’s `size="exam"` for previous/next/submit-adjacent
controls and its question navigation. Keep its existing slots (`timer`,
`inputModeIndicator`, `submitAction`) because those make desktop and practice
differences explicit without forking the shell. Do not make the primitive
button aware of timers, questions, actor roles, or desktop-only state.

**Verify**: `rg -n '<button|<Button' src/shared/ui/patterns/exam` shows that interactive exam controls either use the canonical primitive or are documented composed controls with a test; `npm run test -- --run src/shared/ui` exits 0.

### Step 4: Migrate all web callers and remove the duplicate directory

Update every import beneath `src/app/`, `src/components/`, and `src/features/`
to the canonical shared primitive paths. Translate old variant names and sizes
explicitly at each call site; do not use global CSS overrides to silently alter
staff screens. Staff/auth screens should generally use `size="default"`; only
the cross-platform exam patterns should select `size="exam"` by default.

Once no callers remain, delete `src/components/ui/`. Do not leave it as a
barrel, alias, symlink, or compatibility wrapper. Update `components.json` so
future shadcn generation targets `src/shared/ui/primitives/`, or document that
the CLI must not generate directly into the repository until its configuration
can express this safely.

**Verify**: `rg -n '@/components/ui|@/shared/ui/primitives/[A-Z]' src` returns no matches; `Test-Path src/components/ui` returns `False`.

### Step 5: Add enforcement and characterization coverage

Add tests beside the canonical primitives for button type and all sizes,
input label/hint/error associations, checkbox/radio/select keyboard semantics,
dialog title and focus behaviour, and the components newly migrated from the
former directory. Add exam-pattern tests that assert the rendered previous,
next, and question-navigation controls carry the exam-size contract and remain
keyboard accessible.

Add an ESLint restricted-import rule (or an equivalent existing lint mechanism)
that forbids `@/components/ui/*` imports and forbids shared code from importing
outside `@/shared/*` other than approved third-party packages. Update
`UI_SYNC.md` and `DESIGN.md` to say: A is the canonical shared primitive layer;
B is shared only for platform-neutral examination patterns; actor-specific B
belongs under its feature.

**Verify**: `npm run test && npm run lint && npm run build && npm run check:ui` all exit 0.

## Test plan

- Extend the existing pattern in `src/shared/ui/primitives/Button.test.tsx` and
  `Input.test.tsx`; preserve axe checks with `expectNoAxeViolations`.
- Add tests for each newly canonical primitive only where it has interactive or
  accessibility behaviour. Pure presentational exports may be covered by their
  consumer tests.
- Add `src/shared/ui/patterns/exam/ExamShell.test.tsx` to cover keyboard
  navigation, announced question changes, 44px-or-greater target class/token,
  and exam-size previous/next controls.
- Run the full commands in the table; the migration must not rely solely on
  visual inspection.

## Done criteria

- [ ] `src/shared/ui/primitives/` is the only primitive directory and has no
  prohibited imports.
- [ ] `src/components/ui/` no longer exists and `rg -n '@/components/ui' src`
  produces no matches.
- [ ] A exposes the documented semantic variants and accessible default/exam
  sizing; no interactive primitive variant is smaller than 44×44px.
- [ ] Cross-platform exam compositions are under `src/shared/ui/patterns/exam/`
  and select their larger controls without duplicating primitive markup.
- [ ] Actor-specific compositions remain outside `src/shared/`.
- [ ] `npm run test`, `npm run lint`, `npm run build`, and `npm run check:ui`
  all exit 0.
- [ ] Only in-scope files plus the executor’s plan-status update are modified;
  pre-existing documentation changes remain untouched.
- [ ] `plans/README.md` marks plan 001 as DONE.

## STOP conditions

- The desktop consumer inventory reveals an API incompatibility that cannot be
  mapped at desktop call sites without changing desktop behaviour.
- The target components require importing a module outside `src/shared/` to
  preserve their present behaviour.
- A supposedly generic component embeds staff workflow logic, API state, or
  browser-only functionality that desktop cannot support.
- The existing dirty documentation changes overlap a file this plan needs to
  edit. Preserve the user’s work and ask for a clean resolution.
- Any required verification command fails twice after a reasonable scoped fix.

## Maintenance notes

- Future shadcn additions must be generated or adapted directly into
  `src/shared/ui/primitives/`; they may not recreate `src/components/ui/`.
- Reviewers should focus on public prop compatibility, 44px target guarantees,
  visible focus, and the absence of imports that would break desktop sync.
- A later desktop synchronization task must run the desktop repository’s
  `pnpm sync:ui` and update desktop call sites there; that operation is
  intentionally deferred from this web-only plan.
