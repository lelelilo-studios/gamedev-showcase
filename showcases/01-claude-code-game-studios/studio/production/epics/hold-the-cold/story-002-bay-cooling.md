# Story 002: Bay cooling and scraping

> **Epic**: Hold the Cold
> **Status**: Complete
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-19

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 2`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none (web page, Canvas 2D) n/a | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (MVP 2, and the fail state's thaw line at −10 °C):*

- [ ] Each bay shows its temperature on a thermometer by its door, with the −10 °C thaw line marked and the number readable at 390 px.
- [ ] A cooler's frost builds over time; frost cuts its cooling in proportion, and a fully iced cooler cools nothing.
- [ ] A bay with a clear, powered cooler settles near −18 °C; a bay whose cooler is fully iced warms past −10 °C within 20 to 35 seconds.
- [ ] Holding Work at a cooler scrapes its frost: a fully iced cooler takes about 2 seconds to clear, and letting go stops the scraping.
- [ ] Frost is visible on the cooler (it grows over the grille), and a bay's shelves lose their white as the bay warms.
- [ ] Work does nothing away from a station, and a prompt names the action when the keeper stands at one.
- [ ] Every rate (frost growth, warming, cooling, scraping) comes from the tuning table.

---

## Implementation Notes

*No ADR at this tier: implement against the acceptance criteria and `design/game-brief.md`.*

---

## Out of Scope

- Story 003: power loss when fuel runs out.
- Story 004: frost bursts and gusts from the storm schedule.
- Story 005: accessions lost above the thaw line.

---

## Files

- `../game.js` — bay and cooler model (frost, output, thermostat), station lookup, scraping, press-and-hold on a station, bay/cooler/thermometer drawing, frost pattern, action prompt, `__game.debug`
- `../index.html` — the prompt element and its style

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level: minimal`: tests are waived (advisory). The criteria name things on screen, so a run and a retained screenshot are still made.*

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/bays/story-002-bay-cooling_test.js` — waived at `qa.level: minimal`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/hold-the-cold/story-001-vault-and-keeper.md`
- Unlocks: `production/epics/hold-the-cold/story-003-fuel-run.md`, `production/epics/hold-the-cold/story-005-end-of-night.md`

## Completion Notes
**Completed**: 2026-10-19
**Criteria**: 7/7 passing
**Deviations**: ADVISORY — the `−10` label on each thermometer is 7 px on a phone; the tick mark carries it, the bay reading itself is ~10 px
**Test Evidence**: waived at qa.level minimal; run observed in `production/qa/evidence/story-002-bay-cooling/`
**Reviewed by**: self, no independent review
