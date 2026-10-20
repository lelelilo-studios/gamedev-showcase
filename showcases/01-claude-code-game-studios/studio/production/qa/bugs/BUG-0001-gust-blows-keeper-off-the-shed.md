# Bug Report

## Summary
**Title**: A gust blows the keeper off the fuel shed while Work is held, so no can is taken
**ID**: BUG-0001
**Severity**: S2-High
**Priority**: P1-Fix this sprint
**Status**: Closed
**Verified by**: the builder, manual (scripted play), build after the fix — night 3 of production/qa/playtests/raw-2026-10-19-scripted-night-2.md, plus a targeted probe run at 23:46
**Reported**: 2026-10-19
**Reporter**: —

## Classification
- **Category**: Gameplay
- **System**: storm (gust push on the keeper outdoors)
- **Frequency**: Sometimes (10-50%) — whenever a gust lands during the 0.6 s pickup; more often since story 008 (3 events an hour at peak)
- **Regression**: Yes — the push came in with story 004, and the tuning in story 008 made gusts more frequent

## Environment
- **Build**: after story 008 (no git)
- **Platform**: headless Chrome, 1440×900
- **Scene/Level**: outside, at the fuel shed
- **Game State**: seed 20261019, the first fuel run, about 00:28

## Reproduction Steps
**Preconditions**: a gust is due while the keeper is at the shed.

1. Walk to the shed (x 72) and hold Work.
2. A gust fires during the 0.6 s hold.

**Expected Result**: the keeper braces against the shed and takes the can.
**Actual Result**: the gust pushes the keeper 46 units per second toward the field's edge, out of the shed's range (x 42–102); Work stops counting, no can is taken, and the keeper stands in the cold (warmth 39 % by 00:43).

## Technical Context
- **Likely affected files**: `../game.js` (`stepKeeper`, the gust push)
- **Related systems**: fuel run, warmth
- **Possible root cause**: the push ignores whether the keeper is working a station

## Evidence
- **Logs**: `production/qa/playtests/raw-2026-10-19-scripted-night-2.md` — `fuel1-pickup {"t":73.5,"carrying":false,"warmth":39.1}`
- **Visual**: none retained (found by probe)

## Related Issues
- `production/epics/hold-the-cold/story-004-storm-night.md`, `story-008-tune-the-night.md`

## Notes
Found in the second scripted night, on the build tuned by story 008.

## Closure Record
**Closed**: 2026-10-19
**Resolution**: Fixed — a keeper working a station braces against the wind; the gust only pushes a keeper who is not working (`stepKeeper`, `!k.working`)
**Fix commit / PR**: none (no git)
**Verified by**: the builder, manual (scripted play), build after the fix — night 3 took both cans in the wind; probe: working at the shed in a gust, carrying true at x 66.6; idle, pushed to x 39.8
**Closed by**: the builder (as the human)
**Regression test**: Manual verification
**Status**: Closed
