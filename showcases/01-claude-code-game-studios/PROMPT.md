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
