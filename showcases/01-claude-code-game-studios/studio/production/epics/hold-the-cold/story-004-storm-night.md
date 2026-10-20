# Story 004: The storm night

> **Epic**: Hold the Cold
> **Status**: Complete
> **Layer**: Feature
> **Type**: Logic
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-19

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 4`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none (web page, Canvas 2D) n/a | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (MVP 4, the core loop's "the storm leans harder every hour", and the win at 06:00):*

- [ ] A clock runs from 22:00 to 06:00 in about three and a half minutes of play.
- [ ] Storm strength follows a curve that peaks around 03:00; the snow and wind outside show it.
- [ ] A seeded schedule fires gusts (frost on every cooler, a push on the keeper outside), frost bursts (one cooler) and generator stalls; the same seed gives the same schedule.
- [ ] Events grow more frequent with the storm: the second half of the night holds more of them than the first.
- [ ] Each event is written to the shift log with its time; a stall is preceded by a cough the player can see.
- [ ] A stalled generator powers nothing until restarted: pressing Work while the swinging needle is in the green zone three times restarts it, and a miss takes one back.
- [ ] No stall comes within 35 seconds of another.

---

## Implementation Notes

*No ADR at this tier: implement against the acceptance criteria and `design/game-brief.md`.*

---

## Out of Scope

- Story 005: what the night's end does (this story only stops the clock at 06:00).
- Story 007: the sound of the storm and the cough (this story draws them).

---

## Files

- `../game.js` — storm curve, seeded event schedule, gusts (frost, push, chill), frost bursts, cough and stall, crank (needle, hits, misses), dry generator needs the crank, clock, hour lines, shift-log feed, wind-driven snow and spindrift, crank dial, debug hooks for time and schedule
- `../index.html` — clock and shift-log elements

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level: minimal`: tests are waived (advisory). The criteria name things on screen, so a run and a retained screenshot are still made.*

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/storm/story-004-storm-night_test.js` — waived at `qa.level: minimal`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/hold-the-cold/story-002-bay-cooling.md`, `production/epics/hold-the-cold/story-003-fuel-run.md`
- Unlocks: `production/epics/hold-the-cold/story-007-sound-and-feedback.md`

## Completion Notes
**Completed**: 2026-10-19
**Criteria**: 7/7 passing (whether the crank's timing feels fair: deferred to the playtest)
**Deviations**: ADVISORY — the shift log and clock sit in placeholder corners until story 006 lays out the HUD
**Test Evidence**: waived at qa.level minimal; run observed in `production/qa/evidence/story-004-storm-night/`
**Reviewed by**: self, no independent review
