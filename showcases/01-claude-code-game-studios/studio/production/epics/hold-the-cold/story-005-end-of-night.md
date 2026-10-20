# Story 005: Losses and the end of the night

> **Epic**: Hold the Cold
> **Status**: Complete
> **Layer**: Feature
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-19

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 5`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none (web page, Canvas 2D) n/a | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (MVP 5, and the Player goal & fail state):*

- [ ] A bay above −10 °C loses accessions every second, faster the warmer it is; the collection total is on screen.
- [ ] Reaching 06:00 with at least 1,500 accessions ends the night as a win (dawn).
- [ ] Falling below 1,500 before 06:00 ends it as a loss: the vault is declared compromised.
- [ ] The end screen shows accessions saved per bay, cans hauled, stalls restarted, time spent outside, collapses, the seed and the best score.
- [ ] The best score is kept in localStorage, every read and write wrapped in try/catch, and a new best is marked.
- [ ] Play again starts a fresh night on the same seed.

---

## Implementation Notes

*No ADR at this tier: implement against the acceptance criteria and `design/game-brief.md`.*

---

## Out of Scope

- Story 006: the title screen, a new seed, how the end screen is laid out beyond its contents.
- Story 007: the dawn and compromised stings.

---

## Files

- `../game.js` — accessions per bay, loss above the thaw line, thaw and back-to-cold log lines, dawn and compromised endings, end screen fill, game-over lines, best score in localStorage, Play again, collection meter
- `../index.html` — collection readout and meter, end screen markup and style, button style

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level: minimal`: tests are waived (advisory). The end screen is on screen, so a run and a retained screenshot are still made.*

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/collection/story-005-end-of-night_test.js` — waived at `qa.level: minimal`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/hold-the-cold/story-002-bay-cooling.md`, `production/epics/hold-the-cold/story-004-storm-night.md`
- Unlocks: `production/epics/hold-the-cold/story-006-screens-and-hud.md`

## Completion Notes
**Completed**: 2026-10-19
**Criteria**: 6/6 passing
**Deviations**: ADVISORY — on a phone the end screen sits over a HUD that still overlaps itself (layout is story 006)
**Test Evidence**: waived at qa.level minimal; run observed in `production/qa/evidence/story-005-end-of-night/`
**Reviewed by**: self, no independent review
