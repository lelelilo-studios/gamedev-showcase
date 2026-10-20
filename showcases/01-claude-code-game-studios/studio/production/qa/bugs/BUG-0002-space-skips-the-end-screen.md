# Bug Report

## Summary
**Title**: Space held or pressed as the night ends restarts it from the end screen
**ID**: BUG-0002
**Severity**: S2-High
**Priority**: P1-Fix this sprint
**Status**: Closed
**Verified by**: the builder, manual (scripted play), build after the fix — night 3 of production/qa/playtests/raw-2026-10-19-scripted-night-2.md, plus a targeted probe run at 23:46
**Reported**: 2026-10-19
**Reporter**: —

## Classification
- **Category**: UI
- **System**: end of the night (end screen focus)
- **Frequency**: Often (>50%) when the player is cranking or scraping at the moment the night ends
- **Regression**: No — present since story 006 moved focus to Play again

## Environment
- **Build**: after story 008 (no git)
- **Platform**: headless Chrome, 1440×900
- **Scene/Level**: the end screen
- **Game State**: any night that ends while Space is in use

## Reproduction Steps
**Preconditions**: the night is about to end (dawn, or the collection about to fall under half).

1. Hold or press Space (scraping or cranking) as the night ends.
2. The end screen opens and focuses Play again.
3. Space comes up, or is pressed again.

**Expected Result**: the end screen stays up until the player chooses.
**Actual Result**: the focused Play again button takes the Space and a new night starts; the night's results are never seen.

## Technical Context
- **Likely affected files**: `../game.js` (`showEnd`, focus handling)
- **Related systems**: keyboard input
- **Possible root cause**: focus moves to Play again at once, and a button activates on Space's keyup

## Evidence
- **Logs**: `production/qa/playtests/raw-2026-10-19-scripted-night-2.md` — after `compromised`, the next probes read `t 0.77` and `t 46.5`: two new nights started by the plan's crank presses
- **Visual**: none retained

## Related Issues
- `production/epics/hold-the-cold/story-006-screens-and-hud.md`

## Notes
Found in the second scripted night. The same can happen to a person cranking at 05:59.

## Closure Record
**Closed**: 2026-10-19
**Resolution**: Fixed — Space and Enter are swallowed for 1.5 s after the end screen opens, and Play again takes focus only then (`showEnd`, `swallowEarly`)
**Fix commit / PR**: none (no git)
**Verified by**: the builder, manual (scripted play), build after the fix — night 3's last presses left the results up; probe: Space at the end, state still `over`, focus on Play again after 1.5 s
**Closed by**: the builder (as the human)
**Regression test**: Manual verification
**Status**: Closed
