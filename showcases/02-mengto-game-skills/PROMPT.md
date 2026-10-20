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
