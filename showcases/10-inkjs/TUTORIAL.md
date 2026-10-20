# How to recreate cartridge 10: The Ninth-Floor Night Porter

**Tool:** inkjs (library) · [y-lohse/inkjs](https://github.com/y-lohse/inkjs)
**Play it:** https://lelelilo-studios.github.io/gamedev-showcase/showcases/10-inkjs/

A 9,000-word ink story that the inkjs compiler builds in the page at load, then runs line by line: tags drive the bell board, sounds and the sea outside; observed variables move the clock, tips and pockets; a thread is the pocket notebook. The script view edits that same ink, recompiles it with inkjs, shows compiler faults at their lines, and restarts the night from your rewrite.

## Steps

1. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in.
2. Nothing to install for a quick start: the game loads inkjs from a CDN at a pinned version (see **Built with**). For a real project use the npm command in **Install**.
3. Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.
4. Make an empty folder, open a terminal in it and run `claude`.
5. Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.
6. Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.
7. Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.

## Install

npm:

```
npm install inkjs
```

or a script tag (runtime and compiler):

```
<script src="https://cdn.jsdelivr.net/npm/inkjs@2.4.0/dist/ink-full.js"></script>
```

## Prompt

The exact brief the builder received:

````markdown
Use inkjs@2.4.0 (the full build, with the ink compiler) to build "The Ninth-Floor Night Porter", a short, finished piece of interactive fiction written in ink, plus a script view that lets the reader rewrite it.

The story: one night shift at the fictional Halcyon Pier Hotel, a tired seaside hotel at the end of the season. You are the night porter. Between midnight and six, guests ring down with requests (a lost key, a parrot, a honeymooner who can't sleep, a man who checks in under three names), and one of them is not what they seem. What you notice, what you keep and who you help decides how the morning goes. About 10 to 15 minutes to read, with at least four endings and choices that matter later.

Write it properly in ink (one `.ink` file, at least 1,500 words of story), and use the language's features on purpose:
- Knots and stitches for the hotel's floors and rooms, diverts and tunnels for the bell board, threads for the pocket notebook you can check from anywhere.
- Variables and conditionals (tips earned, the guests' trust, the clock), visit counts (the second time you knock on a door reads differently), and a LIST for your pockets (inventory).
- Tags for the interface: the time on the clock, which bell lights up, sound cues and scene changes.
- `SEED_RANDOM` from the seed, so a seeded reading is repeatable.

The interface: the story is written into the porter's night ledger, one entry per hour, with the bell board, the clock, the notebook and the pocket contents around it. Choices are clear buttons with number keys 1 to 9. Save and continue (the story state's JSON in localStorage), and restart.

The script view (a button or key S): the ink source next to the story, editable, with line numbers and light syntax colouring. "Rebind the book" recompiles it with the inkjs compiler and restarts; compiler errors and warnings show at their lines in a designed panel. A "Back to the original" button restores the shipped story.

Look: midnight blue, pier lamps, a warm ledger paper, a brass bell board. A literary serif for the story, a handwriting-like face for the porter's notes (readable, not a novelty font), and a mono for the script view.
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
| Choose | 1–9 or click | tap the choice |
| Hurry the ink | Space or Enter | tap the page |
| Pocket notebook | N | notebook button |
| Script view (edit and rebind) | S; Ctrl+Enter rebinds | script button |
| Close the ledger (pause) | Esc or P | ledger button |
| Sound | M | speaker button |

## Built with

- inkjs 2.4.0: https://cdn.jsdelivr.net/npm/inkjs@2.4.0/dist/ink-full.js

Fonts: Alegreya, Alegreya SC, Kalam, Courier Prime (Google Fonts)

## Notes from the build

- Gather and choice labels are scoped to the whole knot, not the stitch, and they share a namespace with VARs and LIST items: two '- (q)' labels in different stitches of one knot, or a stitch called 'seed' next to VAR seed, will not compile.
- A divert from inside a knot back to that same knot does not count a new visit; only entering it from outside does. Give doors you knock on twice their own knots (here, tunnels) if the second visit should read differently.
- A tag after a choice's closing bracket belongs to the output line, not the choice. Write [Consult the notebook #notebook] to get it in choice.tags. A bare '|' is not allowed inside a tag either.
- Declared EXTERNAL functions throw on the first Continue() unless they are bound or story.allowExternalFunctionFallbacks is true, which matters for throwaway Story copies (this page runs one to read the seed's forecast for the title).
- Variable observers fire during Continue(), before the page shows that line. If text is revealed over time, queue the observed changes with the line so the clock and pockets move when the reader reaches it.

Departures from the brief: The house rules are written for action games, so a round here is one reading from midnight to six (about 12 minutes, 2,400–3,400 words) and the 'best score' is the best tips plus a collection of the eight endings. The corridor clock follows an observed clock variable (minutes after midnight) rather than a clock tag, so delays during the night move the hands; # entry tags put each hour in the ledger, and the page also honours a # clock tag in rewrites. The page fetches story.ink when served over http(s) and uses the identical embedded copy when opened from disk.

## Caveats

- A few API differences from the C# runtime and compiler, listed in the README.
- Write the story in Inky (inkle's free editor) for a real project; this page compiles ink in the browser.

## Source facts

- Licence: MIT · 658 stars on 2026-10-16
- Browser support: any modern browser
- Checked: Node: compiled story.ink with inkjs 2.4.0 (no errors or warnings) and read 3,000 random nights with random seeds, opening the notebook at random: all eight endings reached, no runtime errors, every knot and stitch visited (with the pickpocket branch checked by a scripted path), the notebook never changes the choices it returns to, and 366 unique output lines pass a typography lint. Browser (scripts/inspect.mjs): read to all eight endings with real input at seed 7: Caught, Early Boat, Gone with the Tide and The Porter's Key with number keys at 1440×900, Trust the Porter with mouse clicks, and A Word at the Door, Not What They Seem and The Wrong Man with taps at 390×844, each ending in the morning report with tips and pearls matching the Node runs. Same seed and choices gave an identical ink state hash twice; another seed gave different weather. Script view: typed a fault with real keys, rebound, saw it marked at line 219, removed it with Backspace, rebound the original, typed a rewrite that appeared in the restarted ledger, then 'Back to the original' cleared it. Also checked the notebook, pause (Esc/P), how-to card, save and continue across a reload (same state hash), the phone notebook/pockets drawer, reduced motion, attract mode inside an iframe, opening from file://, the designed fallback when inkjs can't load, and 1024×768, 1920×1080 and 820×1180 layouts: zero console errors, zero failed requests, no sideways overflow.

