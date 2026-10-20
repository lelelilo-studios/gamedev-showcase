# How to recreate cartridge 04: Seconds Day

**Tool:** three-piñata (library) · [dgreenheck/three-pinata](https://github.com/dgreenheck/three-pinata)
**Play it:** https://lelelilo-studios.github.io/gamedev-showcase/showcases/04-three-pinata/

Every pot is a watertight procedural solid that three-piñata breaks on impact into seeded Voronoi fragments, crowded around the contact point, with more pieces for harder hits; big shards break again when they land, and a wire-cutting interval slices clay with planes. Glazed outsides keep each pot's own glaze while every broken face shows raw terracotta, mapped through the library's cut-face UVs.

## Steps

1. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in.
2. Nothing to install for a quick start: the game loads three-piñata from a CDN at a pinned version (see **Built with**). For a real project use the npm command in **Install**.
3. Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.
4. Make an empty folder, open a terminal in it and run `claude`.
5. Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.
6. Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.
7. Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.

## Install

npm:

```
npm install @dgreenheck/three-pinata
```

## Prompt

The exact brief the builder received:

````markdown
Use three-piñata (@dgreenheck/three-pinata@2.0.1) with three@0.186.1, and Rapier (@dimforge/rapier3d-compat, an exact pinned version) to move the pieces, to build "Seconds Day", a small, finished destruction game.

The game: once a year the fictional Wren Lane Pottery lets the public smash its seconds, the pieces that came out of the kiln flawed. You get a basket of throwing balls and a wooden shelf stand loaded with mugs, jugs, plates, a tall vase and a teapot. Drag back to aim and release to throw (mouse, or touch: drag from the basket). Pieces break where they're hit; fragments fall, bounce and break again if they land hard enough. Three rounds (shelf, pyramid stack, the big kiln-shelf finale), a limited number of balls each. Score by the value of seconds smashed, with combo bonuses for chain reactions, and a "keeper" piece in each round, marked with a blue thumbprint, that must survive or the round's score halves.

Show what three-piñata does:
- Impact-based Voronoi fracturing, concentrated around the contact point, with more pieces for harder hits.
- Refracturing: big fragments can break again (track generations yourself and cap them).
- Plane slicing: a "wire cutter" round, where you swipe across a block of unfired clay to slice it before it's thrown.
- Dual materials: glazed outer surfaces (each piece's own glaze), raw terracotta on the broken faces, with the library's UV generation for the inner faces.
- Seeded fractures, so the same seed and throw give the same pieces.
Keep it smooth: cap fragments in flight, put settled fragments to sleep, and sweep old ones off the floor between rounds (a brush sweeps them into a pile, which stays visible as the day's tally).

Look: a bright pottery yard in the afternoon, whitewashed walls, wooden shelves, glazes in celadon, cobalt, oxblood and oatmeal, the terracotta insides showing on every break. A friendly rounded slab serif or hand-lettered sign face for titles and a clean face for the scoreboard, chalked on a board.
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
| Throw | press anywhere, drag back, let go (pull further for a harder throw, sideways to aim) | drag down from the basket and let go |
| Aim with keys | ← → aim, ↑ ↓ power, Space throws |  |
| Cut the clay | drag across the block, or ← → move and ↑ ↓ tilt the wire, Space pulls | swipe across the block |
| Pause | Esc or P | pause button, top right |
| Mute | M | speaker button, top right |

## Built with

- @dgreenheck/three-pinata 2.0.1: https://cdn.jsdelivr.net/npm/@dgreenheck/three-pinata@2.0.1/build/three-pinata.es.js
- three 0.186.1: https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js
- @dimforge/rapier3d-compat 0.21.0: https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.21.0/dist/rapier.mjs

Fonts: Caprasimo, Recursive (Google Fonts)

## Notes from the build

- fracture() places fragments with the mesh's matrixWorld but copies its local quaternion and scale, so keep destructible meshes as direct children of the scene and call updateMatrixWorld() before breaking them. slice() doesn't recentre its pieces; fracture() does.
- The library needs watertight input. Build lathe solids with a single pole vertex at each end; seam duplicates are fine, since it welds by position. Hand it position, normal and uv: other attributes are dropped from the fragments.
- Cut-face UVs are normalised to 0..1 per face (textureScale multiplies that), so a texture drawn as ripples from one corner reads as each break's own fracture origin.
- In Rapier 0.21, convex hulls resting face to face slide off each other (stacked plates fell through the stack), and bodies created asleep sink when woken. Give intact objects primitive or compound colliders, keep hulls for fragments, and create bodies awake so they settle.
- Fracturing is synchronous (10 to 40 ms for 8 to 14 pieces of an 800-triangle pot), so run it inside a fixed sim step and cover it with a short hit pause. Its triangulator sometimes logs 'Failed to find final triangle', which is harmless.

Departures from the brief: The wire cutter is an interval between rounds II and III rather than a fourth round: three pulls of the wire, and every lump within 60 g of 500 g becomes a heavy clay ball for the kiln stack, so the slicing feeds the finale. Intact pots stand on compound primitive colliders (cylinders, boxes, a ball) instead of convex hulls, because in Rapier 0.21 hulls resting face to face slide off each other; fragments use convex hulls built from their own vertices, as briefed. A shattering pot gives its neighbours a small push, aimed high and towards the shelf front, so that chain reactions happen; without it a hit pot simply vanished and its shards were too light to knock anything over. Inside an iframe the title card shrinks to a corner sign without buttons, so the attract shatter stays visible in the preview.

## Caveats

- It breaks meshes but doesn't move the pieces; pair it with a physics engine (this page uses Rapier).
- Fracturing many fragments at once costs a frame or two; cap the count on phones.

## Source facts

- Licence: MIT · 448 stars from GitHub on 2026-10-19 (the wiki has no snapshot for it)
- Browser support: Any modern desktop or mobile browser with WebGL 2 and WebAssembly (Chrome, Edge, Firefox, Safari 15+).
- Checked: Played two full days with real input through scripts/inspect.mjs --steps: title, how-to, Play, all three rounds, the wire interval and the receipt, then Play again. At 1440×900 with mouse drags the day ended in a loss (188, round III short of its quota); at 390×844 with touch drags from the basket and swipes across the clay it was a win (237). Both runs reproduced their __game probes exactly. Zero console errors, zero failed requests, no sideways scroll at either size. Esc pauses and resumes mid-round, Escape closes the how-to card, and M mutes, with the setting saved in localStorage. Determinism: the same seed and inputs give identical snapshots, fragment positions included (40 to 47 shards), at both sizes, and a different seed gives a different result. Reduced motion turns 'reduce flashing' on and swaps the card swing for a fade. In an iframe the title becomes a corner sign over the muted attract (a mug shattering on a stool), with no corner label and no audio. A CDN failure during one run showed the designed error state. In Node, about 5,300 seeded fractures and refractures of every pot shape finished without a hang and conserved volume. The library's triangulator occasionally logs the warning 'Failed to find final triangle'.

