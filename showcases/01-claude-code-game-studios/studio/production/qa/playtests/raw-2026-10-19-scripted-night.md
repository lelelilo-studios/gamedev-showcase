# Raw playtest notes: one scripted night, desktop and phone

> **Date**: 2026-10-19, 23:28–23:36 (UTC−3)
> **Build**: `index.html` + `game.js` as closed at story 007 (no git; see the story 007 evidence stamp)
> **Seed**: `20261019` (forced with `?seed=`, so both runs face the same storm)
> **Tester**: the builder, playing a written shift plan: `tests/playtest/night-plan.py`
> **How**: `scripts/inspect.mjs --steps`, real input only. Desktop 1440×900: mouse clicks to walk,
> Space held to scrape and pour, Space pressed to crank, two arrow-key walks. Phone 390×844: taps to
> walk, long-presses on WORK, taps on WORK to crank. Small in-page waits keep the plan in step with
> the game clock (wait for arrival, wait for the needle, wait for 01:20). The waits read state;
> they never set it.

## The plan

The tester knows the storm's schedule for this seed: stalls at 101.8 s, 158.9 s and 211.1 s
(01:46, 03:53, 05:49). Rounds of A → B → C (walk, hold 1.7 s). A fuel run at 01:20 and another
around 03:20. Be at the generator for each stall and crank it. Then wait for dawn, press Play
again, and pause the second night.

## What the probes said (desktop | phone)

| Moment | Desktop 1440×900 | Phone 390×844 |
|---|---|---|
| Start | playing at t 0.55 s | playing at t 0.30 s |
| First can picked up | t 69.3, warmth 70 | t 69.1, warmth 72 |
| First can poured | t 79.7, fuel 58 % | t 79.8, fuel 58 % |
| Before stall 1 | t 90.9, 3,000 frozen, fuel 53 % | t 91.3, 3,000, fuel 52 % |
| Stall 1 cranked | running at t 105.8 | running at t 105.4 |
| 03:02, peak storm | storm 0.99; bays −18.0 °C; frost A 0.50, B 0.06, C 0.00 | storm 0.98; bays −18.0 °C; frost A 0.50, B 0.06, C 0.00 |
| Second can poured | t 159.4, fuel 60 %, **stalled while carrying** | t 159.9, fuel 60 %, stalled |
| Stall 2 cranked | running at t 162.7 | running at t 163.1 |
| Stall 3 | the plan's wait ran out at t 209; the stall came at 05:49, nobody cranked | the same, at t 210.4 |
| Dawn | 3,000 saved; 2 cans; 43 s scraping; 7.9 s outside; 0 collapses | 3,000; 2 cans; 45 s scraping; 8.0 s outside; 0 collapses |
| Play again | playing, t 0.47, same seed | playing, t 0.47, same seed |
| Pause (Esc / the pause button) | paused | paused |

Console errors: 0 and 0. Failed requests: 0. Sideways overflow: none.

## Balance runs (the same day, before the playtest)

The demo keeper (`__game.debug.autoplay`) played 16 seeds (`bal-0` … `bal-15`) in simulation time:
16 dawns; 13 at 3,000, then 2,998, 2,999, 3,000 …; always exactly 2 cans; 1 to 4 stalls, all restarted;
5–7 s outside; no collapses.

## Notes as they came

- Nothing went wrong, and that is the finding. Every bay sat at −18 °C from 22:00 to 06:00. The
  thaw line was never close, the alarm never sounded, the collection meter never moved.
- At peak (03:02) the worst cooler was half frosted. A cooler needs about 60 % frost before its bay
  warms at all, and then 27 s more before seeds die, so a lap of the corridor every 30 s is plenty.
- The fuel run is the best moment in the night: the long climb, the wind, the warmth bar dropping,
  the slow walk back with the can. It happens twice and the tank never drops under 24 %.
- Stall 2 hit while the can was on its way down. Pour first, then crank: the one time two jobs
  collided. More of that is the game.
- The last stall, 11 s before dawn, cost nothing: the bays had no time to warm. The night's ending
  has no stakes.
- A perfect 3,000 on a first scripted try leaves the best score nowhere to go.
- The crank landed three hits within six needle-timed presses every time; the press window (about
  0.2 s, twice per swing) is generous for a script. Unknown for a person.
- Phone: the WORK long-press scraped and poured, the taps routed the keeper up and down ladders
  without a miss, and the HUD stayed clear of the thumb.
- Snapshot gap (test tooling, not the game): `snapshot().stats` has no stall or restart count; the
  end screen does.
