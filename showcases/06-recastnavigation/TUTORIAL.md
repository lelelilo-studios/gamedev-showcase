# How to recreate cartridge 06: Sheepdog Trials

**Tool:** recastnavigation (library) · [recastnavigation/recastnavigation](https://github.com/recastnavigation/recastnavigation)
**Play it:** https://lelelilo-studios.github.io/gamedev-showcase/showcases/06-recastnavigation/
**Browser build:** [isaac-mason/recast-navigation-js](https://github.com/isaac-mason/recast-navigation-js)

Every ewe is a Detour crowd agent steering on a Recast navmesh built at load from the walls, gorse and the beck, so a frightened flock flows round obstacles and finds the only bridge by itself. The tile cache cuts the mesh live when hurdles are pitched in the Championship course and when the shepherd opens and shuts the pen.

## Steps

1. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in.
2. Nothing to install for a quick start: the game loads recastnavigation from a CDN at a pinned version (see **Built with**). For a real project use the npm command in **Install**.
3. Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.
4. Make an empty folder, open a terminal in it and run `claude`.
5. Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.
6. Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.
7. Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.

## Install

npm (the WebAssembly port, recast-navigation-js):

```
npm install recast-navigation @recast-navigation/three three
```

## Prompt

The exact brief the builder received:

````markdown
Use Recast Navigation through its WebAssembly port (recast-navigation@0.43.1 and @recast-navigation/three@0.43.1 from jsDelivr) with three@0.186.1 to build "Sheepdog Trials", a small, finished herding game.

The game: you are a young sheepdog at the fictional Coldharbour Fell trials. Twelve to twenty sheep graze on a hillside field with stone walls, gorse, a stream with one bridge, a pair of drive gates and a pen. Run the course against the clock: fetch the flock down the hill, drive them through the gates, then pen them and the shepherd closes the gate. You control the dog directly (WASD/arrows, or a thumb stick on phones); Space barks (scatters sheep near you), Shift creeps (slow, the sheep stay calm). Sheep that are pushed too hard bolt; a sheep that escapes the field costs points. Three courses of rising difficulty; score by time, gates cleared and how calm the flock stayed, judged like a real trial with points deducted.

Make Recast and Detour carry the game:
- Build the navmesh from the field's geometry at load (walls, gorse, the stream as unwalkable, the bridge as the only crossing), as a tile cache so it can change.
- Every sheep is a DetourCrowd agent. Each step, choose its target from flocking and fear of the dog (flee away from the dog along the navmesh, stay near neighbours, graze when calm), and let the crowd do the steering and separation.
- Hurdles and hurdle gates: in the third course, the shepherd drops hurdles at set times, added as tile-cache obstacles that cut the navmesh live; the flock reroutes around them.
- A debug overlay (key N) draws the navmesh, the tiles being rebuilt, each sheep's path and corner points, and the dog's "pressure" circle.
- Seeded RNG for the flock's starting positions and personalities (one sheep is always a bolter).

Look: a green northern fell under a big sky, dry-stone walls, wool that reads as soft (felted, chunky shapes, procedural only), a black-and-white dog with a wagging tail. A characterful serif for titles and the judge's scorecard, written like a show programme.
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
| Run | WASD / arrows | left thumb stick (floats to your thumb) |
| Steady (creep) | hold Shift | push the stick half way, or the Steady button |
| Lie down | let go | let go |
| Bark | Space | Bark button |
| Navmesh overlay | N | Navmesh chip |
| Pause / mute | Esc or P / M | top-right buttons |

## Built with

- @recast-navigation/core 0.43.1: https://cdn.jsdelivr.net/npm/@recast-navigation/core@0.43.1/dist/index.mjs
- @recast-navigation/generators 0.43.1: https://cdn.jsdelivr.net/npm/@recast-navigation/generators@0.43.1/dist/index.mjs
- @recast-navigation/wasm 0.43.1: https://cdn.jsdelivr.net/npm/@recast-navigation/wasm@0.43.1/dist/recast-navigation.wasm.js
- @recast-navigation/three 0.43.1: https://cdn.jsdelivr.net/npm/@recast-navigation/three@0.43.1/dist/index.mjs
- three 0.186.1: https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js

Fonts: IM Fell English SC, IM Fell DW Pica, Reenie Beanie (Google Fonts)

## Notes from the build

- In generateTileCache the walkableHeight, walkableClimb and walkableRadius config values are in voxel units (cells), not world units: multiply by ch or cs to think in metres
- Give obstacles in the Recast input sloped or knife-edge tops (prisms, cones): flat-topped wall boxes or gorse cylinders leave walkable islands on top that findClosestPoint will happily snap a target onto
- tileCache.update rebuilds one tile per call; call it every fixed step until it reports upToDate, and compare navMesh.getTileRefAt before and after to know which tiles were rebuilt
- Flock behaviour lives or dies on the targets you feed requestMoveTarget: ewes that only flee inside a tight flight zone move in stop-start pulses; a wider, softer awareness zone plus 'follow your neighbours' makes the flock flow
- generateSoloNavMesh crashed in buildPolyMeshDetail for a field this size; the tiled generator handled the same input fine

Departures from the brief: The beck is unwalkable for the ewes only: the dog wades it at half speed, so the field stays quick to cross. In course III the hurdles lie flat in the grass and are pitched upright at the set times printed on the plan, rather than carried in by the shepherd, who is holding the pen. The pen gate starts shut and the shepherd opens it when he reaches it, so ewes can't drift into the pen early. To keep penning playable, calm ewes near the pen follow the first ones in along a Detour path through the mouth. The page imports @recast-navigation/core, generators, wasm and three directly; the recast-navigation umbrella package only re-exports them.

## Caveats

- The browser build is a community port (isaac-mason/recast-navigation-js, MIT) of the C++ library.
- The C++ repo has had no pushes since February 2026; it's mature rather than abandoned.

## Source facts

- Licence: Zlib · 7,967 stars on 2026-10-16
- Browser support: Any modern browser with WebGL 2 and WebAssembly (Chrome, Edge, Firefox, Safari 15+); touch controls on phones.
- Checked: scripts/inspect.mjs at 1440x900 and 390x844: 0 console errors, 0 failed requests, no sideways overflow; also 2560x1080, 1280x720 and 1024x700 (title fits), --reduced-motion (calm mode on), and the title running as attract mode inside an iframe. Desktop playtest (seed 3): How to play and Play opened with Tab-focus + Enter, arrow keys and A moved the dog, Space barked, M muted, Esc paused and resumed, N toggled the overlay, then steering through __game.input(__game.suggest()) penned all 12 at 3:12 for 74 points and Enter on Play again started a new run. Phone playtest (seed 3, touch emulation): real taps on Play, How to play, Bark, Steady, Plan, Navmesh and pause/resume, touch drags on the floating stick moved the dog up and left, and the steered run penned all 12 at 2:26 for 92 points. Same seed + same inputs gave an identical snapshot over two runs. Batches of the built-in autopilot over several seeds finish most runs on all three courses (others end with most of the flock penned); hurdles pitched as tile-cache obstacles and tiles rebuilt via tileCache.update were confirmed by probe. Every screenshot was looked at.

