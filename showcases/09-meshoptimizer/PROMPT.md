Use meshoptimizer@1.3.0 (zeux's JavaScript build: MeshoptSimplifier, MeshoptEncoder, MeshoptClusterizer where useful) with three@0.186.1 to build "Draw Distance", a small, finished gliding game about level of detail.

The game: you fly a wooden glider over the fictional Thousand Pines valley at golden hour, from the ridge to a meadow at the far end. Ride thermals (marked by birds circling and drifting seeds) to gain height, pass through the ranger's checkpoint hoops, and land softly on the meadow before the sun sets. Controls: mouse or arrows to bank and pitch, Shift to dive; on phones, tilt-free thumb controls. Score by checkpoints, time and landing.

The forest is the point: tens of thousands of procedurally modelled trees and rocks, each with a level-of-detail chain built in the browser at load by meshoptimizer.
- At load, model a few detailed tree and rock meshes procedurally, then simplify each into 3 or 4 LODs with `MeshoptSimplifier.simplify` (and `simplifySloppy` for the far one), with a loading screen that shows each LOD being made (triangle counts and error).
- Pick LODs per instance by distance and screen size with instanced meshes; fade between levels so they don't pop.
- A HUD readout like an instrument panel: triangles drawn this frame versus without LOD, the share saved, and draw calls.
- Key L tints every tree by its LOD level (a false-colour view). Key F freezes the LOD choice so you can fly back and see what's far.
- A "Workshop" screen (from the title or pause menu): one tree on a turntable with a slider for the target error and triangle count, the simplified wireframe over the original, and its size before and after `MeshoptEncoder` compression.
- Optimise the index order (vertex cache) and show it in the workshop.

Look: warm late-afternoon light, long shadows, haze that deepens with distance, a pale wooden glider. A refined serif for the title and a narrow instrument face for the HUD.
