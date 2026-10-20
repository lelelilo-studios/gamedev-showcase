# Raw playtest notes: the same plan, after the tuning (nights 2 and 3)

> **Date**: 2026-10-19, 23:41–23:52 (UTC−3)
> **Seed**: `20261019` · **Tester**: the builder, the same written plan (`tests/playtest/night-plan.py`), desktop 1440×900, real clicks and keys
> **Builds**: night 2 on story 008's tuning; night 3 after the fixes for BUG-0001 and BUG-0002

## Night 2 (tuned, before the fixes)

| Moment | Probe |
|---|---|
| First can picked up | `{"t":73.5,"carrying":false,"warmth":39.1}` — **no can**: a gust blew the keeper off the shed mid-pickup (BUG-0001) |
| First "pour" | `{"t":81.5,"fuel":20.2,"cans":0}` — nothing to pour |
| Before stall 1 | `{"t":92.6,"collection":3000,"fuel":14.1}` |
| Stall 1 cranked | running at t 105.0; 2,999 frozen |
| 03:00 | 2,784 frozen; Bay A −3.8 °C (840), Bay B −9.1 °C, Bay C −6.0 °C — the tank ran dry while the plan scraped |
| Second can | taken at t 148, poured at 157.8, stalled |
| End | **compromised**: 1,498 (405 / 561 / 532) |
| After the end | the next probes read `t 0.77` and `t 46.5`: the plan's crank presses (Space) hit the focused Play again button and started two new nights (BUG-0002) |

Most of the loss was the tuning doing its job on a plan written for the easy build. The first link
in the chain was BUG-0001.

## Night 3 (tuned, with both fixes)

| Moment | Probe |
|---|---|
| First can picked up | `{"t":69.7,"carrying":true,"warmth":64.1}` — taken in the wind |
| First can poured | t 80.1, fuel 61 % |
| Before stall 1 | t 91.2, 3,000 frozen, fuel 55 % |
| Stall 1 cranked | running at t 105.8, 2,999 |
| 03:00 | storm 1.0; 2,952 frozen; Bay A −11.9 °C (954), B −18.0, C −14.2 |
| Second can poured | t 159.4, fuel 62 %, stalled while carrying |
| Stall 2 cranked | t 162.0, 2,916 |
| Stall 3 cranked | t 204.8, 2,744 (this time the third stall was caught) |
| End | **dawn**: 2,733 (752 / 985 / 996); 2 cans; 3 stalls, 3 restarts; 46.7 s scraping; 8.3 s outside |
| After the end | the results stayed up through the plan's last presses; Play again was a deliberate click: playing, t 0.47 |
| Pause | Esc: paused |

Console errors: 0 and 0.

## Notes as they came

- Bay A is the far end of the corridor from the ladder and gets the least of the plan's attention:
  it is the one that bleeds. A person would see it and change the route.
- At 03:00 every bay was off −18 °C and one was a degree from the line. The alarm sounded.
- 2,733 from a fixed plan, against 3,000 before: the score has room above it now.
- Targeted probes for the fixes (separate run, 23:46): a keeper working the shed in a gust keeps
  its place and takes the can (x 66.6); an idle keeper in a gust is pushed to x 39.8. Space during
  the end screen's first 1.5 s leaves it up; focus reaches Play again after that.
