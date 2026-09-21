# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

LearnAble serves FPT University students, lecturers, and staff, including people who use screen readers, keyboard navigation, screen magnification, or reduced-motion settings.

## Product Purpose

LearnAble provides an accessible environment for learning, practice, examinations, progress tracking, and grounded academic assistance. Success means users can complete core academic tasks independently and understand every system state.

## Operating Context

Users sign in with institution-managed accounts and may use the product on personal or campus computers. The web client connects to the LearnAble backend and shares selected UI foundations with the desktop client.

## Capabilities and Constraints

- The product interface and assistive announcements are English-only.
- Authentication currently supports credentials through the backend. Password recovery and Google FPT Mail authentication do not yet have published backend endpoints.
- Mock Service Worker remains available only when explicitly enabled for local development and tests.
- Production hosting over HTTPS requires an HTTPS backend or a same-origin reverse proxy.

## Brand Commitments

LearnAble combines FPT University's institutional identity with a supportive, modern, high-legibility learning experience. FPT orange is the primary action color; deep navy, sky blue, teal, and quiet slate surfaces support it.

## Evidence on Hand

- Approved Login and Forgot Password desktop references are stored under `C:\Users\ADMIN\Downloads\stitch_learn_able`.
- The current backend contract is published at `https://backend-learnable.onrender.com/swagger/index.html`; the API base is `/api/v1`. Local development uses the Vite proxy.
- Lecturer references live in `C:\Capstone2026\Stichs\Lecturer Stichs\stitch_learn_able`.
- Examiner references live in `C:\Capstone2026\Stichs\Examiner Stichs`. The fourteen Examiner routes use English simulation fixtures until deployed exam-operation contracts exist.
- Lecturer Questions, Learning Materials, Subjects and Topics use authenticated read APIs. Dashboard, exam schedules and attendance use English fixtures until corresponding contracts are available.
- Question creation, material upload, publishing, bulk operations, OCR, AI and attendance writes are not connected. Missing aggregate/usage/accessibility metrics must say “Not available”. Never substitute fixtures for failed API lists.
- Do not inspect or edit the local backend checkout without an explicit user request; it may differ from the deployed service.

## Product Principles

- Accessibility engineering is a default, not an optional mode. Admin, Lecturer and Examiner remain standard staff-facing roles and do not receive personal assistive-mode UI.
- Never claim an action succeeded when no backend operation occurred.
- Keep institutional identity recognizable without overwhelming the user's task.
- State errors and recovery actions clearly in visible and announced copy.

## Accessibility & Inclusion

Core reading contrast targets WCAG AAA where practical. Interactive targets are at least 44 by 44 CSS pixels, focus is always visible, motion respects `prefers-reduced-motion`, and important state changes are announced exactly once.
