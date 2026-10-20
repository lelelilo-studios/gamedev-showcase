# Playtest Report

> Written by `/playtest-report analyze production/qa/playtests/raw-2026-10-19-scripted-night-2.md`,
> 2026-10-19 23:53 (UTC−3). The second session: the first report's plan, replayed on story 008's tuning.

## Session Info
- **Date**: 2026-10-19
- **Build**: night 2 on story 008's tuning; night 3 with the BUG-0001 and BUG-0002 fixes
- **Duration**: two nights of 3 min 36 s
- **Tester**: scripted (the same shift plan as the first session)
- **Platform**: PC browser, 1440×900 (headless Chrome)
- **Input Method**: KB+M
- **Session Type**: Targeted test: does the tuning add pressure without making the night unwinnable?

## Test Focus
The first report's top three priorities: pressure at the peak, fuel as a decision, room above the score.

## First Impressions (First 5 minutes)
- **Understood the goal?** N/A (scripted)
- **Understood the controls?** Yes
- **Emotional response**: Engaged: by 03:00 every bay was off −18 °C and one stood a degree from the thaw line
- **Notes**: the plan that saved 3,000 before saved 2,733 on night 3

## Gameplay Flow
### What worked well
- The peak now pushes back: a fixed route bleeds accessions at the bay it visits least.
- The night is still winnable by a plan that ignores the state of the bays.
- The third stall was caught this time, and it mattered: 2,744 → 2,733 instead of a free 11 s.

### Pain points
- A gust could blow the keeper off the shed mid-pickup (BUG-0001, fixed) -- Severity: High
- Space meant for the crank could restart the night from the end screen (BUG-0002, fixed) -- Severity: High

### Confusion points
- None measurable by a script.

### Moments of delight
- The thaw alarm finally sounded, and the thermometer climbing toward the amber mark is readable from across the vault.

## Bugs Encountered
| # | Description | Severity | Reproducible |
|---|-------------|----------|-------------|
| 1 | BUG-0001: a gust blows the keeper off the shed while Work is held; no can | S2 High | Sometimes |
| 2 | BUG-0002: Space at the end of the night restarts it through the focused Play again | S2 High | Often, when cranking at the end |

## Feature-Specific Feedback
### Bay cooling and scraping
- **Understood purpose?** Yes
- **Found engaging?** Yes: the far bay (A) bled 248 accessions under a fixed route
- **Suggestions**: none for now

### The fuel run
- **Understood purpose?** Yes
- **Found engaging?** Yes: the tank burns faster at the peak; the second can was poured with a stall waiting
- **Suggestions**: none for now

## Quantitative Data (if available)
- **Deaths**: 0 collapses
- **Time per area**: outside 8.3 s; scraping 46.7 s (night 3)
- **Items used**: 2 cans; 3 stalls, 3 restarts (night 3)
- **Features discovered vs missed**: the thaw alarm was heard for the first time; the compromised ending was reached (night 2)
- **Balance runs** (story 008): perfect keeper 2,862 average, never lost; skill 0.6 keeper 2,380, lost 3 of 16

## Overall Assessment
- **Would play again?** Yes: there is now a best score to beat (2,733 on this seed)
- **Difficulty**: Just Right for a planned route; a person who reads the bays should beat it
- **Pacing**: Good
- **Session length preference**: Good

## Top 3 priorities from this session
1. Done: BUG-0001 and BUG-0002 fixed and verified (night 3, plus targeted probes).
2. A person still has to play it: walking feel, crank fairness and the sound mix are untested by a script.
3. No change to the tuning; watch the far bay in human play.

---

## Action Routing

**Design changes needed**: none.
**Balance adjustments**: none (story 008 holds).
**Bug reports**: BUG-0001 and BUG-0002 → filed with `/bug-report`; both fixed, then verified and closed (`/bug-report verify`, `/bug-report close`).
**Polish items**: none.

## Creative Director Assessment
CD-PLAYTEST skipped — Solo mode.

---

Verdict: **COMPLETE** — playtest report generated.
