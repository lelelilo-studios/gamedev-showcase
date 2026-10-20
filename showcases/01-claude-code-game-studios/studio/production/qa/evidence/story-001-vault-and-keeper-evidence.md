# Test Evidence: The vault and the keeper

> **Story**: `production/epics/hold-the-cold/story-001-vault-and-keeper.md`
> **Story Type**: Visual/Feel
> **Date**: 2026-10-19
> **Tester**: the builder, through `scripts/inspect.mjs` (headless Chrome, real key, click and tap events)
> **Build / Commit**: no git; `stamp.txt` holds the sha256 of `index.html` and `game.js` at capture

---

## What Was Tested

The vault cutaway drawn on one screen at desktop and phone sizes, and the keeper moving through it
by keyboard, click and tap. Covers AC-1 to AC-8. The feel half (does walking feel good?) is not
something a still can show; it is deferred to the playtest.

**Acceptance criteria covered**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8

---

## Acceptance Criteria Results

| # | Criterion (from story) | Result | Notes |
|---|----------------------|--------|-------|
| AC-1 | Whole vault on one screen at 1440×900 and 390×844, no scrolling, nothing cut off | PASS | Both screenshots; `overflowX` false at both sizes |
| AC-2 | Walk with A/D or arrows, climb with W/S or arrows; up/down away from a ladder walks to it | PASS | ArrowDown held 2.6 s from the generator: the keeper walked to the left ladder and was on it at y 625 |
| AC-3 | Click or tap walks the keeper there along floors and ladders | PASS | Phone tap near the shed: climbing ladder 0 after 6 s. Desktop click on the shed: on floor 0 heading left after 3.5 s |
| AC-4 | Never leaves floors and ladders | PASS | 8 s held left, then right, on the corridor: x stops at 56 and 568 |
| AC-5 | Shed to Bay C takes 8 to 14 s | PASS | 12.22 s (`03-probes.json`) |
| AC-6 | Speeds from one tuning table | PASS | `TUNE.walk`, `TUNE.climb`, `TUNE.ladderSnap`, `TUNE.arrive` in `game.js`; no speed literal in `stepKeeper` |
| AC-7 | Fixed 60 Hz, apart from drawing; `step(ms)` doesn't draw | PASS | `frame()` runs `tick()` on an accumulator; `__game.step` calls `tick()` only |
| AC-8 | Same seed and inputs give the same keeper position | PASS | The same input script run twice: identical snapshots |

---

## Screenshots / Video

| # | Filename | What It Shows | Acceptance Criterion |
|---|----------|--------------|----------------------|
| 1 | `story-001-vault-and-keeper/01-vault-desktop-1440.webp` | The full cutaway at 1440×900 (cropped to the playfield): shed, portal, hall, three bays; keeper at Bay A after keyboard moves | AC-1, AC-2 |
| 2 | `story-001-vault-and-keeper/02-tap-to-walk-phone-390.webp` | The full cutaway at 390×844; the keeper climbing toward floor 0 after a tap near the shed | AC-1, AC-3 |
| 3 | `story-001-vault-and-keeper/03-probes.json` | The probe values quoted above | AC-4, AC-5, AC-8 |

---

## Test Conditions

- **Game state at start**: page load, seed `20261019` (the daily seed), straight into the vault (no title screen yet)
- **Platform / hardware**: headless Chrome on Linux, software rendering, device pixel ratio 1
- **Framerate during test**: not meaningful (software rendering); the simulation is tick-counted, not timed
- **Any special setup required**: none

---

## Observations

- The keeper read too small at 390 px on the first run (about 14 px tall); it is now drawn at 1.3× its collision size.
- The bands above and below the playfield on a phone, and beside it on desktop, are empty until the HUD and controls arrive (story 006).
- The tap mapping (`floorAt`) holds three y-thresholds as literals; they are geometry, not tuning.

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Lead (art-director / designer) | the builder, signing as lead (solo) | 2026-10-19 | [x] Approved |

---

*Template: `.claude/docs/templates/test-evidence.md`*
