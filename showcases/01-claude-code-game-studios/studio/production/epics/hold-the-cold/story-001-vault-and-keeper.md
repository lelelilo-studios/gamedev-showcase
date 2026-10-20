# Story 001: The vault and the keeper

> **Epic**: Hold the Cold
> **Status**: Complete
> **Layer**: Foundation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-19

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 1`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none (web page, Canvas 2D) n/a | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (MVP 1, and the core loop's "go to whatever is closest to failing"):*

- [ ] The whole vault (outside with the fuel shed, the portal, the generator hall and the three bays) is visible on one screen at 1440×900 and at 390×844, with no scrolling and nothing cut off.
- [ ] The keeper walks left and right with A/D or the arrow keys and climbs ladders with W/S or the arrow keys; pressing up or down away from a ladder walks to the nearest ladder going that way.
- [ ] Clicking or tapping a point in the vault walks the keeper there along the floors and ladders.
- [ ] The keeper never leaves the floors and ladders: no walking through rock, no falling.
- [ ] Walking from the fuel shed to Bay C takes between 8 and 14 seconds (the triage needs distance).
- [ ] Movement speeds come from one tuning table, not from literals in the movement code.
- [ ] The simulation steps at a fixed 60 Hz, apart from drawing; `__game.step(ms)` advances it without drawing.
- [ ] The same seed and the same inputs give the same keeper position in `__game.snapshot()`.

---

## Implementation Notes

*No ADR at this tier: implement against the acceptance criteria and `design/game-brief.md`.*

---

## Out of Scope

- Story 002: stations doing anything (coolers, frost).
- Story 003: the generator and the shed working; carrying.
- Story 006: menus and the HUD.

---

## Files

- `../index.html` — page shell, canvas, print-grain overlay, favicon
- `../game.js` — tuning table, world geometry, seeded RNG, fixed-step loop, keeper movement, click/tap routing, static vault drawing, test hooks

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level: minimal`: tests are waived; the retained screenshot is not.*

**Story Type**: Visual/Feel
**Required evidence**:
- Visual/Feel: a retained screenshot in `production/qa/evidence/story-001-vault-and-keeper/` + sign-off in `production/qa/evidence/story-001-vault-and-keeper-evidence.md`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: None
- Unlocks: `production/epics/hold-the-cold/story-002-bay-cooling.md`, `production/epics/hold-the-cold/story-003-fuel-run.md`

## Completion Notes
**Completed**: 2026-10-19
**Criteria**: 8/8 passing (feel of the movement deferred to the playtest)
**Deviations**: ADVISORY — `floorAt()` holds three y-thresholds as literals (vault geometry, not tuning)
**Test Evidence**: `production/qa/evidence/story-001-vault-and-keeper/` (2 screenshots, probes) + `production/qa/evidence/story-001-vault-and-keeper-evidence.md` (signed)
**Reviewed by**: self, no independent review
