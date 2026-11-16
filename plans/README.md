# Implementation Plans

Generated on 2026-09-21. Execute in the order below. Each executor must read
the plan fully, honour its STOP conditions, and update its status when done.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001 | Consolidate the cross-platform primitive layer | P1 | L | — | DONE |
| 002 | Migrate the assessment player demo route to desktop | P1 | M | — | IN PROGRESS (web steps 1–2 done) |

## Dependency notes

- This is intentionally a single migration: introducing a second canonical
  directory or a long-lived compatibility wrapper would preserve the problem
  the work is intended to remove.

## Findings considered and rejected

- Keeping `src/components/ui/` as a permanent web-only staging directory: rejected because it duplicates the
  already-synced primitive contract and leaves feature code with two valid import paths.
