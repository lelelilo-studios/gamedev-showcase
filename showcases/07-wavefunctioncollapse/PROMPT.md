Use wavefunctioncollapse@2.1.0 (kchapelier's JavaScript port of WaveFunctionCollapse, loaded through esm.sh as it is CommonJS) to build "Patchwork Isles", a small, finished map-making and sailing game on Canvas 2D.

The game has two halves:
1. **Stitch the sample.** Paint a tiny sample map (about 12 by 12 cells) with a palette of deep sea, shallows, sand, meadow, forest, rock and harbour. Or start from one of four ready samples, each with its own character (scattered atolls, a fjord coast, one big island, a river delta). Then grow a full sea chart (about 72 by 48 cells) from it with the OverlappingModel. Show the collapse as it happens, cell by cell, like stitches being sewn, with a counter for contradictions and retries. Options: pattern size (2 or 3), symmetry, periodic edges.
2. **Sail it.** A small boat sails the chart you made. Visit every harbour before the season ends (a day-night clock and dwindling stores), with fog of war that lifts as you sail, winds that help or hinder, and shoals that ground you. Harbours restock you and reveal more of the map. Score by harbours visited, days to spare and how much of the chart you revealed.

A second generation mode uses the SimpleTiledModel with a small hand-drawn coastline tile set (corner and edge pieces with adjacency rules) to make an "Admiralty" style chart, so both models are shown, and the player can switch between them.

Details that make it: seeds for everything (the sample, the generation and the voyage) shown and shareable through the URL; a "sew again" button that keeps the sample and changes the seed; a chart that is always winnable (if a generated chart has unreachable harbours, retry and say so); export the chart as a PNG.

Look: the chart is a quilt: every terrain is a fabric (stitched outlines, cross-hatch shallows, knotted forests), drawn procedurally on the canvas; the sailing view keeps that look with a little cloth boat. A warm, bookish serif and a typewriter or sampler-stitch face for labels.
