# cirrus (`/sky`)

A live sky drawn in tiny characters for the top of your homepage. Each cell is a small tinted square with a dot in it,
lighter toward the bottom; clouds drift and re-form on seeded noise, white inside with edges written in type
(`. ' : ; ~ ( ) o 8`). Move your mouse (or drag a finger) through it and the wind writes a streak behind you, picked by
direction (`-` `/` `|` `\`), that fades in about a second and a half and breaks clouds into characters as it passes. A
ghost gust draws one by itself when nobody is moving, so phones see it too. The sky fades into your page.

Live at https://frontend.vedantsoni.com/sky (free with a publik account). Tune it (dawn, noon, dusk, night with stars;
cloud cover, wind, drift speed, cell size; type, dots or blocks; trail, gust, fade), then take it home:

- **Any site:** Copy HTML gives `<cirrus-sky ...>` plus the engine as one inline module with your settings baked in.
  Or link the public file: `<script type="module" src="https://frontend.vedantsoni.com/sky/cirrus.js"></script>` and
  `<cirrus-sky time="noon" cover="0.5" style="display:block;height:45vh"></cirrus-sky>`.
- **React:** Copy Sky.tsx (one file, the same engine inlined): `<Sky style={{ height: "45vh" }} time="night" />`.
- **A page:** Download .html opens straight from your disk. **A wallpaper:** PNG at your screen size or 3840×2160.

How it works: one canvas 2D, device pixels capped at 2x. The cloud field (2-octave value noise, advected by a time
accumulator) is recomputed at ~20 Hz; sky cells are batched into four fills by tint; glyphs are blitted from an atlas
drawn once per palette. The trail is two typed arrays (intensity, direction) with frame-rate-independent decay; pointer
samples are interpolated so fast strokes stay continuous and the direction is low-passed with hysteresis so it doesn't
flicker. It pauses off-screen and in hidden tabs, draws one still frame under reduced motion, steps the cell size up if
frames run over 12 ms, and leaves a CSS gradient if canvas is unavailable. The canvas is `aria-hidden`.

- After [unvalley's "blue sky study"](https://x.com/unvalley_/status/2121293930641997992), rebuilt clean-room from the
  public video only. Not affiliated with them: the palettes, glyph sets, placeholder card, copy and code are our own.
- Prior art looked at for ideas only (no code used): ASCIIGround (MIT), so no third-party licence to carry.
- `cirrus.js`: the engine (ES module, also defines `<cirrus-sky>`; copied to `public/sky/cirrus.js` by
  `scripts/copy-sources.mjs`). `Playground.tsx`: the page and panel. `exportCode.ts`: the copy-out files. `store.ts`:
  settings in localStorage and the URL hash. `test-engine.mjs`: noise, direction glyphs, decay, config and export checks.

MIT.
