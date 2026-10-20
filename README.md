# The Cartridge Shelf

**Ten game-dev tools, each made into a game you can play.**
Play: **https://lelelilo-studios.github.io/gamedev-showcase/**

Ten game-development libraries and agent skill packs, picked from a personal research wiki of saved tools: physics, destruction, fire, navigation, procedural maps, level geometry, level of detail, narrative scripting, and two skill packs that make a coding agent work like a game team. Each one became an original browser game built with the tool by Claude Code, and each comes with the exact prompt that made it and the steps to make it again. Open the shelf, pick a cartridge, press **Manual**.

| Cart | Game | Tool | Kind | Recreate |
|---|---|---|---|---|
| 01 | [Hold the Cold](https://lelelilo-studios.github.io/gamedev-showcase/showcases/01-claude-code-game-studios/) | Claude Code Game Studios · [Donchitos/Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) | skill pack | [how to recreate](showcases/01-claude-code-game-studios/TUTORIAL.md) |
| 02 | [Hedge Witch](https://lelelilo-studios.github.io/gamedev-showcase/showcases/02-mengto-game-skills/) | MengTo game-development skills · [MengTo/Skills](https://github.com/MengTo/Skills) | skill pack | [how to recreate](showcases/02-mengto-game-skills/TUTORIAL.md) |
| 03 | [Harbour Crane](https://lelelilo-studios.github.io/gamedev-showcase/showcases/03-joltphysics/) | JoltPhysics · [jrouwe/JoltPhysics](https://github.com/jrouwe/JoltPhysics) | library | [how to recreate](showcases/03-joltphysics/TUTORIAL.md) |
| 04 | [Seconds Day](https://lelelilo-studios.github.io/gamedev-showcase/showcases/04-three-pinata/) | three-piñata · [dgreenheck/three-pinata](https://github.com/dgreenheck/three-pinata) | library | [how to recreate](showcases/04-three-pinata/TUTORIAL.md) |
| 05 | [Bucket Brigade](https://lelelilo-studios.github.io/gamedev-showcase/showcases/05-fire-pro/) | Fire Pro · [dgreenheck/threejs-fire-pro](https://github.com/dgreenheck/threejs-fire-pro) | library | [how to recreate](showcases/05-fire-pro/TUTORIAL.md) |
| 06 | [Sheepdog Trials](https://lelelilo-studios.github.io/gamedev-showcase/showcases/06-recastnavigation/) | recastnavigation · [recastnavigation/recastnavigation](https://github.com/recastnavigation/recastnavigation) | library | [how to recreate](showcases/06-recastnavigation/TUTORIAL.md) |
| 07 | [Patchwork Isles](https://lelelilo-studios.github.io/gamedev-showcase/showcases/07-wavefunctioncollapse/) | wavefunctioncollapse · [kchapelier/wavefunctioncollapse](https://github.com/kchapelier/wavefunctioncollapse) | library | [how to recreate](showcases/07-wavefunctioncollapse/TUTORIAL.md) |
| 08 | [Brushwork](https://lelelilo-studios.github.io/gamedev-showcase/showcases/08-manifold/) | manifold · [elalish/manifold](https://github.com/elalish/manifold) | library | [how to recreate](showcases/08-manifold/TUTORIAL.md) |
| 09 | [Draw Distance](https://lelelilo-studios.github.io/gamedev-showcase/showcases/09-meshoptimizer/) | meshoptimizer · [zeux/meshoptimizer](https://github.com/zeux/meshoptimizer) | library | [how to recreate](showcases/09-meshoptimizer/TUTORIAL.md) |
| 10 | [The Ninth-Floor Night Porter](https://lelelilo-studios.github.io/gamedev-showcase/showcases/10-inkjs/) | inkjs · [y-lohse/inkjs](https://github.com/y-lohse/inkjs) | library | [how to recreate](showcases/10-inkjs/TUTORIAL.md) |

The sister collection, [Front-End Cabinet](https://lelelilo-studios.github.io/frontend-showcase/), does the same for twenty front-end tools.

## How it was made

One Claude Code session (Claude Opus 5.5) chose the tools, wrote a brief for each game and ran ten builder agents in parallel, one game each. Every builder got the game's brief (`showcases/<slug>/PROMPT.md`), the shared [house rules](shared/HOUSE_RULES.md) and the repo's [operating instructions](docs/BUILD.md). For the two skill packs, the skills' own text was downloaded at a fixed commit, reviewed and followed; nothing from those repos was installed or run. Every game was played in headless Chrome at 1440×900 and 390×844 with [`scripts/inspect.mjs`](scripts/inspect.mjs), whose `--steps` option drives a round with real key presses, clicks, taps and drags, and every game exposes `window.__game` hooks so a seed and its inputs can be replayed.

## Run it locally

No build step. Serve the folder and open it:

```
python3 -m http.server 8000
# then open http://localhost:8000/
```

Most games also open straight from disk. Fire Pro's game (05) needs a browser with WebGPU. `node scripts/inspect.mjs showcases/03-joltphysics/` screenshots a game and lists console errors (needs Node 22+ and Google Chrome).

## Layout

```
index.html, assets/        the shelf and the instruction booklets
data/tools.json            tool facts from the wiki (stars and licences as of 2026-10-16)
data/showcases.js          generated: everything the index shows
showcases/NN-slug/         one game per folder: index.html, PROMPT.md, TUTORIAL.md, meta.json
shared/                    house rules and the corner label every game loads
scripts/                   build_data.py (regenerates data, tutorials, README, credits), inspect.mjs, thumbs.sh
thumbs/                    poster images
```

After editing a brief, `meta.json` or `data/tools.json`, run `python3 -I scripts/build_data.py`.

## Fine print

An independent, unofficial showcase: not affiliated with or endorsed by the makers of any tool here. Every place, character and company in the games is fictional. This repo's code is MIT licensed ([LICENSE](LICENSE)); the tools and libraries keep their own licences ([CREDITS.md](CREDITS.md)).
