# How to recreate cartridge 02: Hedge Witch

**Tool:** MengTo game-development skills (skill pack) · [MengTo/Skills](https://github.com/MengTo/Skills)
**Play it:** https://lelelilo-studios.github.io/gamedev-showcase/showcases/02-mengto-game-skills/

Meng To's game skills shaped this small isometric action-RPG from the inside out: a deterministic fixed-tick sim with every spell built as startup, active and recovery frames, telegraphed enemy AI on named states, and review routes to open any bell or boss phase. The spells take their look from the fire, frost and lightning VFX skills, scaled down to a dozen foes on a phone, and were scored on stepped-clock contact strips by two blind judges against the polish skill's readability rubric.

## Steps

1. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in.
2. Get the MengTo game-development skills skills with the commands in **Install**, and read their `SKILL.md` files before you use them.
3. Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.
4. Make an empty folder, open a terminal in it and run `claude`.
5. Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.
6. Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.
7. Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.

## Install

Copy the skill folders you need into your project:

```
git clone https://github.com/MengTo/Skills.git
mkdir -p .claude/skills
cp -r Skills/agent-skills/game-development/* .claude/skills/
```

then ask Claude Code:

```
Use build-isometric-arpg to build …
```

## Prompt

The exact brief the builder received:

````markdown
Use Meng To's game skills (MengTo/Skills: `agent-skills/game-development` and `agent-skills/game-combat`) to build "Hedge Witch", a small, finished isometric action-RPG in three.js (three@0.186.1 from jsDelivr through an import map).

The game: a hedge witch defends her walled herb garden through one night. Slugs, snails and armoured beetles come over the wall in waves; the last wave brings the Thornback, a beetle boss with two phases. Move with WASD/arrows or a left thumb stick, aim with the mouse or right thumb, and cast three spells, each with its own cooldown and counterplay:
- **Ember** (fire): a thrown seed that bursts into a short ring of flame; slugs hate it.
- **Rime** (frost): a cone that frosts the ground and slows everything on it; shatters frozen snails.
- **Spark** (lightning): a chain bolt that jumps between up to four enemies; the only thing that cracks the beetle's shell.
Plants in the beds have health; let too many be eaten and the night is lost. Between waves, pick one of three small upgrades. A run is 4 to 6 minutes.

Follow the skills, scaled to one page:
- `build-isometric-arpg`: build in vertical slices in its order (movement and camera, one verb, one enemy, one reward, one objective), with data-driven content kept apart from runtime state, and review states you can open with query parameters (for example `?wave=5`, `?boss=2`).
- `build-game-camera-controls`, `design-action-combat` (startup, active and recovery frames for each spell, contact decided by the simulation, not by visuals), `tune-enemy-ai` (telegraphs before every attack, fair spacing), `design-game-encounters` (wave pacing, the boss phases).
- `create-game-vfx` and `build-game-audio-feedback` for readable, pooled effects and prioritised sounds. For the three spells, take the visual language from `fire-smoke-skill-vfx`, `ice-frost-skill-vfx` and `lightning-energy-skill-vfx`, simplified to what an arena with a dozen enemies can afford at 60 fps on a laptop and a phone.
- `build-mobile-threejs-games` for the touch layout, safe areas and a lower quality tier on phones; `test-playable-web-games` for the playtest; `optimize-threejs-games` if frame time is a problem.
- Score a few filmed casts against the `game-dev-combat-skill-polish` readability rubric and fix the weakest spell.

Look: a garden at night lit by the witch's lantern and the spells, a painterly, slightly storybook isometric world built from procedural geometry (no downloaded models or textures). A warm, hand-set storybook face for titles and a clean, sturdy face for the HUD.
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
| Move | WASD / arrows | left thumb stick (floats where you touch) |
| Aim | mouse (no mouse: spells find the nearest foe) | drag from a spell button; tap to aim at the nearest foe |
| Ember | left click / J / 1 | ember button |
| Rime | right click / K / 2 | rime button |
| Spark | Space / L / 3 | spark button |
| Skip aside | Shift | skip button |
| Choose a charm | 1 / 2 / 3 or click | tap a packet |
| Pause / sound | Esc or P / M | buttons, top right |

## Built with

- three 0.186.1: https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js

Fonts: IM Fell French Canon, Alegreya Sans, Alegreya Sans SC (Google Fonts)

## Skill files the builder read

- [README.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/README.md)
- [agent-skills/game-development/README.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/README.md)
- [agent-skills/game-development/build-isometric-arpg/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/build-isometric-arpg/SKILL.md)
- [agent-skills/game-development/build-game-camera-controls/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/build-game-camera-controls/SKILL.md)
- [agent-skills/game-development/design-action-combat/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/design-action-combat/SKILL.md)
- [agent-skills/game-development/tune-enemy-ai/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/tune-enemy-ai/SKILL.md)
- [agent-skills/game-development/design-game-encounters/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/design-game-encounters/SKILL.md)
- [agent-skills/game-development/create-game-vfx/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/create-game-vfx/SKILL.md)
- [agent-skills/game-development/build-game-audio-feedback/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/build-game-audio-feedback/SKILL.md)
- [agent-skills/game-development/build-mobile-threejs-games/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/build-mobile-threejs-games/SKILL.md)
- [agent-skills/game-development/test-playable-web-games/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/test-playable-web-games/SKILL.md)
- [agent-skills/game-development/optimize-threejs-games/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/optimize-threejs-games/SKILL.md)
- [agent-skills/game-development/build-threejs-enemy-systems/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-development/build-threejs-enemy-systems/SKILL.md)
- [agent-skills/game-combat/README.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-combat/README.md)
- [agent-skills/game-combat/fire-smoke-skill-vfx/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-combat/fire-smoke-skill-vfx/SKILL.md)
- [agent-skills/game-combat/ice-frost-skill-vfx/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-combat/ice-frost-skill-vfx/SKILL.md)
- [agent-skills/game-combat/lightning-energy-skill-vfx/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-combat/lightning-energy-skill-vfx/SKILL.md)
- [agent-skills/game-combat/game-dev-combat-skill-polish/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-combat/game-dev-combat-skill-polish/SKILL.md)
- [agent-skills/game-combat/game-dev-combat-skill-polish/references/rubric-readability.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-combat/game-dev-combat-skill-polish/references/rubric-readability.md)
- [agent-skills/game-combat/game-dev-combat-skill-polish/references/rubric-art.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-combat/game-dev-combat-skill-polish/references/rubric-art.md)
- [agent-skills/game-combat/game-dev-combat-skill-polish/templates/judge-prompt.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-combat/game-dev-combat-skill-polish/templates/judge-prompt.md)
- [agent-skills/game-combat/game-dev-combat-animation/SKILL.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-combat/game-dev-combat-animation/SKILL.md)
- [agent-skills/game-combat/game-dev-combat-animation/references/techniques.md](https://github.com/MengTo/Skills/blob/398cd41c86ba42fbb30e944ae507f463648f08b7/agent-skills/game-combat/game-dev-combat-animation/references/techniques.md)

They were downloaded as plain text at commit `398cd41` and reviewed first; nothing from the skill repo was installed or run.

## Notes from the build

- three r186 skips tone mapping and the sRGB transform when you render into a render target, so a custom composite has to apply both itself; copy three's ACESFilmic, including its /0.6 exposure, or the scene shifts when you move it off the default framebuffer.
- ShaderMaterial.clone() deep-copies its uniforms, so a shared time uniform has to be attached again after every clone, or the cloned telegraphs and decals freeze.
- Headless Chrome renders on the CPU at 1 to 6 fps, so a 6-step catch-up cap slows the sim to a crawl in playtests. A test-only ?maxsteps= keeps it near real time. Film effects on a stopped clock you step yourself, and stop the rAF loop from rendering between steps: it was eating the 0.08 s ink impact frames before the screenshot.
- Release a projectile at the end of the throw, not at the top of the wind-up, and draw a new bolt into its buffer the moment it's made. A seed leaving from behind the head, or a contact flash one frame before its bolt, was the first thing every blind judge marked down.
- A clip-path polygon worked out from getBoundingClientRect clips scaled or rotated cards and goes stale once web fonts load. Use offsetWidth/offsetHeight and re-cut it in a ResizeObserver.

Departures from the brief: The polish skill's blind judges were two fresh subagents per round, each given only the rubric, a list file and the strips (as the skill describes). Its film, strip and judge scripts weren't run: an in-page stepped-clock hook, a scratch HTML strip page and headless screenshots did that job. Ember's strips use 0.075 s tiles so the landing and the slugs' reaction fit on the strip. Six rounds lifted the lower-judge readability scores to Ember 6.5, Rime 7 and Spark 6.5 (peaks 7, 8 and 7.5), above the skill's 6+ bar. They then plateaued at about the judge spread. The skill's next lever, a modelled hero asset made with image-to-3D, isn't allowed under the house rules (everything here is procedural geometry). The fire, frost and lightning effects keep the skills' visual language (buoyant flame tongues, frost grown and revealed by arrival time, held lightning trees with ink impact frames) but use billboards, decals and ribbons instead of ray-marched volumes, so a dozen foes stay affordable on a phone. Ink impact frames are kept for the boss, shatters and the boss phase change; ordinary shell cracks get a local flash, because a judge read a full ink frame there as a crude white blob. I added a Skip dodge (Shift) that isn't in the brief, so beetle charges have an answer besides walking away. The night is six bells. The autopilot clears it in about 3.5 to 4 minutes, so a person should take about 4 to 6.

## Caveats

- The README's own setup notes say install instructions for Claude Code are still to come; copying the SKILL.md folders works.
- Some skills assume generated or rigged 3D assets; this showcase uses procedural meshes only.

## Source facts

- Licence: MIT · 6,802 stars on 2026-10-16
- Browser support: any modern browser with WebGL 2 (a designed fallback explains if it is missing)
- Checked: Real-input playtests in headless Chrome (rendering on the CPU at 1 to 6 fps; a test-only ?maxsteps=40 kept the sim near real time). At 1440x900: two full rounds from the title (Enter) on key presses and left clicks, through a charm pick to the end card. Both were losses on bells 2 and 3 by a blind scripted player that roams in a loop and fires spells at the nearest foe. After the end card, Enter started Play again. At 390x844: a full round on taps, thumb-stick drags and drag-to-aim, through two charm picks to the end card. Also checked: pause and resume (Esc, the button, Enter with nothing focused), mute on M (stored in localStorage), How to play and Settings, ?wave=, ?boss=1 and ?boss=2, ?review=, reduced motion, and an 800x500 iframe preview (muted attract mode, compact card). __game probes confirmed every state change. The same seed and the same inputs gave identical snapshots in the browser and in Node. Zero console errors, zero failed requests, and no sideways overflow at either size. In Node, the attract-mode pilot played the fixed-tick sim on 8 seeds: 7 nights won in 3.5 to 4 minutes, losing 0 to 5 herbs, and one lost. Six rounds of stepped-clock contact strips per spell were scored by two fresh blind judges on the polish skill's readability rubric, lower score kept: Ember 6, 6, 6.5, 6.5, 7, 6.5; Rime 7, 7.5, 7.5, 7.5, 8, 7; Spark 6.5, 6.5, 7, 7.5, 6.5, 6.5. Scene cost at the boss is about 107 draw calls and 67k triangles. Our files weigh about 350 KB. After the coordinator's QA pass: big numbers now use Alegreya Sans lining figures, checked with 10, 100 and 1,000 on the end card at both sizes. Spell countdowns sit in the icon slot, so the name and key hint stay readable. Coach lines close once the player does what they ask (or after 6 s of real time), and are hidden on the end card, the charm screen and pause. Both full-round playtests were rerun on the fixed build: zero errors, and Play again worked.

