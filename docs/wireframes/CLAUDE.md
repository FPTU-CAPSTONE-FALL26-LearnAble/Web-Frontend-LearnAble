# Desktop exam app – project guide for Claude Code

<!-- Merge this into the CLAUDE.md that `/init` generates. Keep the build/test commands /init writes. -->

## Product context
- Accessible exam system for visually impaired students (moderate / severe low vision, blind).
- This repo: **Electron desktop exam app (Windows)**, runs full screen in kiosk mode.
- Backend: ASP.NET Web API + PostgreSQL; real-time exam-day events over **WebSocket**; files on AWS S3.
- Requirements source: Report 3 SRS. Feature specs live in `docs/specs/`, wireframes in `docs/wireframes/`.
  Always read the spec for the feature (e.g. `docs/specs/FR-37-device-check.md`) before planning.

## Non-negotiable rules
- **BR-09 – two layers on every student screen:** visual layer (large text, zoom, high contrast, large targets)
  AND semantic layer fully operable with NVDA / Windows Narrator and the keyboard only. WCAG 2.1 AA.
- **BR-19 – every custom keyboard shortcut uses Ctrl.** Shared keymap:
  - Ctrl+1…4 select A–D (on device check: Ctrl+1 heard / Ctrl+2 not heard)
  - Ctrl+← / Ctrl+→ previous / next (question, or camera / audio output on device check)
  - Ctrl+5 replay / repeat what was last spoken
  - Ctrl+Enter submit answer / primary action of the screen
  - Ctrl+Shift+Enter submit exam
  Keep all shortcuts in ONE keymap module shared by every exam screen. Never add a shortcut without Ctrl.
- Every student action is confirmed by audio within 1 s (TTS + `aria-live`).
- Use real `<button>`, `<a href>`, `<input>`/`<select>` with `<label>`. Never `onClick` on a div/span.
  Icon-only buttons need `aria-label`. Status → `aria-live="polite"`; errors → `role="alert"`.
- Do not show spoken scripts as on-screen "Now speaking" panels; speak them and expose them via `aria-live`.
- Exam content is delivered only when the lecturer opens the exam (BR-01). Answers auto-save continuously;
  on reconnect go straight back to the exam with saved answers (BR-15).

## UI layout convention (from wireframes)
- One centred column card: header band (step / context) → content → status band → one primary action.
- Secondary info (keyboard hints, step / status bar) sits at the bottom of the screen.
- Top bar: student ID, connection status, exam name, shift time.

## Messages (use these exact texts)
| ID | When | Text |
|---|---|---|
| MSG11 | Waiting, not checked in | You are not checked in yet. Please wait for the lecturer to check you in. |
| MSG12 | Checked in, exam not opened | You are checked in. The exam will start when the lecturer opens it. |
| MSG13 | Lecturer opens the exam | The exam has started. You have {minutes} minutes. Question 1 of {total}. |
| MSG14 | Answer selected / changed | Answer {option} selected for question {number}. |
| MSG15 | Camera or hand not detected | Hand not detected. Keyboard input is now active. |
| MSG16 | Student leaves the camera frame | Please return to the camera frame. |
| MSG17 | Student asks to submit | You answered {answered} of {total} questions. Press Ctrl+Shift+Enter again to submit, or Escape to continue. |
| MSG18 | Five minutes left | Five minutes remaining. |
| MSG19 | Exam submitted | Your exam has been submitted. Please wait for the lecturer to check you out. |

## Engineering conventions
- Screen flows are **pure state machines** separate from UI, with unit tests that use fake devices.
- Media: `navigator.mediaDevices` (`enumerateDevices`, `getUserMedia` with `deviceId: { exact }`),
  audio output via `HTMLMediaElement.setSinkId`. Media permission is granted in the main process
  (`session.setPermissionRequestHandler`), not by prompting the student.
- Person detection: one shared model/service used by both device check and in-exam proctoring.
- Keep renderer code free of Node APIs; expose what is needed through a typed preload bridge.

## How to work
- Plan first for any new screen or flow: list files to create/change and wait for approval.
- Work in small steps (logic + tests → services → UI → audio/aria → integration), one commit per step.
- After a change, run the unit tests. Remind me which parts need a manual NVDA / Narrator check –
  screen-reader behaviour cannot be verified automatically.
- Commit messages reference the Jira key, e.g. `FFCB-207: add device check state machine`.
