# loam (`/meadow`)

A living flower meadow in a wooden planter, seen from straight above, for your site or your desk. Thousands of grass
blades in tufts, clover leaves, poppies, daisies, cornflowers, buttercups and clover heads sway in layered noise wind.
Move your mouse (or drag a finger) through it and the grass bends away in a ring with a wake behind you; a fast swipe
tears petals off and blows the bees away. Hold the mouse, long-press, or press `L` for a round glass lens at 2x with a
bright rim and a little colour fringe. One sun lights the frame, the blades and the flowers and casts every shadow
(planter, heads, bees, petals) the same way, which is what makes it read as depth. Bees and butterflies wander between
flowers; petals drift off in the wind and land on the frame and the ground.

Live at https://frontend.vedantsoni.com/meadow (free with a publik account). Make it yours (which flowers grow, how full,
wind, where the sun is, long / square planter or round pot, tiles / lawn / desk / plain ground, bugs on or off, shuffle
the seed, grow it again from bare soil), then take it home:

- **Any site:** Copy HTML gives `<loam-meadow ...>` plus the engine as one inline module with your settings baked in.
  Or link the public file: `<script type="module" src="https://frontend.vedantsoni.com/meadow/loam.js"></script>` and
  `<loam-meadow planter="long" mix="poppy,daisy,cornflower" style="display:block;height:70vh"></loam-meadow>`.
- **React:** Copy Meadow.tsx (one file, the same engine inlined): `<Meadow style={{ height: "70vh" }} planter="round" />`.
- **A picture:** Download PNG saves the current moment. **A desk plant:** full screen with no buttons (Esc leaves).

How it works: one WebGL2 canvas, no textures. A full-screen fragment shader draws the ground, the planter (wood grain
rails, end-grain corner posts, bevel light, a terracotta pot for round) and the soil, with the frame's drop shadow and
its shadow into the soil from the sun direction. Grass is one instanced draw of tapered, curved 4-segment blades; the
leaves, flower heads and bugs are instanced quads whose shapes are drawn in the fragment shader (petal counts, petal
outlines, creases, centres). Wind and the pointer's push are computed per instance in the vertex shader from up to
eight pointer samples (the live one plus a decaying trail). Each layer is drawn twice, first as a sun-offset shadow.
The lens renders the scene again at 2x into a framebuffer (scissored to the lens) and composites it with barrel bend,
chromatic offset and a rim. Placement is seeded (mulberry32), so a seed is a meadow. Device pixels are capped at 2x;
it measures its first frames and steps blade count and render scale down on slow devices; it pauses off-screen and in
hidden tabs, sways gently and drops the flying petals under reduced motion, rebuilds after a lost WebGL context, and
shows a still with a note where WebGL 2 is missing (`renderer="static"` forces that).

- After [Rishi's living flower meadow](https://x.com/that_rishi07/status/2121338147187425617), rebuilt clean-room from
  the public video and screenshots only. Not affiliated with them: the code, shaders, planter, flower drawings, palette,
  layout and copy are our own; nothing of the original page's code or renders is used.
- No open-source base: the candidates looked at were GPL (a different scene), too heavy (WebGPU + three.js) or had no
  licence, so no third-party code and no licence to carry.
- `loam.js`: the engine (ES module, also defines `<loam-meadow>`; copied to `public/meadow/loam.js` by
  `scripts/copy-sources.mjs`). `Playground.tsx`: the page and panel. `exportCode.ts`: the copy-out files. `store.ts`:
  settings in localStorage and the URL hash. `test-engine.mjs`: config, seeded layout, planter and export checks.

MIT.
