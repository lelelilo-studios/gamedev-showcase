# Test Evidence: Sound and feedback

> **Story**: `production/epics/hold-the-cold/story-007-sound-and-feedback.md`
> **Story Type**: Visual/Feel
> **Date**: 2026-10-19
> **Tester**: the builder, through `scripts/inspect.mjs` (headless Chrome, real key and touch events; audio state read through `__game.debug.audio()`)
> **Build / Commit**: no git; `stamp.txt` holds the sha256 of `index.html` and `game.js` at capture

---

## What Was Tested

The sound made in code (wind, generator, compressors, one-shots, alarm, stings) and the visual
feedback for each action (ice chips, pour drops, can pickup puff, crank sparks and hit pause, lamp
fades, warm-bay wash, drips, breath, the dawn sky). Covers AC-1 to AC-6. A still and a probe can
show that a sound node exists and how loud it is set; they cannot show how it sounds. Listening is
the feel half and is deferred to the playtest, where it stays a human check.

**Acceptance criteria covered**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6

---

## Acceptance Criteria Results

| # | Criterion (from story) | Result | Notes |
|---|----------------------|--------|-------|
| AC-1 | Sound only after the first click, tap or key; M mutes, remembered | PASS | No AudioContext before a gesture; running after Enter; master 0 after M; setting stored (story 006 probe) |
| AC-2 | Wind follows the storm; generator chugs, coughs, falls silent | PASS | Wind gain follows storm and gust, louder and brighter outdoors; generator gain 0.13 running, jittered in a cough, 0 when stalled |
| AC-3 | A sound and a visual for every action | PASS | Scrape: ticks + chips (`01`). Pour: gurgle + drops. Pickup: clank + snow puff. Crank hit: thunk + sparks (`02`); miss: clack + red needle |
| AC-4 | Soft alarm at intervals, never continuous | PASS | Two notes every 4 s while a bay is above −10 °C; the bay's red wash pulses gently, steady under reduce flashing (`04`) |
| AC-5 | Hit pause; snow and frost drawn, fewer particles under reduce flashing; no constant shake or flash | PASS | 70 ms hold on a crank hit; reduce flashing: a third of the particles, no spindrift, no lamp flicker; nothing shakes |
| AC-6 | Dawn and compromised stings | PASS | Dawn: a five-note open chord. Compromised: two falling tones and a low hiss. Both fire from the night's last event |

---

## Screenshots / Video

| # | Filename | What It Shows | Acceptance Criterion |
|---|----------|--------------|----------------------|
| 1 | `story-007-sound-and-feedback/01-scrape-ice-chips-desktop-1440.webp` | Ice chips flying off Bay A's grille while scraping | AC-3 |
| 2 | `story-007-sound-and-feedback/02-crank-hit-sparks-desktop-1440.webp` | A crank hit: amber sparks, dial lit, 1/3 | AC-3, AC-5 |
| 3 | `story-007-sound-and-feedback/03-dawn-sky-and-breath-desktop-1440.webp` | The last hour: the sky paling, breath at the shed | AC-5 |
| 4 | `story-007-sound-and-feedback/04-stalled-dark-warm-bay-phone-390.webp` | Generator stalled: lamps faded, Bay C warm with its wash | AC-2, AC-4 |
| 5 | `story-007-sound-and-feedback/05-cough-before-dawn-phone-390.webp` | 05:43, the cough mark over the generator | AC-2 |
| 6 | `story-007-sound-and-feedback/06-probes.json` | Audio and particle probes | AC-1, AC-2, AC-5 |

---

## Test Conditions

- **Game state at start**: title screen; Enter starts the night; debug hooks set frost, stalls and time
- **Platform / hardware**: headless Chrome on Linux with `--mute-audio` (nodes run, nothing is heard)
- **Framerate during test**: not meaningful (software rendering)
- **Any special setup required**: `--reduced-motion` for the reduce-flashing run

---

## Observations

- At their first size the chips were too small to see behind the keeper; they are now thrown off the grille's sides and drawn larger.
- The portal was redrawn during this story as a concrete block with a snow-loaded roof (it was an odd wedge in every earlier capture). Outside this story's criteria; noted as a deviation.
- Audio was checked as levels, not heard. Whether the mix is pleasant needs ears.

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Lead (art-director / designer) | the builder, signing as lead (solo) | 2026-10-19 | [x] Approved |

---

*Template: `.claude/docs/templates/test-evidence.md`*
