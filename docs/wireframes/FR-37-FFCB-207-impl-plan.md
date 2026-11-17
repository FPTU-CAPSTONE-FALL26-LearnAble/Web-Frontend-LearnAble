# FFCB-207 · Device Check (SCR-21) — implementation plan (saved for later)

**Status:** planned, not started. Resume after the desktop workspace is cleaned up.
**Target repo:** `DesktopApplication-Frontend-Learnable` (the Electron app) — `@` alias → `src/renderer`, Vitest + jsdom.
**Spec:** [`FR-37-device-check.md`](./FR-37-device-check.md) · **Guide:** [`CLAUDE.md`](./CLAUDE.md)
**Branch note:** the web repo branch `feat/device-check` currently only holds the restored FR-37 spec docs. The code below lands in the **desktop** repo (its own branch, to be created at implementation time).

> ⚠️ The 7 wireframe PNGs (01 Intro, 02/02b Camera, 03/03b Speakers, 04 Done, SCR-22) were lost and must be re-exported from the "FR-37 Device Check – Desktop" design canvas before/while building the UI.

---

## Key findings that shape the design
- **`shared/` is synced from the web repo — do not edit it** (`announcer.ts`, `LiveRegion.tsx`, `strings/en|vi`, primitives carry a "SYNCED — do not edit" banner). Device check is desktop-only, so its code and copy live in `features/` / `lib/`, not `shared/`.
- **No keymap module exists yet.** CLAUDE.md / BR-19 require *one* shared Ctrl keymap reused by every exam screen → create it in `lib/keymap/` (desktop-local, reusable by SCR-23 later).
- **No person-detection model exists yet.** `useProctoring` only logs blur/focus; `lib/gesture/recognizer.ts` detects *hands*, not persons. Spec §4.4 says reuse the model proctoring uses → introduce one shared `PersonDetector` service now (injected into the machine) so proctoring reuses it, rather than building a second one.
- `announce()` + `<LiveRegion>` already provide the aria-live channel. Media permission is already granted in `main/index.ts` (`setPermissionRequestHandler` → `media`).

## Design: pure state machine, dependency-injected, two test layers
A **pure reducer** (synchronous transitions) + a thin **async controller** that calls injected device "ports" and dispatches result events. Makes the simulated-device tests deterministic (ports are faked; no real camera/audio/model needed).

---

## Files to CREATE

**State machine & logic (pure, the core deliverable)**
1. `features/device-check/machine/types.ts` — `State` (`intro·camera·cameraOk·cameraError·audio·audioError·done`), `Event`, `Context` (attempt, cameras/outputs tried, result `{cameraDeviceId, audioOutputDeviceId, gestureAvailable}`), `Ports` interfaces, error reasons.
2. `features/device-check/machine/deviceCheckMachine.ts` — pure reducer: transitions, **`done` reachable only if camera + audio both passed**, counters, audio "next untried output" logic.
3. `features/device-check/machine/deviceCheckMachine.test.ts` — reducer unit tests (transitions, gating invariant).
4. `features/device-check/machine/controller.ts` — async orchestration over `Ports`, emits announcements.
5. `features/device-check/machine/controller.test.ts` — **the simulated-device scenarios:** 0 cameras → `cameraError` "No camera found"; 2 cameras (1 errors) → auto-selects working one, passes; no person → "No person detected"; **3 outputs + Ctrl+2 twice then Ctrl+1 → passes on #3, announces each switch**; 2 outputs + Ctrl+2 twice → `audioError` "2 of 2"; no output → `audioError` immediately; virtual camera excluded; hand model unavailable → `gestureAvailable=false`, still passes; **can't reach `done` while unmet.**

**Device services (port implementations)**
6. `lib/media/cameraProbe.ts` — enumerate `videoinput`, exclude virtual, open stream, sample frames (black/frozen check).
7. `lib/media/audioOutputs.ts` — enumerate `audiooutput`, play tone via `HTMLAudioElement.setSinkId`.
8. `lib/media/virtualCameraBlocklist.ts` — config heuristic (OBS, Virtual, ManyCam, Snap Camera…).
9. `lib/vision/personDetector.ts` — shared `PersonDetector` interface + MediaPipe impl (reusable by proctoring).

**Shared keymap (BR-19)**
10. `lib/keymap/keymap.ts` — pure Ctrl-shortcut → action matcher (Ctrl+Enter/1/2/5/←/→).
11. `lib/keymap/useKeymap.ts` — keydown hook, `preventDefault`, routes to handlers.
12. `lib/keymap/keymap.test.ts` — matcher tests (non-Ctrl ignored).

**UI (one-column wireframe, no styling yet)**
13. `features/device-check/strings.ts` — feature-local copy (scripts §8, error reasons, device-switch "‹name›, N of M").
14. `features/device-check/hooks/useDeviceCheck.ts` — wires controller + real ports + `announce` + keymap.
15. `features/device-check/routes/DeviceCheckRoute.tsx` — renders each state in one column; status via `aria-live` (polite) / `role="alert"` (errors); real `<button>`/`<select>`; step bar + keyboard hints; **navigates to SCR-22 only from `done`.**
16. `features/device-check/routes/DeviceCheckRoute.test.tsx` — render/integration test + axe; verifies no nav control reaches SCR-22 until passed.

**SCR-22 nav target (minimal)**
17. `features/waiting/routes/WaitingRoute.tsx` — minimal SCR-22 (static MSG12 + info panel, Ctrl+5 repeats). *Full WebSocket MSG11→13 is a separate subtask.*

## Files to MODIFY
18. `app/router.tsx` — add `/kiem-tra-thiet-bi` (device check) and `/cho-thi` (waiting) routes.
19. `main/index.ts` — extend permission handling for **speaker-selection** (`setSinkId`) via `setPermissionCheckHandler`, keep `media`.

## Working order (one commit per step, `FFCB-207: …`)
logic+tests → device services → keymap → hook+UI+strings → SCR-22 target → routing+main. Run `npm run test` after each. **NVDA/Narrator behaviour must be checked manually** — it can't be verified automatically.

---

## Assumptions to confirm before coding (spec §11)
1. **Camera failure = hard block** (AC4 + the "02b" wireframe), with a `cameraRequired` config flag (default `true`) as the seam for the UC-13 keyboard-only fallback by proctoring policy.
2. **Ctrl+1/Ctrl+2 = heard/not-heard, 15 s auto-repeat, 5 s done-countdown** are design assumptions (not in Report 3) — proceed as specced.
3. **SCR-22 minimal placeholder** now (nav target + MSG12); full real-time waiting screen later.
4. **New shared `PersonDetector` service** (since none exists) rather than waiting on proctoring.
