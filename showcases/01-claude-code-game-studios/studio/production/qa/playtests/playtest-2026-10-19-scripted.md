# Playtest Report

> Written by `/playtest-report analyze production/qa/playtests/raw-2026-10-19-scripted-night.md`,
> 2026-10-19 23:37 (UTC−3). Settings read by hand (the skill's `resolve_config` line was not run):
> `review_mode solo` (rigor minimal), `automation guided`.

## Session Info
- **Date**: 2026-10-19
- **Build**: story 007 closed (no git; files stamped in `production/qa/evidence/story-007-sound-and-feedback/stamp.txt`)
- **Duration**: one full night each, 3 min 36 s of play, twice
- **Tester**: scripted (the builder's shift plan, `tests/playtest/night-plan.py`)
- **Platform**: PC browser at 1440×900; phone size at 390×844 (headless Chrome, touch emulated)
- **Input Method**: KB+M (desktop run); Touch (phone run)
- **Session Type**: Targeted test: one complete night, title to end screen, on seed `20261019`

## Test Focus
Can a night be played start to finish with real input on both sizes, and does it hold the pressure
the brief promises ("go to whatever is closest to failing")? Fuel runs, stalls and the crank, the
end screen, Play again, pause.

## First Impressions (First 5 minutes)
- **Understood the goal?** N/A for a script; the HUD, the thermometers and the shift log stated it at every step
- **Understood the controls?** Yes: every input in the plan did what the how-to card says, on both sizes
- **Emotional response**: Bored by the end of the second hour; the fuel runs were the exception
- **Notes**: the whole night was played with no bay leaving −18 °C

## Gameplay Flow
### What worked well
- A complete night runs title → shift → dawn → Play again → pause, with zero console errors, on both sizes.
- The fuel run: the climb, the wind and the warmth bar, the slow walk back with the can.
- Touch: taps route the keeper through two ladders reliably; a long-press on WORK scrapes and pours; WORK taps crank.
- The second stall landed while the can was on its way: pour first, then crank. The one moment two jobs collided.

### Pain points
- No pressure at all. Every bay held −18 °C all night; the thaw line was never close -- Severity: High
- Fuel never mattered: the tank never fell below 24 %, and two cans always carried the night -- Severity: Medium
- The perfect score came on the first try, so the best score has nowhere to go -- Severity: High
- The last stall, 11 s before dawn, cost nothing; the night's last minutes had no stakes -- Severity: Low

### Confusion points
- None observed for scripted input. A person's confusion cannot be measured by this session.

### Moments of delight
- Dawn: the sky pales over the last hour, then the relief crew's lamps come up the road.

## Bugs Encountered
| # | Description | Severity | Reproducible |
|---|-------------|----------|-------------|
| 1 | `__game.snapshot().stats` has no stall or restart count (the end screen has them); test tooling only | S4 Low | Yes |

## Feature-Specific Feedback
### Bay cooling and scraping
- **Understood purpose?** Yes
- **Found engaging?** No: one lap of the corridor every 30 s kept all three bays at −18 °C, even at peak
- **Suggestions**: frost faster in the storm; a cooler should lose ground before it is half frosted

### The fuel run
- **Understood purpose?** Yes
- **Found engaging?** Yes, but twice a night with a quarter tank to spare is not a decision
- **Suggestions**: burn more as the storm builds, so the trips cost more time when time is short

### The storm night and the crank
- **Understood purpose?** Yes
- **Found engaging?** Partly: the stalls are events you plan for, and only one collided with anything
- **Suggestions**: more overlap between stalls, bursts and the fuel run at the peak

## Quantitative Data (if available)
- **Deaths**: 0 collapses (desktop), 0 (phone)
- **Time per area**: outside 7.9 s and 8.0 s; scraping 43 s and 45 s of 216 s
- **Items used**: 2 cans per night; 2 stalls restarted, 1 left (05:49)
- **Features discovered vs missed**: all used; the alarm and the compromised ending were never reached
- **Balance runs**: the demo keeper on 16 seeds saved 3,000 on 13, 2,998–2,999 on the rest; always 2 cans

## Overall Assessment
- **Would play again?** No, as built: there is nothing left to beat
- **Difficulty**: Too Easy
- **Pacing**: Too Slow between the events; good around the fuel runs
- **Session length preference**: Good (3 min 36 s)

## Top 3 priorities from this session
1. Put the bays under real pressure at the peak, so a good night saves around 2,500–2,950 and a careless one is lost.
2. Make fuel a decision: burn more in the storm, so the second trip has to be fitted around stalls and frost.
3. Give the best score somewhere to go (follows from 1: a perfect 3,000 should be rare).

---

## Action Routing

**Design changes needed**
- The night's last minutes have no stakes. (No GDD at `minimal`; the brief is the design record.)
  → "Run `/propagate-design-change` on the affected design document" — no design document holds
  tuning at this tier; the change is a tuning change inside the brief's existing design, so the
  brief is not edited.

**Balance adjustments**
- Frost growth in the storm, cooler capacity, fuel burn, can size.
  → "Run `/balance-check [system]` to verify the full balance picture before tuning values." Not
  run (not in this jam's flow); in its place the demo keeper is re-run over the same 16 seeds after
  the change, plus a weaker keeper, and a second scripted night.

**Bug reports**
- #1 (S4): → "Use `/bug-report` to formally track these." Not filed; fixed directly (one line).

**Polish items**
- None from this session.

## Creative Director Assessment
CD-PLAYTEST skipped — Solo mode.

---

Verdict: **COMPLETE** — playtest report generated.

- Act on the highest-priority finding category first: balance.
- After addressing design changes: `/design-review` (no GDD at this tier).
- After fixing bugs: `/bug-triage` (one S4, fixed).
