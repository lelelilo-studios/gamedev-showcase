# How to recreate cartridge 03: Harbour Crane

**Tool:** JoltPhysics (library) · [jrouwe/JoltPhysics](https://github.com/jrouwe/JoltPhysics)
**Play it:** https://lelelilo-studios.github.io/gamedev-showcase/showcases/03-joltphysics/
**Browser build:** [jrouwe/JoltPhysics.js](https://github.com/jrouwe/JoltPhysics.js)

Every lot on the quay, the lighter, the crane and its rope are Jolt rigid bodies: the slew and luff are motor-driven hinges, the rope is a chain of bodies on distance constraints, and the lighter floats, lists and floods through ApplyBuoyancyImpulse. Contact events drive the thuds and the damage, a collision view draws Jolt's own shapes and constraints, and the end screen re-runs the shift from its lever log to show the fixed-step simulation is deterministic, down to a hash of Jolt's saved state.

## Steps

1. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in.
2. Nothing to install for a quick start: the game loads JoltPhysics from a CDN at a pinned version (see **Built with**). For a real project use the npm command in **Install**.
3. Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.
4. Make an empty folder, open a terminal in it and run `claude`.
5. Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.
6. Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.
7. Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.

## Install

npm (the official WebAssembly port):

```
npm install jolt-physics
```

then:

```
import initJolt from 'jolt-physics';
const Jolt = await initJolt();
```

## Prompt

The exact brief the builder received:

````markdown
Use JoltPhysics, through its official WebAssembly port (jolt-physics@1.1.0 from jsDelivr), with three@0.186.1 for rendering, to build "Harbour Crane", a small, finished physics game.

The game: you run the old dockside crane at a small fictional harbour. A barge rocks at the quay. Load the day's cargo (crates, barrels, a piano in a cage, sacks, a rowing boat, an anchor) from the quay onto the barge before the tide turns. Everything is a real Jolt body; the barge floats on Jolt's buoyancy and lists as you load it unevenly. Lose cargo overboard and it floats or sinks by its density; a capsized barge ends the shift. Score by cargo delivered, how high and how level the stack stands when the horn blows, and nothing lost.

The crane: slew (rotate the boom), luff (raise and lower it), and pay out or haul in the hook on a rope, with a grab you open and close. Build it from Jolt constraints: a hinge for the slew, a hinge or slider for the luff, and the rope as a short chain of bodies joined by distance or point constraints, so the load swings and you have to damp it. Controls: keys (A/D slew, W/S luff, Q/E rope, Space grab), mouse on screen levers, and on phones two thumb levers plus a grab button.

Show what Jolt does well:
- Convex hull and compound shapes for odd cargo, with real mass and centre of mass (the piano is heavy at one end).
- `ApplyBuoyancyImpulse` for the barge and anything that falls in, with gusts that rock it.
- Sleeping bodies (a toggle shows sleep state in the colour of each body), contact events driving the thud sounds and the "damage" meter for dropped cargo.
- A debug view (key B) that draws the collision shapes and constraints over the scene.
- Deterministic fixed steps: replaying the same seed and inputs gives the same stack.

Look: a grey-green northern harbour on a breezy morning, painted steel crane in a strong signal colour, wet stone, ropes, gulls. A sturdy industrial stencil or grotesque for the HUD and levers, set like painted signage on the crane cab.
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
| Slew the jib (anticlockwise / clockwise seen from above) | A / D or ← / → | left thumb lever, sideways |
| Luff: jib up / jib out | W / S or ↑ / ↓ | left thumb lever, up and down |
| Hoist: haul in / pay out | Q / E | right thumb lever |
| Grab: shut / open | Space | brass Grab button |
| Horn: end the shift early | hold H | hold the Horn button |
| Change view (harbour, cab, deck) | C, drag the scene, mouse wheel | camera button, drag the scene |
| Sleep view / collision view | Z / B | side buttons |
| Tea break (pause) / sound | Esc or P / M | side buttons |

## Built with

- jolt-physics 1.1.0: https://cdn.jsdelivr.net/npm/jolt-physics@1.1.0/dist/jolt-physics.wasm-compat.js
- three 0.186.1: https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js

Fonts: Big Shoulders Stencil, Archivo (Google Fonts)

## Notes from the build

- A light chain of rope bodies under a heavy hook stretches while Jolt's iterative solver converges (up to 1.5 m here). A single tip-to-hook DistanceConstraint in parallel, with the chain 3% longer than it, carries the load and keeps the hoist accurate to a few centimetres.
- A hinge motor's spring is sized from the effective inertia of both bodies, so a light turret made the luff motor soft (3 to 4 degrees of sag under the boom's own weight). Raising the turret's mInertiaMultiplier fixed it without changing its mass.
- ApplyBuoyancyImpulse takes a buoyancy factor relative to the body's own mass (1 is neutral), not a fluid density, so loading a barge sinks it naturally. For a long hull, average the wave slope over its length, or it rocks far too hard.
- Emscripten returns by-value results (GetPosition, GetLinearVelocity) in a shared temporary: copy the numbers out before the next call. Keep a few reusable Vec3, RVec3 and Quat objects instead of allocating each step, and read contact-callback bodies by pointer through a Map rather than wrapping every one.
- For a bit-exact replay, destroy the JoltInterface and build a fresh one with the bodies created in the same order, quantise analogue lever input before logging it, and hash SaveState through a StateRecorderJS to compare runs.

Departures from the brief: The rope has a hidden tip-to-hook distance limit alongside its chain of bodies, because the chain alone stretched badly under the piano. Cargo slides off a heeling lighter long before she would roll over, so the capsize ending comes from flooding: a dipped gunwale ships water, which lowers her buoyancy factor until she founders or turns turtle. The release build of JoltPhysics.js has no debug renderer, so the collision view draws Jolt's shapes from ShapeGetTriangles and the constraints from their anchor points. The lighter's name, the harbour (Brackwick) and the crane's livery are invented.

## Caveats

- The browser build is the separate JoltPhysics.js repo by the same author; its API mirrors the C++ one, and objects you create with new must be freed with Jolt.destroy().

## Source facts

- Licence: MIT · 11,745 stars on 2026-10-16
- Browser support: Any current browser with WebGL 2 and WebAssembly (Chrome, Edge, Firefox, Safari 15 and later); a designed fallback explains what's missing otherwise
- Checked: Node tests of the extracted simulation block: crane, rope stretch and boom sag sweeps, float and sink by density, flooding and capsize scenarios, drop damage, a bit-exact replay of a logged 90 s shift, and twelve world rebuilds with flat Jolt memory (no leaks). scripts/inspect.mjs playtests at 1440x900 (keys and clicks) and 390x844 (taps and touch drags) went from the title through How to play, a shift with real key presses, lever drags and the Space or Grab bite and release, collision, sleep, cab and deck views, pause and resume, the held-horn ending, the report, a re-run from the log with matching Jolt state hash, a tide-out ending and a foundering ending, with __game probes after every action. Long crane moves between real inputs used __game.goto and setDown, because headless Chrome draws about one frame every 1.5 s. Also checked: reduced motion, the iframe attract mode, the ?fail=webgl fallback, zero console errors, zero failed requests and no sideways overflow.

