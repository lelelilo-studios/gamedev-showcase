# Story 003: The fuel run

> **Epic**: Hold the Cold
> **Status**: Complete
> **Layer**: Core
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-19

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 3`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none (web page, Canvas 2D) n/a | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (MVP 3, and the core loop's "fetch a fuel can from the shed outside"):*

- [ ] The generator's fuel drains while it runs; at zero it stops and every cooler loses power.
- [ ] Holding Work at the shed outside picks up one fuel can; the keeper carries it visibly and walks slower while carrying.
- [ ] Holding Work at the generator while carrying pours the can: +40 fuel, up to 100.
- [ ] Outside the portal the keeper's warmth drains; inside it recovers, fastest beside a running generator.
- [ ] At zero warmth the keeper collapses, drops the can and wakes inside the portal a few seconds later.
- [ ] The generator's fuel gauge and the keeper's warmth are on screen at all times.
- [ ] Left alone, the generator runs dry before 06:00 (at least one trip is needed), and two trips made in time are enough.

---

## Implementation Notes

*No ADR at this tier: implement against the acceptance criteria and `design/game-brief.md`.*

---

## Out of Scope

- Story 004: stalls and the crank; the storm's wind outside.
- Story 006: the HUD layout (this story only puts the gauges on screen).

---

## Files

- `../game.js` — generator and fuel, timed actions (take a can, pour), carrying speeds, warmth and collapse, power to the coolers, dark rooms without power, fuel gauge, exhaust, can in hand, event log, debug hooks
- `../index.html` — warmth and fuel meters

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level: minimal`: tests are waived (advisory). The criteria name things on screen, so a run and a retained screenshot are still made.*

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/generator/story-003-fuel-run_test.js` OR a playtest doc — waived at `qa.level: minimal`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/hold-the-cold/story-001-vault-and-keeper.md`, `production/epics/hold-the-cold/story-002-bay-cooling.md`
- Unlocks: `production/epics/hold-the-cold/story-004-storm-night.md`

## Completion Notes
**Completed**: 2026-10-19
**Criteria**: 7/7 passing (how far the fuel run feels: deferred to the playtest)
**Deviations**: ADVISORY — a dry generator restarts as soon as a can is poured; story 004 makes a stall need the crank
**Test Evidence**: waived at qa.level minimal; run observed in `production/qa/evidence/story-003-fuel-run/`
**Reviewed by**: self, no independent review
