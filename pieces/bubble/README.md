# suds (`/bubble`)

A site footer whose giant wordmark sits under a glass bubble. A small droplet rides on the cursor; the bubble follows on
a spring, lags behind, swells as it reaches the word, and magnifies and bends the letters under it with rainbow fringes,
a dark interior, a thin-film rim and a highlight. Move fast and it pinches off a second body and a satellite that merge
back. Outlined ghost copies of the word sit above and below; link columns sit underneath.

Live at https://frontend.vedantsoni.com/bubble (free with a publik account). Type your own word and links, tune the
bubble size, refraction, wobble, rim hue and dark/light, then take it home:

- **React:** Copy component gives `Suds.tsx` (one file, no dependencies beyond React) with your settings:
  `<Suds word="Brightwater" theme="dark" size={1} refraction={0.7} wobble={0.5} hue={0.1} columns={COLUMNS} />`.
  Served as-is at https://frontend.vedantsoni.com/bubble/Suds.tsx.
- **Any site:** `<script src="https://frontend.vedantsoni.com/bubble/suds.js" defer></script>` and
  `<suds-footer word="..." theme="dark">` with the columns as JSON in a child `<script type="application/json">`.
  The script is public, CORS-open, and makes no network requests.

How it works: the band (ghosts + word) is drawn into a 2D canvas once (again on resize, word or theme change) and
uploaded as a texture; a raw WebGL1 fragment shader adds up four metaballs (droplet, bubble, tail, satellite), takes the
normal from the field gradient, magnifies toward the centre and pushes out along the normal, samples R/G/B apart for the
fringes, and adds a cosine-palette rim and specular. Only the band is a canvas (DPR capped at 2). The real text stays in
the DOM for screen readers and no-JS. Without WebGL it shows a CSS bubble; with reduced motion a still bubble parks on one
letter; touch follows the finger; the loop sleeps when settled, off-screen or in a hidden tab, and a lost context falls
back to the plain footer.

- After [Alex Marin's "I'm doing something" footer video](https://x.com/alexmarin/status/2121270486214521306), rebuilt
  clean-room. Not affiliated with him or his product: the word, link labels, colours and code are our own.
- Prior art read for ideas only (no code used): rdev/liquid-glass-react (SVG displacement, Chromium-only refraction),
  liquidGL. No base, so no third-party licence to carry.
- `Suds.tsx`: the engine and the React component (everything above its React marker also becomes `suds.js` through
  `scripts/copy-sources.mjs`). `Studio.tsx`: the page and its controls. `test-engine.mjs`: checks on the built script.

MIT.
