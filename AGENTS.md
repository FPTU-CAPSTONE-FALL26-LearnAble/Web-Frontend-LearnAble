# LearnAble Web — Agent Guide

## Start here

LearnAble Web is a React 19 + TypeScript + Vite application. It is the source
of truth for the UI shared with `DesktopApplication-Frontend-Learnable`.

Before changing code:

1. Read `DESIGN.md` for product and accessibility rules.
2. Read `UI_SYNC.md` before touching anything under `src/shared/`.
3. Check `git status --short`; preserve unrelated work.
4. Search for existing patterns before adding a component or dependency.

## Architecture and ownership

```text
src/
  app/                    # application shell, providers, router
  features/<domain>/       # web-only routes, state, and actor-specific UI
  shared/                  # web-to-desktop sync boundary
    ui/primitives/         # A: canonical platform-neutral controls
    ui/patterns/exam/      # B: reusable exam/practice compositions
    a11y/ tokens/ strings/ # shared support layers
```

- Import primitives only from `@/shared/ui/primitives/<kebab-case-file>`.
  `src/components/ui/` is retired and must not be recreated.
- A primitive must not know its actor, route, API, or feature state.
- Use `src/shared/ui/patterns/exam/` only for cross-platform exam/practice
  patterns such as `ExamShell` and question navigation.
- Put lecturer, examiner, authentication, and other web-only compositions in
  their feature directories.
- Do not import `@/api`, `@/app`, `@/features`, `@/lib`, `@/mocks`, or
  `@/styles` from `src/shared/`. Pass data through props or move genuinely
  shared code into `src/shared/`.

## Accessibility is a release requirement

- Interactive controls must have a minimum 44×44 CSS-pixel target.
- Use the primitive's semantic sizing API. The target contract includes an
  `exam` size for exam surfaces; until that API is implemented, do not scatter
  new one-off height or padding overrides through feature routes.
- Preserve visible keyboard focus, labels, keyboard operation, explicit error
  text, and non-colour state cues.
- Do not use placeholders as labels or remove focus outlines.
- Keep all UI copy in `src/shared/strings/` when it belongs to synced UI.

## shadcn and Radix changes

- `components.json` is configured to generate into the shared primitive layer.
  Treat generated output as a starting point, not an automatic merge.
- Adapt generated imports to `@/shared/ui/cn` before committing.
- Adding a third-party runtime dependency to `src/shared/` requires checking
  that the desktop app has the compatible dependency before synchronization.
- Do not switch between individual `@radix-ui/react-*` packages and the
  unified `radix-ui` package without updating both host applications.

## Verification

Run the narrowest relevant test while working, then run the full checks before
hand-off:

```powershell
npm run lint
npm run test
npm run build
npm run check:ui
```

If a full check fails for a pre-existing reason, identify the failing file and
show that your change did not touch it. Do not claim the branch is fully green.

## Shared UI synchronization

Changes under `src/shared/` are public API changes for desktop. Before changing
an exported component, inspect desktop callers in
`../DesktopApplication-Frontend-Learnable/src/renderer/`.

Do not edit the desktop copy by hand. After the web change is reviewed, the
desktop repository runs its `npm run sync:ui -- ../Web-Frontend-LearnAble`
command, followed by its tests and `npm run sync:check`.

## Working style

- Keep changes focused; do not reformat unrelated files.
- Add or update tests whenever observable behaviour changes.
- Use conventional commits, for example `fix(ui): restore accessible button sizing`.
- Do not commit generated `dist/`, local credentials, or machine-specific files.
- When requirements conflict or a shared API would break desktop, stop and ask
  for a decision instead of silently preserving two implementations.
