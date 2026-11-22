# FR-37 · Device Check (SCR-21) → Exam Waiting Screen (SCR-22)

- **Jira:** FFCB-196 (story) · FFCB-207 (FE-Desktop subtask) · FFCB-208 (QA test cases)
- **Epic:** FFCB-5 – EP-05 Làm bài thi trên Desktop App (Student)
- **Source:** Report 3 SRS – UC-09, UC-13, SCR-21, SCR-22, §3.2.3, §4.1, BR-09, BR-11, BR-15, BR-19, MSG11–MSG16
- **App:** Electron desktop exam app (Windows), kiosk / full screen
- **Wireframes:** `docs/wireframes/` (exported from the "FR-37 Device Check – Desktop" design canvas)

---

## 1. User story & acceptance criteria

> As a student, I want to be guided to check my camera and audio output before the exam, so that I know my devices work.

| # | Acceptance criterion |
|---|---|
| AC1 | Every step is guided by audio. |
| AC2 | The camera check confirms that the camera sends an image **and** that a person is detected in the frame. |
| AC3 | A test sound is played; the student confirms they heard it **with a key**. |
| AC4 | If a device fails, the app says so and **does not allow** the student to reach the waiting screen until it is fixed. |

---

## 2. Trigger & navigation

```
SCR-02 Desktop Login
   └─(student has a shift today)─► SCR-21 Device Check
          01 Intro
          02 Camera ──fail──► 02b Camera error ──Ctrl+Enter retry──► 02
          03 Speakers ──fail──► 03b Speaker error ──Ctrl+Enter retry──► 03
          04 Done
   └─► SCR-22 Exam Waiting Screen
          MSG11 not checked in ─► MSG12 checked in ─► MSG13 exam opened ─► SCR-23 Exam Taking
```

- No shift for the student right now → SCR-22 "No exam now" state (announce, offer log out). Device check is skipped.
- **Reconnect while an exam attempt is in progress → go straight to SCR-23 with saved answers** (UC-18, BR-15). Do not re-run device check or the waiting screen.

---

## 3. State machine (implement as pure, UI-independent logic)

| State | Entry action | Events → next state |
|---|---|---|
| `intro` | Speak intro script | `CONFIRM` (Ctrl+Enter) → `camera` · `REPEAT` (Ctrl+5) → `intro` |
| `camera` | Scan camera sources (see §4), run checks | all checks pass → `cameraOk` · every source failed → `cameraError` |
| `cameraOk` | Speak camera-ok script | `CONFIRM` → `audio` · `SWITCH_PREV/NEXT` (Ctrl+←/→) → `camera` with chosen source · `REPEAT` |
| `cameraError` | Error sound + speak error script with reason | `CONFIRM` (retry) → `camera` · `REPEAT` |
| `audio` | Select output (see §5), play test tone, speak question | `HEARD` (Ctrl+1) → `done` · `NOT_HEARD` (Ctrl+2) → next untried output → `audio`; none left → `audioError` · `REPEAT` (Ctrl+5) replays tone · `SWITCH_PREV/NEXT` → `audio` with chosen output · no key for 15 s → re-speak question |
| `audioError` | Speak error script | `CONFIRM` (retry) → `audio` (reset tried list) · `REPEAT` |
| `done` | Speak done script, start 5 s countdown | countdown end or `CONFIRM` → navigate to SCR-22 |

Rules:
- `done` is reachable **only** if camera and audio both passed in this run.
- Store the result (`cameraDeviceId`, `audioOutputDeviceId`, `gestureAvailable`) so the exam screen reuses the same devices.
- Counters to show on error screens: attempt number, devices tried.

---

## 4. Camera check (state `camera`)

1. Request camera permission (`getUserMedia({ video: true })`) so device labels are available, then `navigator.mediaDevices.enumerateDevices()` → `videoinput` list.
2. **Exclude virtual cameras** (label heuristic: `OBS`, `Virtual`, `ManyCam`, `Snap Camera`, …). ⚠️ Heuristic only – keep the list in config.
3. Order: OS default first, then the rest. For each source until one passes:
   - **Image received:** stream opens and frames are not black / frozen (sample a few frames).
   - **Person in frame:** person detection finds **exactly 1** person. 0 → "No person detected"; 2+ → "More than one person".
   - **Hand gesture input** (informational, does not block): if the hand model cannot run → record `gestureAvailable = false` and announce MSG15 ("Hand not detected. Keyboard input is now active.").
4. Reuse the **same person-detection model** that proctoring uses during the exam (do not build a second one).
5. Student can switch source with Ctrl+←/→ or the `<select>`; each switch re-runs the checks and announces "‹camera name›, N of M".
6. Error reasons (shown and spoken): `No camera found` · `No image` · `No person detected` · `More than one person`.

## 5. Audio output check (state `audio`)

1. `enumerateDevices()` → `audiooutput` list; system default first.
2. Play the test tone through an `HTMLAudioElement` with `setSinkId(deviceId)`.
3. Ctrl+1 = heard → pass. Ctrl+2 = not heard → switch to the next untried output, announce "‹output name›, N of M", replay. All tried → `audioError`.
4. No output device at all → go to `audioError` immediately (no question).
5. The spoken guide itself plays on the output being tested – so on `audioError` the **on-screen large text is the main channel**; the lecturer is the fallback ("raise your hand").

---

## 6. Keyboard (BR-19 – every custom shortcut uses Ctrl)

| Key | Meaning on these screens |
|---|---|
| Ctrl+Enter | Start / Continue / Try again / Go now / Log out (primary action of the screen) |
| Ctrl+1 | I hear the test sound |
| Ctrl+2 | I don't hear the test sound |
| Ctrl+5 | Repeat guide / replay test sound / repeat status |
| Ctrl+← / Ctrl+→ | Previous / next camera or audio output |

- Put these in **one shared keymap module** with the exam screen (SCR-23) so meanings stay consistent.
- Every shortcut also has a real `<button>` / `<a>` / `<select>` on screen (BR-09).

---

## 7. Accessibility (BR-09, WCAG 2.1 AA)

- Two layers on every screen: visual (large text, high contrast, large targets) **and** semantic (fully operable with NVDA / Windows Narrator + keyboard).
- Status and instructions are announced through an `aria-live` region (`polite` for status, `role="alert"` for errors) **and** TTS. The spoken text is **not** shown as a separate "Now speaking" panel on screen.
- Every action is confirmed by audio within 1 s.
- Layout: one centred column (card) – header band (step), content, status band, primary action; keyboard hints and the step bar sit at the bottom of the screen.

---

## 8. Audio scripts (TTS)

| Screen | Script |
|---|---|
| 01 Intro | "Device check. We will check your camera and your speakers. Press Ctrl+Enter to start. Press Ctrl+5 to hear this again." |
| 02 Camera | "Step 1, camera. Sit facing the screen… Camera is working. One person detected. Press Ctrl+Enter to continue." (while checking: "Checking camera, please wait.") |
| 02b Camera error | "Camera problem. ‹reason›. Check your webcam and sit facing the screen, then press Ctrl+Enter to try again. If it still fails, raise your hand to call the lecturer." |
| 03 Speakers | "Step 2, speakers. A test sound will play now. ‹tone› If you heard it, press Ctrl+1. If not, press Ctrl+2. Press Ctrl+5 to play it again." |
| 03b Speaker error | "Sound not confirmed. Check that your headphones are plugged in and the volume is up, then press Ctrl+Enter to test again. If you still hear nothing, raise your hand to call the lecturer." |
| 04 Done | "Device check complete. Your camera and speakers are working. Going to the waiting screen. Press Ctrl+Enter to go now." |
| Device switch | "‹device name›, N of M." |

---

## 9. SCR-22 Exam Waiting Screen (Report 3 §3.2.3)

- Large-text panel: exam name, subject, shift time, room, seat. Status line in an `aria-live` region; Ctrl+5 repeats it.
- **No student action needed.** State follows the assignment, pushed in real time over WebSocket:

| State | Message |
|---|---|
| Not checked in | MSG11 "You are not checked in yet. Please wait for the lecturer to check you in." |
| Checked in | MSG12 "You are checked in. The exam will start when the lecturer opens it." |
| Exam opened | MSG13 "The exam has started. You have {minutes} minutes. Question 1 of {total}." → open SCR-23 |
| No shift now | "There is no exam now." + Log out (Ctrl+Enter) |

- Exam content is delivered only when the exam is opened (BR-01). If the app is offline when the exam opens, the session starts on reconnect with the remaining time.

---

## 10. Test scenarios (seed for FFCB-208)

1. 1 camera OK + 1 output, student presses Ctrl+1 → reaches SCR-22.
2. No camera connected → 02b "No camera found"; plug in → Ctrl+Enter → passes.
3. Camera covered (black image) → 02b "No image".
4. Student out of frame → 02b "No person detected"; second person in frame → "More than one person".
5. 2 cameras, default fails, second OK → auto-selects second, no error shown.
6. Virtual camera present → not listed.
7. Hand model unavailable → MSG15 announced, check still passes, `gestureAvailable = false`.
8. 3 outputs, Ctrl+2 twice then Ctrl+1 → passes on output 3, announces each switch.
9. 2 outputs, Ctrl+2 twice → 03b with "Outputs tried 2 of 2".
10. No output device → 03b immediately.
11. Ctrl+5 on every screen repeats the script / replays the tone.
12. Cannot reach SCR-22 by any key or click while camera or audio has not passed.
13. Whole flow with NVDA and with Narrator, keyboard only.
14. Reconnect during an exam → goes straight to SCR-23, skips device check.

---

## 11. Open questions (confirm before implementing)

1. **Camera failure – block or fallback?** AC4 says block. Report 3 §4.1 / UC-13 say the app works without a camera by switching to keyboard input and flagging the session; UC-40 proctoring policy decides what happens when the camera is unavailable. → Should the block depend on the exam's proctoring policy ("camera required")?
2. Ctrl+1 / Ctrl+2 for heard / not heard, the 15 s auto-repeat and the 5 s countdown are design assumptions, not in Report 3.
3. Virtual camera blocklist – who maintains it?
4. Should device-check results (devices used, attempts, failures) be logged to the session log for examiners (UC-45)?
