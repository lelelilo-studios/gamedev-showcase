# Game Brief: Hold the Cold

**One-sentence pitch:** Work the storm night alone at the Hesper Fell seed vault, running between frosting coolers, a thirsty generator and the blizzard outside, and keep three bays of seeds below the thaw line until the relief crew comes at six.

## Core loop
- Read the vault: three bay thermometers, the generator's fuel, the clock.
- Go to whatever is closest to failing: scrape a frosted cooler, fetch a fuel can from the shed outside, crank a stalled generator.
- The storm leans harder every hour; plan the next run while you finish this one.

## Player goal & fail state — what "working" looks like
- Win: reach 06:00 with at least half of the 3,000 accessions still frozen. The score is the number of accessions saved.
- Lose: a bay above the thaw line (−10 °C) loses accessions every second; if the collection falls below 1,500 before dawn, the vault is declared compromised and the night ends.

## MVP — what must exist to be the game
1. The vault in cross-section on one screen, and a keeper who walks and climbs it (keyboard, mouse or tap).
2. Three bays whose temperature rises as their coolers frost over; hold Work at a cooler to scrape it clear.
3. A generator whose fuel runs down; fuel cans come from the shed outside, where the storm drains the keeper's warmth.
4. The storm night: a 22:00 to 06:00 clock and a seeded schedule of gusts, frost bursts and generator stalls (restarted with a timed crank) that grows harder by the hour.
5. Losses above the thaw line, the win and lose checks, and an end screen with the night's stats and the best score.
6. Title, how-to-play, pause and settings (mute, reduce flashing), and a HUD that reads at 390 px with the thumb controls clear of it.
7. Sound and feedback, all made in code: wind, generator, compressors, alarms; snow, frost, scraped ice, the crank needle.

## Out of scope — not building this
- No upgrades, unlocks or meta-progression: one vault, one night.
- No saving mid-night; only the best score and the settings persist.
- No story scenes or dialogue; the shift log is the only text.
- No multiplayer, no procedural layout, no difficulty settings.
- No portal door that gusts blow open, no snow drifting into the tunnel (cut from the first draft: the core loop works without it).

## Build order
1. MVP 1, the vault and the keeper: everything else happens on it.
2. MVP 2, bay cooling and scraping: the riskiest part. Is running between failing machines fun?
3. MVP 3, the fuel run into the storm.
4. MVP 4, the storm night and the crank.
5. MVP 5, losses and the end of the night.
6. MVP 6, screens, settings and HUD.
7. MVP 7, sound and feedback.

---
**Who it's for / what they feel:** Players who like a short, tense shift of plate-spinning; they should feel like the one person keeping something irreplaceable alive.

**Art & audio direction:** A two-ink screen-printed cutaway of a mountain at night (storm blue and frost white) with one sodium-amber light that follows the keeper; filtered-noise wind, compressor hum, and a generator you can hear running out.

**Reference game:** Five Nights at Freddy's: the night-shift clock to 6 AM and a supply that runs down while you work. The MVP keeps the clock and the triage, adds walking between stations and a way to refill, and drops the horror.
