# tincture (`/effects`)

Drop in your own photo and it melts into one of four ready-made layouts: a split card over a blurred cloud, a poster
with a grain-gradient panel and a glyph trail, a grain mesh gradient with a row of seven image chips, and a ticket.
Pick a treatment (Liquid, Marble, Torn print, Glow, Grain gradient, Posterize), move five dials (warp, scale, grain,
edge, tint), click any words to rewrite them, then download a PNG or copy a one-file React component. Everything runs
in your browser: the photo is never uploaded.

Live at https://frontend.vedantsoni.com/effects (free with a publik account).

- The look is after [Yax_buzz's UI element designs](https://x.com/Yaxbuzz/status/2121270887714611691), rebuilt
  clean-room so it works on your own images. No images, icons, copy or brand from that post are used: the glyphs,
  the sample picture (painted in code) and the words are our own.
- `Tincture.tsx` is the whole effect: one WebGL fragment shader (fbm domain warp, posterize, tint, glow, film grain and
  a noise-torn paper edge), a renderer that survives context loss, and a `<Tincture>` component. It is also served
  as-is at https://frontend.vedantsoni.com/effects/Tincture.tsx to paste into your app.
- `Studio.tsx` is the tool: layouts, input, the shared render loop and the PNG export (each layout element is drawn
  from the same shader into one canvas). `looks.js` is the serializable state, tested by `test-looks.mjs` (`npm test`).
- Prior art: [Paper Shaders](https://github.com/paper-design/shaders) (Apache-2.0) for grain and mesh gradients and
  liquid image filters. No code from it is used here.

MIT.
