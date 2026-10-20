# Story 006: Screens, settings and HUD

> **Epic**: Hold the Cold
> **Status**: Complete
> **Layer**: Presentation
> **Type**: UI
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-19

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 6`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none (web page, Canvas 2D) n/a | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (MVP 6):*

- [ ] A title screen with the name, a one-line hook, Play, How to play, settings and the seed, and a credits line that names the tool and links its repo.
- [ ] The how-to-play card shows the controls for keyboard, mouse and touch, in the game's voice.
- [ ] Esc or P pauses; the game also pauses when the tab is hidden or the window loses focus, and resumes cleanly. The pause menu shows the controls.
- [ ] Settings: mute (also on M) and reduce flashing, both remembered; reduce flashing is on by default under `prefers-reduced-motion`.
- [ ] At 390×844 the HUD (clock, collection, warmth) reads without overlapping the Work button or any station; no sideways scroll at 390 or 1440.
- [ ] Every menu works with the keyboard alone, with a visible focus ring; icon buttons have `aria-label`s; the score and state changes are announced politely.
- [ ] `window.__game` exposes `seed`, `state()`, `start()`, `step(ms)`, `input(...)` and `snapshot()`.

---

## Implementation Notes

*No ADR at this tier: implement against the acceptance criteria and `design/game-brief.md`.*

---

## Out of Scope

- Story 007: the sound behind the mute switch, and the flashing that the setting reduces.

---

## Files

- `../index.html` — rewritten: field box for the camera, side-panel and phone layouts, HUD (clock, time to dawn, collection with the half line, storm, warmth, fuel), shift log, ticker, WORK button, title, how-to-play, pause and end screens, toggles, icon buttons, live region, corner label, social meta
- `../game.js` — modes (title, playing, paused, over), menus and focus, settings in localStorage, Esc/P/M, auto-pause, rendering stopped while paused, camera fit to the field, crop marks, HUD readouts, WORK button, scroll lock on phones, screen-reader lines, demo keeper for the title, new seed, `__game` getters

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level: minimal`: tests are waived; the look is not.*

**Story Type**: UI
**Required evidence**:
- UI: a retained screenshot of each screen touched (title, how to play, pause, HUD at 390 and 1440), in `production/qa/evidence/story-006-screens-and-hud/`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/hold-the-cold/story-005-end-of-night.md`
- Unlocks: `production/epics/hold-the-cold/story-007-sound-and-feedback.md`

## Completion Notes
**Completed**: 2026-10-19
**Criteria**: 7/7 passing
**Deviations**: OUT OF SCOPE — a demo keeper plays a night behind the title (the house rules want a live title and a muted preview inside the index); ADVISORY — the visibility test fakes `document.hidden`, since a headless tab cannot be hidden for real
**Test Evidence**: `production/qa/evidence/story-006-screens-and-hud/` (6 screenshots, probes)
**Reviewed by**: self, no independent review
