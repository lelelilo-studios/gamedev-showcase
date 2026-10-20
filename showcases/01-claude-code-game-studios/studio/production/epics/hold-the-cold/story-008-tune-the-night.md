# Story 008: Tune the night

> **Epic**: Hold the Cold
> **Status**: Complete
> **Layer**: Feature
> **Type**: Config/Data
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-19

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief Player goal & fail state` — named by the human after `production/qa/playtests/playtest-2026-10-19-scripted.md` (its Top 3 priorities); not an MVP feature

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none (web page, Canvas 2D) n/a | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (Player goal & fail state: a night that can be won or lost) and the playtest's priorities:*

- [ ] Over the 16 balance seeds, a perfect keeper never loses a night, and saves all 3,000 on no more than a quarter of them.
- [ ] A keeper at skill 0.6 loses at least one night in 16 and averages under 2,600.
- [ ] Fuel burns faster as the storm builds; left alone, the generator still runs dry before 06:00, and two cans are still enough.
- [ ] Every story 002–005 number still holds: an iced bay passes −10 °C in 20–35 s, a full scrape takes about 2 s, the second half of the night holds more events than the first.
- [ ] Only values in the tuning table change; no logic changes.

---

## Implementation Notes

*No ADR at this tier: change values in `TUNE` only.*

---

## Out of Scope

- New mechanics, new events, new screens.

---

## Files

- `../game.js` — `TUNE`: bayLeak 0.30→0.34, bayCool 0.75→0.70, frostRate 0.010→0.013, frostStorm 1.4→1.8, scrape 0.55→0.52, fuelBurn 0.5→0.34, fuelStorm 0→0.28 (new key; the burn line reads it), eventsPerHour 2.5→3.0, gustFrost 0.10→0.12, burstFrost 0.35→0.42, lossPerDegree 3→2.2

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level: minimal`.*

**Story Type**: Config/Data
**Required evidence**:
- Config/Data: smoke check pass (`production/qa/smoke-*.md`) — waived at `qa.level: minimal`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/hold-the-cold/story-007-sound-and-feedback.md`
- Unlocks: None

## Completion Notes
**Completed**: 2026-10-19
**Criteria**: 5/5 passing
**Deviations**: ADVISORY — `fuelStorm` is a new key and the burn line was edited to read it (one expression; the criterion said values only); ADVISORY — the values live in `game.js`'s `TUNE` table, not an external data file (coding standards: data-driven values)
**Test Evidence**: smoke check waived at qa.level minimal; balance runs in `production/qa/evidence/story-008-tune-the-night/01-balance-runs.json`
**Reviewed by**: self, no independent review
