# Story 007: Sound and feedback

> **Epic**: Hold the Cold
> **Status**: Complete
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-10-19

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 7`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: none (web page, Canvas 2D) n/a | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (MVP 7, and its Art & audio direction line):*

- [ ] Sound starts only after the first click, tap or key; M mutes, and the setting is remembered.
- [ ] The wind follows the storm's strength; the generator chugs while it runs, coughs before a stall and falls silent when it stops.
- [ ] Every action has a sound and a visual: scraping (ice chips), pouring, picking up a can, crank hits and misses.
- [ ] A bay above the thaw line sounds a soft alarm at intervals, never continuously.
- [ ] A crank hit gets a short hit pause; snow and frost are drawn, with fewer particles under reduce flashing; nothing shakes or flashes constantly.
- [ ] Dawn and the compromised ending each get their own sting.

---

## Implementation Notes

*No ADR at this tier: implement against the acceptance criteria and `design/game-brief.md`.*

---

## Out of Scope

- Nothing after this story: it is last in the build order.

---

## Files

- `../game.js` — WebAudio graph (wind, whistle, generator with chug LFO, compressor hum), one-shots and stings, unlock on first gesture, mute, suspend on pause and hidden; cues from the simulation; particles (chips, drops, puffs, sparks, drips, breath); hit pause; lamp fade and restart flicker; warm-bay pulse; dawn sky and the relief crew's lamps; portal block redrawn

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level: minimal`: tests are waived; the retained screenshot is not.*

**Story Type**: Visual/Feel
**Required evidence**:
- Visual/Feel: a retained screenshot in `production/qa/evidence/story-007-sound-and-feedback/` + sign-off in `production/qa/evidence/story-007-sound-and-feedback-evidence.md`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/hold-the-cold/story-004-storm-night.md`, `production/epics/hold-the-cold/story-006-screens-and-hud.md`
- Unlocks: None

## Completion Notes
**Completed**: 2026-10-19
**Criteria**: 6/6 passing (how it sounds: deferred to the playtest, a human check)
**Deviations**: OUT OF SCOPE — the portal block redrawn; the dawn sky and the relief crew's lamps added (feedback for the win, not in the criteria)
**Test Evidence**: `production/qa/evidence/story-007-sound-and-feedback/` (5 screenshots, probes) + `production/qa/evidence/story-007-sound-and-feedback-evidence.md` (signed)
**Reviewed by**: self, no independent review
