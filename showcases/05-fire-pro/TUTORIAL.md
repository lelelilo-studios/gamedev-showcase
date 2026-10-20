# How to recreate cartridge 05: Bucket Brigade

**Tool:** Fire Pro (library) · [dgreenheck/threejs-fire-pro](https://github.com/dgreenheck/threejs-fire-pro)
**Play it:** https://lelelilo-studios.github.io/gamedev-showcase/showcases/05-fire-pro/

Every burning roof in Bucket Brigade is a Fire Pro emitter driven by the game's own fire state, with the night's shifting wind as a Fire Pro force and the houses and hillside as colliders. It shows Fire Pro's sparse volumetric fire, smoke, bursts and ClusteredLighting working as the visual layer of a deterministic game in an ordinary three.js scene.

## Steps

1. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in.
2. Nothing to install for a quick start: the game loads Fire Pro from a CDN at a pinned version (see **Built with**). For a real project use the npm command in **Install**.
3. Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.
4. Make an empty folder, open a terminal in it and run `claude`.
5. Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.
6. Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.
7. Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.

## Install

npm (needs the exact three.js peer):

```
npm install threejs-fire-pro three@0.185.1
```

or design an effect first in the hosted editor:

```
https://dgreenheck.github.io/threejs-fire-pro/
```

## Prompt

The exact brief the builder received:

````markdown
Use Fire Pro (threejs-fire-pro@0.1.0) with three@0.185.1 (its exact peer version; WebGPURenderer) to build "Bucket Brigade", a small, finished firefighting game. It needs WebGPU; in any other browser show a designed fallback page that explains why and shows a still of the game.

The game: a dry, windy night in a fictional hill village of toy-like houses. Fires break out on roofs and spread to neighbours downwind. You work the brigade's hand pump and hose from the square: aim with the mouse or a thumb drag, hold to spray, and keep pumping (alternate keys or tap rhythm) to keep up the pressure. Water knocks a fire down and soaks the roof so it resists catching again; a fire left alone grows, then spreads. The wind shifts during the night and is shown by a weathervane. The night lasts about 4 minutes; score by houses saved, with the bell tower as the last stand.

Make Fire Pro carry the game:
- Each burning roof is a Fire Pro emitter whose strength follows the game's fire state; spreading starts new emitters downwind.
- The wind is a Fire Pro force, so flames lean and smoke drifts the way the weathervane points.
- Water hitting a fire reduces its emitter and adds a short burst of steam or smoke; a fire put out leaves a smouldering wisp for a while.
- Houses are colliders, so smoke rolls over roofs instead of through them.
- Flames light the village through the library's point lights (`ClusteredLighting`).
Keep it inside a laptop GPU budget: a capped number of live fires, `halfResolution`, coarser voxels on weaker GPUs, and a quality setting.

Headless screenshots: WebGPU canvases capture blank in headless Chrome, so add a `?mirror` query option that copies each rendered frame into a 2D canvas for screenshots (only when the option is on), and check with the `--webgpu` flag of the inspect script.

Look: a deep blue night, warm window lights, painted wooden houses like a model railway village, brass and red for the pump and the HUD. A condensed, slightly vintage display face for the title and gauges, and a plain face for text.
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
| Aim | mouse, or Q / E to jump between fires | drag anywhere on the village |
| Spray | hold the mouse button or Space | keep a thumb down |
| Pump | alternate A and D (or Left and Right) | tap PUMP in a steady rhythm |
| Pause | Esc or P | pause button |
| Sound | M | speaker button |

## Built with

- threejs-fire-pro 0.1.0: https://cdn.jsdelivr.net/npm/threejs-fire-pro@0.1.0/dist-lib/threejs-fire-pro.js
- three 0.185.1: https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.webgpu.js

Fonts: League Gothic, Libre Franklin (Google Fonts)

## Notes from the build

- Fire Pro needs the WebGPU device features shader-f16 and texture-formats-tier1. Chrome on Linux with an NVIDIA card (Vulkan) hides shader-f16 unless started with --enable-dawn-features=vulkan_enable_f16_on_nvidia, and headless screenshots need that toggle too. Check the adapter's features before importing, and say why in the fallback.
- In a fresh headless page the first navigator.gpu.requestAdapter() can return null; three.js then quietly falls back to WebGL and Fire Pro throws 'requires a WebGPURenderer running the WebGPU backend'. Request the adapter yourself with a few retries and pass the device (with all adapter features) to new WebGPURenderer({ device }).
- drawImage() of a WebGPU canvas is blank in headless Chrome. For ?mirror, use renderer.setOutputRenderTarget(rt), so tone mapping and sRGB still apply, then readRenderTargetPixelsAsync (rows are padded to 256 bytes) into a 2D canvas. Readbacks lag under load, so wait for a frame rendered after the moment you want before taking the screenshot.
- An emitter inside a mesh collider is smothered: put sphere emitters just above the roof ridge and let the collider trim the bottom of the sphere. Mesh emitters need unit world scale (size them through geometry) and spread their heat over the surface, so they burn much weaker than spheres.
- three's WebGPU renderer pays CPU time per draw call, more so while Fire Pro's lights change every frame. Merging the static village by material cut about 610 draws to about 260. Fire Pro also runs at most one solver step per update(), so on a slow frame the fluid slows down; keep the game rules in their own fixed-step simulation and let the fire follow.

Departures from the brief: Screenshots and playtests ran with the inspect script's WEBGPU_FLAGS override, which adds --enable-dawn-features=vulkan_enable_f16_on_nvidia. Under the default --webgpu flags this machine's NVIDIA/Vulkan adapter has no shader-f16, which Fire Pro requires, so the page correctly shows its fallback (scripts/thumbs.sh needs the same override for this cartridge). Two design additions: the hoseman lobs the water over a roof that blocks the flat arc, and he aims off for wind drift.

## Caveats

- WebGPU only: no WebGL fallback, and it's heavy on the GPU.
- Very new (created September 2026, version 0.1.0); read the README's Limitations section.

## Source facts

- Licence: MIT · 56 stars on 2026-10-16
- Browser support: needs WebGPU with the shader-f16 and texture-formats-tier1 features: a recent Chrome or Edge on Windows, macOS or ChromeOS, or Safari with WebGPU on. Chrome on Linux needs --enable-unsafe-webgpu --enable-features=Vulkan and, on NVIDIA, --enable-dawn-features=vulkan_enable_f16_on_nvidia. Every other browser gets a designed fallback page with a still of the game.
- Checked: Headless Chrome on an RTX 4080 (Vulkan, with the f16 toggle) using ?mirror, at 1440x900 and 390x844, zero console errors and no sideways overflow. Full-night playtests with real input. Desktop: a mouse click on Play; A/D key strokes (8 took pressure from 0.33 to 0.86); E to jump to the next fire; Space and mouse-drag holds to spray (6 fires put out, all 11 houses standing at 2:43). P paused and froze sim time, then resumed. The night ran to dawn, the end report appeared with focus on Same night again, Enter replayed it and Esc paused it. Phone: taps on Play and PUMP, relative touch drags to aim and spray (first fire out by 1:05), the pause and resume buttons, through to the end report. Also checked: the how-to and settings modals by keyboard (Tab, Enter, Esc), rapid quality switching and back to auto, determinism (the same seed and inputs give an identical snapshot, in node and in the page), reduced motion, the index-style iframe preview (muted attract mode, two roofs burning, no corner label), phone landscape, and the fallback without WebGPU and with WebGPU but no shader-f16. Balance was tuned in node with scripted players: a weak bot saves about 6 houses, an average one 8, a good one 9 or more; doing nothing loses the village and usually the tower.

