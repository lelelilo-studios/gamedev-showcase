# How to recreate cartridge 07: Patchwork Isles

**Tool:** wavefunctioncollapse (library) · [kchapelier/wavefunctioncollapse](https://github.com/kchapelier/wavefunctioncollapse)
**Play it:** https://lelelilo-studios.github.io/gamedev-showcase/showcases/07-wavefunctioncollapse/

WaveFunctionCollapse's OverlappingModel learns every 3×3 piece of a twelve-square scrap you paint and sews a 72×48 sea chart from it, stitch by stitch, knotting and unpicking when it contradicts itself; a second Admiralty mode builds charts from eleven coastline tiles with the SimpleTiledModel. The finished chart is checked for reachable harbours and becomes the map of a short sailing game with wind, fog, shoals and a season to beat.

## Steps

1. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in.
2. Nothing to install for a quick start: the game loads wavefunctioncollapse from a CDN at a pinned version (see **Built with**). For a real project use the npm command in **Install**.
3. Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.
4. Make an empty folder, open a terminal in it and run `claude`.
5. Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.
6. Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.
7. Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.

## Install

npm:

```
npm install wavefunctioncollapse --production
```

## Prompt

The exact brief the builder received:

````markdown
Use wavefunctioncollapse@2.1.0 (kchapelier's JavaScript port of WaveFunctionCollapse, loaded through esm.sh as it is CommonJS) to build "Patchwork Isles", a small, finished map-making and sailing game on Canvas 2D.

The game has two halves:
1. **Stitch the sample.** Paint a tiny sample map (about 12 by 12 cells) with a palette of deep sea, shallows, sand, meadow, forest, rock and harbour. Or start from one of four ready samples, each with its own character (scattered atolls, a fjord coast, one big island, a river delta). Then grow a full sea chart (about 72 by 48 cells) from it with the OverlappingModel. Show the collapse as it happens, cell by cell, like stitches being sewn, with a counter for contradictions and retries. Options: pattern size (2 or 3), symmetry, periodic edges.
2. **Sail it.** A small boat sails the chart you made. Visit every harbour before the season ends (a day-night clock and dwindling stores), with fog of war that lifts as you sail, winds that help or hinder, and shoals that ground you. Harbours restock you and reveal more of the map. Score by harbours visited, days to spare and how much of the chart you revealed.

A second generation mode uses the SimpleTiledModel with a small hand-drawn coastline tile set (corner and edge pieces with adjacency rules) to make an "Admiralty" style chart, so both models are shown, and the player can switch between them.

Details that make it: seeds for everything (the sample, the generation and the voyage) shown and shareable through the URL; a "sew again" button that keeps the sample and changes the seed; a chart that is always winnable (if a generated chart has unreachable harbours, retry and say so); export the chart as a PNG.

Look: the chart is a quilt: every terrain is a fabric (stitched outlines, cross-hatch shallows, knotted forests), drawn procedurally on the canvas; the sailing view keeps that look with a little cloth boat. A warm, bookish serif and a typewriter or sampler-stitch face for labels.
````

It also received the house rules, pasted after the brief:

````markdown
# House rules

Every game in this repo was built against these rules, on top of its own brief. They are part of the prompt.

## Be original
- Every subject, place, character, company and person in the game is fictional. No real brands, logos, products or existing game characters, and no copying of the tool's own demos, examples, layouts or copy. The tool is the medium, not the subject.
- Each game should look like a different studio made it: its own type pairing from Google Fonts, its own palette, its own art direction and its own interface layout.
- Don't use Inter, Roboto, Arial, Helvetica, Open Sans, Lato, Montserrat, Poppins or Space Grotesk as the main face. No purple-to-blue gradients, no gradient text, no glassmorphism panels by default, no emoji as icons.
- Write real copy in a consistent voice: the title screen, the how-to-play card, tooltips and the game-over lines all sound like the same game. No lorem ipsum.

## Make it a finished game
- A title screen (with the game's name, a one-line hook, Play, How to play and the seed), the game itself, pause, and an end screen with stats, the best score and Play again.
- Controls that feel good on a keyboard and mouse **and** on a phone: touch controls designed for thumbs at 390 px, with the HUD clear of them. Show the controls on the how-to-play card and in the pause menu.
- A fixed-timestep simulation kept apart from rendering, so the game plays the same at 30, 60 or 144 fps.
- Pause on Esc or P, and automatically when the tab is hidden or the window loses focus. Resume cleanly.
- A short, satisfying round (about 2 to 5 minutes) that can be won or lost, and a reason to play again.
- Juice with restraint: feedback for every action (sound, motion, particles, a hit pause), but no constant shaking or flashing. Offer a "reduce flashing" setting that also turns on under `prefers-reduced-motion`.

## Make it testable
- Everything random comes from a seeded RNG. The seed comes from `?seed=` or a daily seed, and it is shown on the title and end screens.
- Expose `window.__game` with at least: `seed`, `state()` (for example "title", "playing", "paused", "over"), `start()`, `step(ms)` (advance the simulation without rendering), `input(...)` (set the input state the way a player would) and `snapshot()` (score, timers and the key positions as plain JSON).
- The same seed and the same inputs must give the same snapshot.

## Sweat the small things
- Inline SVG favicon, a real `<title>` (the game's name), a meta description, `og:title`, `og:description` and `og:image` (`../../thumbs/<slug>.webp`), `theme-color`.
- Visible focus states, full keyboard use of every menu, `aria-label`s on icon buttons, and screen-reader text for the score and state changes (`aria-live`, polite).
- A `prefers-reduced-motion: reduce` path that still looks finished.
- Works at 390×844 (portrait phone) with no sideways scroll, and at 1440×900 and wider without looking stretched. The canvas resizes with the window.
- Loading, empty and error states are designed, not default. If a browser lacks a feature (WebGPU, WebGL2, WebAssembly), show a designed fallback that explains why.
- Sound is WebAudio, made in code. It never starts before the first click or key, and there's a mute control (M) that is remembered.
- Best score and settings are saved in localStorage, with every read and write wrapped in try/catch.
- A credits line (on the title screen or in the pause menu) that names the tool, links its repo, and credits any third-party code or fonts.

## Stay self-contained
- One folder per game: `index.html` plus small local assets. No build step. It must work on GitHub Pages, and from `file://` where the browser allows it.
- Libraries come from a CDN at exact pinned versions (jsDelivr or esm.sh, through an import map for ES modules). Never `@latest`, never an unpinned major.
- Keep your own JavaScript in `index.html` or in small files next to it.
- Art is procedural (geometry, shaders, canvas drawing) or a few tiny local files you made yourself. No downloaded art packs, models, textures or sounds.
- Page weight under about 1.5 MB, not counting CDN libraries. Cap the device pixel ratio, and stop rendering while paused or hidden.
- Load the shared corner label with
  `<script src="../../shared/tag.js" data-no="NN" data-slug="NN-slug" data-tool="Tool name" defer></script>`
  and set `--tag-ink`, `--tag-paper` and `--tag-line` on `:root` so it matches the game. Pick the corner (`data-position`) where it covers nothing important, including touch controls.

## Check your own work
- Play it. Use the playtest steps in `scripts/inspect.mjs` (real key presses, clicks, taps and drags) to play at least one full round, from the title to the end screen, at 1440×900 and 390×844, and look at every screenshot.
- Zero console errors and zero failed requests.
````

and the repo's operating instructions ([docs/BUILD.md](https://github.com/lelelilo-studios/gamedev-showcase/blob/main/docs/BUILD.md)), which cover file paths and screenshot checks, not design.

## Controls

| Action | Keyboard and mouse | Touch |
|---|---|---|
| Paint the scrap | click and drag, or arrow keys + Space | drag on the frame |
| Choose a fabric | 1–7, or right-click a square | tap a swatch |
| Unpick a stroke | Ctrl+Z | Unpick button |
| Steer | ← → or A D | left-thumb arrow buttons |
| Set a course | click the sea | tap the sea |
| Raise / lower sail | ↑ ↓ or W S | right-thumb arrow buttons |
| Read the chart | C | chart button |
| Pause | Esc or P | pause button |
| Sound on/off | M | sound button |

## Built with

- wavefunctioncollapse 2.1.0: https://esm.sh/wavefunctioncollapse@2.1.0

Fonts: Alegreya, Special Elite (Google Fonts)

## Notes from the build

- esm.sh turns the CommonJS package into named exports (OverlappingModel, SimpleTiledModel). Load it through an import map at the exact version.
- The constructor is cheap but the first iterate()/generate() allocates the wave, at about 0.36 MB per pattern for a 72×48 chart (arrays of arrays). Read model.T after constructing and refuse samples that make too many patterns. Also, clear() throws on a model that has never iterated.
- Don't call graphics() every frame on an unfinished OverlappingModel: it loops cells × N² × patterns. To animate, read model.sumsOfOnes and model.wave to find cells that have settled, and call graphics() once at the end.
- With N=3 on a 12×12 sample, non-periodic input contradicts almost every time. Design samples that tile, and keep periodicInput on.
- iterate(n, rng) gives the same result however you split n, as long as the seeded rng is the same. So you can search seeds quickly with generate() and replay the winning one with iterate() for the animation. In SimpleTiledModel, generate neighbour pairs from the library's own rotated tile bitmaps, because a wrong symmetry letter silently gives wrong rules.

Departures from the brief: The 'periodic edges' option controls periodic output (the chart wraps east–west and north–south); periodic input is always on, because in testing non-periodic input with 3×3 pieces on a 12×12 scrap contradicted on nearly every try. To keep a round at 2–5 minutes, at most 7 harbours stay as ports of call, spread across the chart; the other harbour clusters are turned into beach, and the workroom says how many. To protect memory, the loom refuses scraps that cut into more than 360 patterns (350 on devices reporting 2 GB or less) and explains how to simplify them. The Admiralty mode is tuned with three coast presets (tile weights) instead of a painted scrap.

## Caveats

- Quiet since August 2023, and CommonJS only; load it through esm.sh in the browser.
- Generation can hit a contradiction; retry with a new seed (this page shows the retries).

## Source facts

- Licence: MIT · 526 stars on 2026-10-16
- Browser support: any modern browser (ES modules, Canvas 2D, WebAudio); the library loads from esm.sh, so it needs a connection
- Checked: Played with scripts/inspect.mjs at 1440×900 and 390×844 using real input: mouse clicks and drags on desktop (Play, ready scrap, painting on the frame, number keys for fabrics, Sew, Skip ahead, Set sail, arrow keys to steer and trim, clicking the sea to set a course, C for the chart view, Esc to pause and resume), and taps, touch drags and held touch buttons on the phone (painting, recovering from a scrap that knotted 13 times in 14 tries, steering with the thumb pads, sail buttons, tapping a course, chart and pause buttons). Each round then ran to the end screen with a small autopilot driven through window.__game.input(), and probes confirmed every state change (title, sewing, workroom, playing, chart, paused, over). An 11-chart autopilot batch (8 patchwork charts and 3 Admiralty charts) won every voyage, in 67 to 170 seconds of sim time with 2 to 7 days to spare. Same seed and same inputs give an identical snapshot. Also checked: keyboard-only menus (Tab, Enter, Escape returning focus, arrow keys and Space painting the scrap), reduced motion, the muted attract mode inside an iframe, 2560×1440, zero console errors and failed requests, and no sideways overflow at any size. Sample scraps were tuned in Node against the library source for pattern counts, contradiction rates, harbour reachability and island-shape variety. Every screenshot was reviewed.

