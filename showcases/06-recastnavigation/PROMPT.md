Use Recast Navigation through its WebAssembly port (recast-navigation@0.43.1 and @recast-navigation/three@0.43.1 from jsDelivr) with three@0.186.1 to build "Sheepdog Trials", a small, finished herding game.

The game: you are a young sheepdog at the fictional Coldharbour Fell trials. Twelve to twenty sheep graze on a hillside field with stone walls, gorse, a stream with one bridge, a pair of drive gates and a pen. Run the course against the clock: fetch the flock down the hill, drive them through the gates, then pen them and the shepherd closes the gate. You control the dog directly (WASD/arrows, or a thumb stick on phones); Space barks (scatters sheep near you), Shift creeps (slow, the sheep stay calm). Sheep that are pushed too hard bolt; a sheep that escapes the field costs points. Three courses of rising difficulty; score by time, gates cleared and how calm the flock stayed, judged like a real trial with points deducted.

Make Recast and Detour carry the game:
- Build the navmesh from the field's geometry at load (walls, gorse, the stream as unwalkable, the bridge as the only crossing), as a tile cache so it can change.
- Every sheep is a DetourCrowd agent. Each step, choose its target from flocking and fear of the dog (flee away from the dog along the navmesh, stay near neighbours, graze when calm), and let the crowd do the steering and separation.
- Hurdles and hurdle gates: in the third course, the shepherd drops hurdles at set times, added as tile-cache obstacles that cut the navmesh live; the flock reroutes around them.
- A debug overlay (key N) draws the navmesh, the tiles being rebuilt, each sheep's path and corner points, and the dog's "pressure" circle.
- Seeded RNG for the flock's starting positions and personalities (one sheep is always a bolter).

Look: a green northern fell under a big sky, dry-stone walls, wool that reads as soft (felted, chunky shapes, procedural only), a black-and-white dog with a wagging tail. A characterful serif for titles and the judge's scorecard, written like a show programme.
