# How to recreate cartridge 09: Draw Distance

**Tool:** meshoptimizer (library) · [zeux/meshoptimizer](https://github.com/zeux/meshoptimizer)
**Play it:** https://lelelilo-studios.github.io/gamedev-showcase/showcases/09-meshoptimizer/

Every tree and stone in a 63,000-instance forest gets a four-level LOD chain built in the browser by meshoptimizer at load, and each frame the game picks a level per instance from the simplifier's own error converted to pixels, so a live panel shows about 98 % of the full-detail triangles never being drawn. A Workshop re-simplifies one specimen from sliders and shows what reorderMesh does to vertex-cache misses and what the encoder does to its size.

## Steps

1. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in.
2. Nothing to install for a quick start: the game loads meshoptimizer from a CDN at a pinned version (see **Built with**). For a real project use the npm command in **Install**.
3. Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.
4. Make an empty folder, open a terminal in it and run `claude`.
5. Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.
6. Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.
7. Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.

## Install

npm (the JavaScript build):

```
npm install meshoptimizer
```

or optimise glTF files from the command line:

```
npx gltfpack -i scene.glb -o scene.min.glb -cc -si 0.5
```

## Prompt

The exact brief the builder received:

````markdown
Use meshoptimizer@1.3.0 (zeux's JavaScript build: MeshoptSimplifier, MeshoptEncoder, MeshoptClusterizer where useful) with three@0.186.1 to build "Draw Distance", a small, finished gliding game about level of detail.

The game: you fly a wooden glider over the fictional Thousand Pines valley at golden hour, from the ridge to a meadow at the far end. Ride thermals (marked by birds circling and drifting seeds) to gain height, pass through the ranger's checkpoint hoops, and land softly on the meadow before the sun sets. Controls: mouse or arrows to bank and pitch, Shift to dive; on phones, tilt-free thumb controls. Score by checkpoints, time and landing.

The forest is the point: tens of thousands of procedurally modelled trees and rocks, each with a level-of-detail chain built in the browser at load by meshoptimizer.
- At load, model a few detailed tree and rock meshes procedurally, then simplify each into 3 or 4 LODs with `MeshoptSimplifier.simplify` (and `simplifySloppy` for the far one), with a loading screen that shows each LOD being made (triangle counts and error).
- Pick LODs per instance by distance and screen size with instanced meshes; fade between levels so they don't pop.
- A HUD readout like an instrument panel: triangles drawn this frame versus without LOD, the share saved, and draw calls.
- Key L tints every tree by its LOD level (a false-colour view). Key F freezes the LOD choice so you can fly back and see what's far.
- A "Workshop" screen (from the title or pause menu): one tree on a turntable with a slider for the target error and triangle count, the simplified wireframe over the original, and its size before and after `MeshoptEncoder` compression.
- Optimise the index order (vertex cache) and show it in the workshop.

Look: warm late-afternoon light, long shadows, haze that deepens with distance, a pale wooden glider. A refined serif for the title and a narrow instrument face for the HUD.
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
| Bank | A / D or ← / → | left thumb stick, sideways |
| Pitch | W / S or ↑ / ↓ (invertible in Settings) | left thumb stick, up and down |
| Stick with the mouse | hold the button and drag | — |
| Dive | Shift (hold) | Dive button |
| Air brake | Space (hold) | Brake button |
| Tint trees by LOD | L | L chip on the triangle panel |
| Freeze LOD choice | F | F chip on the triangle panel |
| Pause | Esc or P | pause button, top right |
| Mute | M | speaker button, top right |

## Built with

- meshoptimizer (simplifier) 1.3.0: https://cdn.jsdelivr.net/npm/meshoptimizer@1.3.0/meshopt_simplifier.js
- meshoptimizer (encoder) 1.3.0: https://cdn.jsdelivr.net/npm/meshoptimizer@1.3.0/meshopt_encoder.js
- meshoptimizer (decoder) 1.3.0: https://cdn.jsdelivr.net/npm/meshoptimizer@1.3.0/meshopt_decoder.mjs
- three 0.186.1: https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js

Fonts: Bellefair, Sofia Sans Extra Condensed, Sofia Sans Semi Condensed (Google Fonts)

## Notes from the build

- simplify cannot cross topology, so a mesh built from many closed shells (tiers, tufts) gets stuck early under its error cap. Model a conifer crown as one welded lathe surface. For the far level use simplifySloppy, but check its output: it can return far fewer triangles than asked (zero on thin trunks) or stop at its error cap. Retry with a bigger target or cap until it is really smaller than the level before.
- The index codec keeps every triangle and its winding but may rotate where each triangle starts, so a decode round trip has to compare triangles up to rotation, not raw bytes.
- Switch distances can come straight from the simplifier: absolute error = relative error × getScale(positions), and a level is good beyond d = absErr × (viewportHeight / (2·tan(fov/2))) / tolerancePx. Measure in CSS pixels, or high-DPI screens pay twice for detail nobody can see.
- three r186 applies fog after tone mapping and colour-space conversion, so a custom haze chunk mixes in display space. Keep the haze and sky colours as literal sRGB values (Color.setStyle(hex, LinearSRGBColorSpace)) or the horizon won't meet the hazed terrain.
- A shared onBeforeCompile wrapper gives every material the same default program cache key, so material variants silently share the wrong shader. Give each variant its own customProgramCacheKey.

Departures from the brief: Mouse steering is drag-to-steer: you press anywhere and drag like a stick, so a mouse left lying still never banks the glider. Space was added as an air brake for the approach. F freezes each tree's level of detail but leaves culling live, so trees behind you still appear, at the level they had when you pressed it.

## Caveats

- The JavaScript build covers simplification, clustering, encoding and decoding; some C++ algorithms are not exposed.

## Source facts

- Licence: MIT · 8,579 stars on 2026-10-16
- Browser support: Any current desktop or mobile browser with WebGL 2 and WebAssembly. There is a designed fallback screen when either is missing.
- Checked: I played full rounds with scripts/inspect.mjs. At 1440×900 with keyboard and mouse: menu clicks, the How to fly and Settings cards, the Workshop (slider drag, method toggle, draw-order replay), real arrow and Shift key holds, L and F by key and by clicking the panel chip, Esc to pause and resume, and Enter on the logbook to fly again. At 390×844 with touch: tap Fly, drag the left-thumb stick right and up, hold Dive, tap the L and F chips, pause and resume by tap. For the long flight, from release over all six hoops to the landing and the logbook, an injected autopilot steered through __game.input. Probes confirmed that bank, pitch and dive respond, that the sim time stands still while paused, that the hoops, touchdown and end state register, and that a new flight starts fresh. Zero console errors, no failed requests and no sideways overflow at either size. I also checked determinism (two runs with the same seed and inputs give identical snapshots), prefers-reduced-motion (reduce flashing on, CSS animations off), the iframe preview (muted attract flight with the LOD tint flickering on, corner label hidden) and the fallback card. In Node, the autopilot flew six seeds against the page's own flight code: five landed cleanly, and on the sixth the test pilot itself misjudged an approach over the trees. Input during loading is ignored until the title is on screen. Hammering real Enter presses (and taps on the phone) from page load onwards goes loading → title → playing at both sizes, with no screen left over the flight. Headless Chrome renders on the CPU, so frame rate was not measured; triangle and draw-call counts were read from renderer.info.

