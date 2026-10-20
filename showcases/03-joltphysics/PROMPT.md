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
