# shoal (`/sharks`)

A shoal of pixel-art sharks that turns out to be 3D. Ten of them (a whale shark with its white dots, hammerheads, a
banded zebra shark, a nurse shark, a goblin shark, grey reef sharks) circle in a loose ring while the camera drifts from
top-down to side-on and back. Drag to spin them, pinch or scroll to zoom, tap a shark for its name and a sparkle burst.
The Tune chip sets the pixel size (1 smooth to 8 chunky), the shark count, swim speed, auto-orbit and four palettes
(night water, deep blue, mono green, paper). Take it home as a PNG of the frame you see or as one React component.

Live at https://frontend.vedantsoni.com/sharks (free with a publik account).

- The look is after [stacked's "3D gaussian pixel sharks" post](https://x.com/stackedlol/status/2121327009725047087),
  rebuilt clean-room. No frames, sprites, models or colours from it are used: every shark is a procedural point cloud
  built in code from a fixed seed, and the palettes are our own.
- `Shoal.tsx` is the whole thing: raw WebGL2 with no dependencies beyond React. Points are drawn as square splats into a
  low-res target with a depth buffer, then blown up nearest-neighbour and posterised. The swim is a travelling wave in
  the vertex shader; each body follows its ring. It handles context loss, pauses when hidden or offscreen, honours
  reduced motion and steps quality down on slow devices. Served as-is at https://frontend.vedantsoni.com/sharks/Shoal.tsx.
- Use it as a background: `<div style={{ position: "fixed", inset: 0, zIndex: -1 }}><Shoal /></div>`, with props
  `pixelSize`, `count`, `speed`, `palette`, `autoOrbit`, `interactive`, `onPick`. Without React: `createShoal(canvas, opts)`.
- `Studio.tsx` is the page: the corner credit, the hint, the Tune chip, the PNG export and Copy component.
- No base: nothing open matched a pixel-splat 3D shark scene (splat renderers like Spark draw captured photoreal splats).
  No third-party code is copied in.

MIT.
