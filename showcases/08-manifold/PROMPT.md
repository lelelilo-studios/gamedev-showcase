Use manifold (manifold-3d@3.5.4, its WebAssembly build) with three@0.186.1 to build "Brushwork", a small, finished build-then-walk puzzle game about greyboxing a level.

The game: each puzzle is a level designer's problem. A first-person player must get from the start pad to the bell in the tower and ring it. You build the route with a limited set of brushes, then press P to walk it yourself. Brushes are solids you place on a grid and set to **add** or **subtract**: boxes, ramps (wedges), cylinders, arches, stairs. Subtracting carves doorways, tunnels and windows through what's there; adding builds bridges and steps. Every edit re-runs the boolean in manifold and updates the level mesh live. Six puzzles of rising difficulty (a wall in the way, a gap to bridge, a locked tower you have to carve into, a moat, a low ceiling, the last one asks for both). Score by brushes left unused and time to the bell.

Make manifold carry the game:
- Keep the level as an ordered list of brushes and rebuild it with manifold's booleans (union and difference) on every change, with undo and redo.
- Show the result's stats as the designer's readout: triangles, vertices, genus (holes through the solid) and whether it's manifold (always yes, which is the point).
- Smooth, flat-shaded output with a "dev texture" grid that keeps its scale on every face (triplanar), and coloured overlays for the brush you're placing (green for add, red for subtract) as a ghost.
- Walk mode: first-person movement with gravity, steps and collision against the built mesh (raycasts or a simple capsule test are fine). Mouse look with pointer lock, and on phones a left stick and drag to look.
- Export the level as a GLB file.

Look: a calm editor: a dark slate viewport with a fine blueprint grid, white and two greys for the level, orange for the start pad and brass for the bell. A precise technical sans or mono for the toolbar and readouts, and a narrow display face for puzzle titles.
