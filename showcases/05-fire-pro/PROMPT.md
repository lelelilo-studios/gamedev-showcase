Use Fire Pro (threejs-fire-pro@0.1.0) with three@0.185.1 (its exact peer version; WebGPURenderer) to build "Bucket Brigade", a small, finished firefighting game. It needs WebGPU; in any other browser show a designed fallback page that explains why and shows a still of the game.

The game: a dry, windy night in a fictional hill village of toy-like houses. Fires break out on roofs and spread to neighbours downwind. You work the brigade's hand pump and hose from the square: aim with the mouse or a thumb drag, hold to spray, and keep pumping (alternate keys or tap rhythm) to keep up the pressure. Water knocks a fire down and soaks the roof so it resists catching again; a fire left alone grows, then spreads. The wind shifts during the night and is shown by a weathervane. The night lasts about 4 minutes; score by houses saved, with the bell tower as the last stand.

Make Fire Pro carry the game:
- Each burning roof is a Fire Pro emitter whose strength follows the game's fire state; spreading starts new emitters downwind.
- The wind is a Fire Pro force, so flames lean and smoke drifts the way the weathervane points.
- Water hitting a fire reduces its emitter and adds a short burst of steam or smoke; a fire put out leaves a smouldering wisp for a while.
- Houses are colliders, so smoke rolls over roofs instead of through them.
- Flames light the village through the library's point lights (`ClusteredLighting`).
Keep it inside a laptop GPU budget: a capped number of live fires, `halfResolution`, coarser voxels on weaker GPUs, and a quality setting.

Headless screenshots: WebGPU canvases capture blank in headless Chrome, so add a `?mirror` query option that copies each rendered frame into a 2D canvas for screenshots (only when the option is on), and check with the `--webgpu` flag of the inspect script.

Look: a deep blue night, warm window lights, painted wooden houses like a model railway village, brass and red for the pump and the HUD. A condensed, slightly vintage display face for the title and gauges, and a plain face for text.
