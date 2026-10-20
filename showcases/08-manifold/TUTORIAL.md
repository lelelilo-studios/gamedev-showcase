# How to recreate cartridge 08: Brushwork

**Tool:** manifold (library) · [elalish/manifold](https://github.com/elalish/manifold)
**Play it:** https://lelelilo-studios.github.io/gamedev-showcase/showcases/08-manifold/

Every level is an ordered list of solid brushes that manifold folds with union and difference on each stamp, undo and hover, so doorways, bridges and vaults appear live and the readout (triangles, vertices, genus, shells, manifold) updates with them. The result is always watertight, so the same mesh can be walked on, ray-cast, coloured by which brush made each face, and exported as a GLB.

## Steps

1. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in.
2. Nothing to install for a quick start: the game loads manifold from a CDN at a pinned version (see **Built with**). For a real project use the npm command in **Install**.
3. Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.
4. Make an empty folder, open a terminal in it and run `claude`.
5. Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.
6. Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.
7. Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.

## Install

npm:

```
npm install manifold-3d
```

then:

```
import Module from 'manifold-3d';
const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;
```

## Prompt

The exact brief the builder received:

````markdown
Use manifold (manifold-3d@3.5.4, its WebAssembly build) with three@0.186.1 to build "Brushwork", a small, finished build-then-walk puzzle game about greyboxing a level.

The game: each puzzle is a level designer's problem. A first-person player must get from the start pad to the bell in the tower and ring it. You build the route with a limited set of brushes, then press P to walk it yourself. Brushes are solids you place on a grid and set to **add** or **subtract**: boxes, ramps (wedges), cylinders, arches, stairs. Subtracting carves doorways, tunnels and windows through what's there; adding builds bridges and steps. Every edit re-runs the boolean in manifold and updates the level mesh live. Six puzzles of rising difficulty (a wall in the way, a gap to bridge, a locked tower you have to carve into, a moat, a low ceiling, the last one asks for both). Score by brushes left unused and time to the bell.

Make manifold carry the game:
- Keep the level as an ordered list of brushes and rebuild it with manifold's booleans (union and difference) on every change, with undo and redo.
- Show the result's stats as the designer's readout: triangles, vertices, genus (holes through the solid) and whether it's manifold (always yes, which is the point).
- Smooth, flat-shaded output with a "dev texture" grid that keeps its scale on every face (triplanar), and coloured overlays for the brush you're placing (green for add, red for subtract) as a ghost.
- Walk mode: first-person movement with gravity, steps and collision against the built mesh (raycasts or a simple capsule test are fine). Mouse look with pointer lock, and on phones a left stick and drag to look.
- Export the level as a GLB file.

Look: a calm editor: a dark slate viewport with a fine blueprint grid, white and two greys for the level, orange for the start pad and brass for the bell. A precise technical sans or mono for the toolbar and readouts, and a narrow display face for puzzle titles.
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
| Stamp brush | click (or Enter) | tap a spot, tap again or Stamp |
| Orbit / zoom | drag / wheel | drag / pinch |
| Pick brush | 1–5 | tap the kit |
| Add / subtract | X | ADD / SUB switch |
| Rotate brush | R | Rotate button |
| Raise / lower brush | E / Q | arrow buttons |
| Nudge brush | arrow keys | tap elsewhere |
| Undo / redo | Z / Y | Undo / Redo |
| Walk test | P | Walk |
| Move / look (walk) | WASD or arrows / mouse (pointer lock, or drag) | left stick / drag on the right |
| Export level | G | pause menu |
| Pause / mute | Esc / M | II / speaker button |

## Built with

- manifold-3d 3.5.4: https://cdn.jsdelivr.net/npm/manifold-3d@3.5.4/manifold.js
- three 0.186.1: https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js

Fonts: Martian Mono, Sofia Sans Extra Condensed (Google Fonts)

## Notes from the build

- Manifold.extrude's scaleTop must be a 2-vector: the number 1 is read as [1, 0], which silently collapses the far cap to the floor, so arches carved wedges and ramps became slivers. Pass [1, 1].
- Transforms turn a Manifold into a product (originalID() becomes -1). Call asOriginal() on the untransformed brush, record that ID, then rotate and translate; getMesh().runOriginalID still points back to it, which is how faces get coloured by brush.
- genus() is for a single mesh. With several shells, total genus = genus() + shells - 1 (shells = decompose().length). Delete every decompose() part and every intermediate Manifold or CrossSection; deleting a JS handle is safe even while a lazy CSG result still uses it.
- RayHit.distance is a fraction of the segment you pass (origin to endpoint), not metres, and faceID comes back as a BigInt, so keep hits out of JSON.stringify.
- In three r186 scene.environment is scaled by scene.environmentIntensity, not by the material's envMapIntensity; a RoomEnvironment there floods a matte greybox with flat light. Give the env map only to the metal (here the brass bell) and light the level with hemisphere + sun at physical intensities (about 3.4 and 2.1).

Departures from the brief: P starts and stops the walk test, as the brief asks, so pausing is on Esc (and automatic on blur, tab hide or losing pointer lock) rather than also on P; P only resumes from the pause menu. Moving the walker is a simple capsule (three spheres plus downward ground probes) against the built triangles rather than a physics engine.

## Caveats

- Manifold objects live in WebAssembly memory; call delete() on the ones you no longer need.

## Source facts

- Licence: Apache-2.0 · 2,356 stars on 2026-10-16
- Browser support: Any current desktop or mobile browser with WebGL 2 and WebAssembly (designed fallback screens if either is missing). Pointer lock is optional: mouse-look falls back to drag-to-look.
- Checked: Played with scripts/inspect.mjs playtests (generator in the scratch folder): at 1440x900 all six tickets were solved with real clicks and key presses (1/2/3 to pick brushes, X for subtract, clicks on the measured wall, plinth, island and tower faces, Z/Y undo-redo, a mouse-drag orbit), then P to walk; real W key held and a mouse drag-to-look were checked against window.__game.snapshot(), and the route to each bell rope was driven through __game.input()/step(). End screen reached (6/6 bells, 14,131 points, new best saved), GLB export returned 145 KB, Enter played again. At 390x844 two tickets were solved with taps (tap to aim and tap again, and the Stamp button), the touch stick moved the walker ~8 m and a right-side drag turned it, then the clock was run out to the losing end screen. Also checked: falls and water respawn and count, the low ceiling blocks the 1.8 m walker, identical inputs give identical snapshots, Esc pause/resume, blur auto-pause, M mute saved to localStorage, keyboard-only menus (Tab/Enter/Esc) and arrow-key brush placement, drag-to-look when pointer lock is refused, reduced-motion title, the muted attract mode inside an iframe at two sizes, no sideways overflow at either size, and zero console errors or failed requests. Every screenshot was reviewed.

