# How to recreate cartridge 01: Hold the Cold

**Tool:** Claude Code Game Studios (skill pack) · [Donchitos/Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)
**Play it:** https://lelelilo-studios.github.io/gamedev-showcase/showcases/01-claude-code-game-studios/

Claude Code Game Studios' lightest mode (rigor minimal, solo review) took a one-line hint to a one-page brief, eight stories and a finished browser game, and every one of its documents is in the binder below the game, written in order while building. Its run-and-observe rule held throughout: no story closed until the game was launched, looked at and a screenshot kept, and its scripted playtest caught the one thing the stories' criteria could not: a night nobody could lose.

## Steps

1. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in.
2. Get the Claude Code Game Studios skills with the commands in **Install**, and read their `SKILL.md` files before you use them.
3. Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.
4. Make an empty folder, open a terminal in it and run `claude`.
5. Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.
6. Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.
7. Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.

## Install

Clone it as your new project:

```
git clone https://github.com/Donchitos/Claude-Code-Game-Studios.git my-game
cd my-game
claude
```

then, inside Claude Code:

```
/start
```

## Prompt

The exact brief the builder received:

````markdown
Use Claude Code Game Studios (Donchitos/Claude-Code-Game-Studios) in its lightest mode to make a small, finished browser game, and publish the studio's paperwork next to it. The page is the game plus a "studio binder" that shows how the studio made it.

Run the studio's `minimal` jam flow, playing both the studio and its one human (the person who answers its questions):
1. `/start`: the answers are "vague concept", engine **none: a plain web page with Canvas 2D** (the studio expects Godot, Unity or Unreal; record this choice and why), `modes.rigor: minimal`, `review_mode: solo`.
2. `/brainstorm night shift at a seed vault during a storm`: write the 2 or 3 one-line concepts it asks for, pick one as the human (say why), and fill the one-page brief from its `game-brief.md` template: working title, pitch, core loop, goal and fail state, an MVP of 7 items or fewer.
3. `/create-stories`: turn the MVP into stories with acceptance criteria, as the skill describes for `minimal`.
4. `/dev-story` ↔ `/story-done` for every story, in the brief's build order. Follow the studio's run-and-observe rule: a story that changes what the player sees is not done until the game was run, looked at and a screenshot kept as evidence.
5. `/playtest-report` after a real scripted playtest, `/gate-check` for release, and a short `/retrospective`.

Keep the documents the studio writes in `studio/` inside your folder (Markdown, following the skills' templates and file names as closely as a one-page web game allows), and the evidence screenshots as small WebP files in `studio/evidence/` (under 60 KB each). Don't fake any of it: every document must be one you actually wrote while building, in order.

The page: the game first, full width, playable at once. Below it (or behind a binder tab on phones) the binder, styled as a studio production folder: the three pitches with the chosen one marked, the brief, the story cards with their status and evidence thumbnails, the playtest report, the gate verdicts as stamps, and the retrospective. Render the Markdown into the page at build time (embed it; the page must also open from disk), with a link to each raw file.

The game itself: whatever the studio chose, but it must be a one-screen 2D canvas game with 3 to 5 minute runs, keyboard and touch controls, and the house rules' test hooks.

Look: the game gets its own art direction from the brief; the binder looks like real studio paperwork (manila, carbon copies, typed labels, rubber stamps) without being a pastiche. Different type for game and binder.
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
| Walk | A / D or ← / →, or click a spot | tap a spot |
| Climb | W / S or ↑ / ↓ (walks to the ladder) | tap the floor you want |
| Work (scrape, take a can, pour) | hold Space or E, or hold the click on a machine | hold WORK, or hold a machine |
| Crank a stalled generator | press Space when the needle is in the green, three times | tap WORK in the green |
| Pause | Esc or P | pause button |
| Sound | M | speaker button |

Fonts: Big Shoulders Stencil, Martian Mono, Courier Prime, Reenie Beanie (Google Fonts)

## Skill files the builder read

- [README.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/README.md)
- [CLAUDE.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/CLAUDE.md)
- [project.yaml](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/project.yaml)
- [.claude/skills/start/SKILL.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/start/SKILL.md)
- [.claude/skills/brainstorm/SKILL.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/brainstorm/SKILL.md)
- [.claude/skills/create-stories/SKILL.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/create-stories/SKILL.md)
- [.claude/skills/create-stories/CONTRACT.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/create-stories/CONTRACT.md)
- [.claude/skills/dev-story/SKILL.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/dev-story/SKILL.md)
- [.claude/skills/story-done/SKILL.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/story-done/SKILL.md)
- [.claude/skills/playtest-report/SKILL.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/playtest-report/SKILL.md)
- [.claude/skills/gate-check/SKILL.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/SKILL.md)
- [.claude/skills/gate-check/references/2b-workflow-tier.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/references/2b-workflow-tier.md)
- [.claude/skills/gate-check/references/3-run-gate-check.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/references/3-run-gate-check.md)
- [.claude/skills/gate-check/references/4-assessment.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/references/4-assessment.md)
- [.claude/skills/gate-check/references/5-verdict.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/references/5-verdict.md)
- [.claude/skills/gate-check/references/6-update-stage.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/references/6-update-stage.md)
- [.claude/skills/gate-check/references/7-next-steps.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/references/7-next-steps.md)
- [.claude/skills/gate-check/references/gate-release.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/references/gate-release.md)
- [.claude/skills/gate-check/references/gate-polish.md (tier reductions)](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/references/gate-polish.md (tier reductions))
- [.claude/skills/gate-check/references/gate-production.md (tier reductions)](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/references/gate-production.md (tier reductions))
- [.claude/skills/gate-check/references/gate-systems-design.md (tier reductions)](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/gate-check/references/gate-systems-design.md (tier reductions))
- [.claude/skills/retrospective/SKILL.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/retrospective/SKILL.md)
- [.claude/skills/setup-engine/SKILL.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/setup-engine/SKILL.md)
- [.claude/skills/smoke-check/SKILL.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/smoke-check/SKILL.md)
- [.claude/skills/smoke-check/references/1-detect-setup.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/smoke-check/references/1-detect-setup.md)
- [.claude/skills/smoke-check/references/4-manual-checks.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/smoke-check/references/4-manual-checks.md)
- [.claude/skills/smoke-check/references/5-report.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/smoke-check/references/5-report.md)
- [.claude/skills/bug-report/SKILL.md (verify and close modes)](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/skills/bug-report/SKILL.md (verify and close modes))
- [.claude/docs/config-resolution.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/config-resolution.md)
- [.claude/docs/run-and-observe.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/run-and-observe.md)
- [.claude/docs/coding-standards.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/coding-standards.md)
- [.claude/docs/automation-modes.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/automation-modes.md)
- [.claude/docs/workflow-modes.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/workflow-modes.md)
- [.claude/docs/workflow-catalog.yaml (paths.minimal)](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/workflow-catalog.yaml (paths.minimal))
- [.claude/docs/templates/game-brief.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/templates/game-brief.md)
- [.claude/docs/templates/story.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/templates/story.md)
- [.claude/docs/templates/test-evidence.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/templates/test-evidence.md)
- [.claude/docs/templates/prototype-report.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/templates/prototype-report.md)
- [.claude/docs/templates/session-state.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/templates/session-state.md)
- [.claude/docs/templates/bug-report.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/templates/bug-report.md)
- [.claude/docs/templates/help-where-you-are-minimal.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/docs/templates/help-where-you-are-minimal.md)
- [.claude/agents/creative-director.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/agents/creative-director.md)
- [.claude/agents/game-designer.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/agents/game-designer.md)
- [.claude/agents/prototyper.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/agents/prototyper.md)
- [.claude/agents/qa-lead.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/agents/qa-lead.md)
- [.claude/agents/producer.md](https://github.com/Donchitos/Claude-Code-Game-Studios/blob/05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418/.claude/agents/producer.md)

They were downloaded as plain text at commit `05ad7c8` and reviewed first; nothing from the skill repo was installed or run.

## Notes from the build

- Every skill's first line asks Claude Code to run a config helper; without it, read project.yaml by hand and fall back to config-resolution.md's table. Rigor minimal expands to solo review, so /start must not write review_mode, or it pins it.
- Stories that each pass their criteria can still add up to a game nobody can lose. Get a balance probe (here, the title screen's self-playing keeper run over 16 seeds) working as soon as the core loop exists, not after the last story.
- Run-and-observe needs a way to reach a state: a small debug hook (set frost, time, a stall) is the browser's equivalent of the skill's launch arguments. Keep the hit pause and other cosmetics out of step() so snapshots stay deterministic.
- Test tooling lies too. A guessed tap position and a balance bot that could never hit the crank both looked like game bugs; measure positions in the page, and check the probe before blaming the game.
- At minimal, /story-done writes only the story file, so EPIC.md's status table goes stale by design; the story files and session logs are the record.

Departures from the brief: No engine (the brief's choice): /setup-engine was not run, the engine and commands were added to project.yaml by hand, and every story's engine risk reads NOT ASSESSED. None of the pack's hooks or scripts were run (config helper, stamps, artifact checks); each was done by hand and the logs say so, the evidence stamps being plain sha256 lists. Evidence lives in studio/production/qa/evidence/ (the studio's own path, as the operating notes asked) rather than studio/evidence/. After the playtest the human named an eighth story (tuning), and two bugs were filed and fixed outside any story. The binder itself is page code, not a studio story. The code root is the showcase folder, not studio/src.

## Caveats

- Built for Godot, Unity and Unreal projects; this showcase uses its workflow with no engine (a plain web page), which is a departure.
- Its hooks need Bash, Python 3 and ideally jq; one hook checks GitHub for updates (it can be turned off in /settings).
- The heavier rigor levels write many documents before code; the README itself measures that the lightest level made the better game.

## Source facts

- Licence: MIT · 26,726 stars on 2026-10-16
- Browser support: any modern browser (Canvas 2D and WebAudio); opens from file:// too
- Checked: At 1440×900 and 390×844 (plus 1280×720, 1920×1080 and 2560×1080): zero console errors, zero failed requests, no sideways scroll. Full nights played end to end with real input: desktop by clicks and keys, phone by taps and long-presses on WORK, from the title through two fuel runs and three stalls to the end screen, Play again and pause. That was three desktop nights (3,000 → compromised → 2,733 across tuning and bug fixes) and one phone night (3,000 before tuning); after the final typography pass, one more full night per size on the shipped build: desktop dawn 2,704, phone dawn 2,944, both with zero errors. Every story was run, looked at and kept as WebP evidence (all under 60 KB). Determinism (same seed and inputs give the same snapshot), the keyboard-only menus, focus, M mute stored, reduce flashing on under prefers-reduced-motion, auto-pause on blur and hidden, no AudioContext before a gesture, the iframe preview (muted demo night, binder and label hidden) and opening from file:// were each checked by probe. Balance was run over 16 seeds at four keeper skills; render cost measured at 6.5 ms (1440) and 3.4 ms (390) in software rendering.

