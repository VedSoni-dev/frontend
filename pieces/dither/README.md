# backdrop (`/dither`)

Drop in any picture and get it back as a dark ordered dither: mostly black, two greys, an off-white and one accent
colour (ember orange by default). Tune dot size, contrast, darkness and mix with the original; pick Bayer 8×8, Bayer 4×4
or noise; download a PNG sized for your screen (or 1080p, 1440p, 4K, a phone lock screen, the original). Everything runs
in your browser: the picture is never uploaded.

Live at https://frontend.vedantsoni.com/dither (free with a publik account).

- The look is from [TheCoderBTW's "New look!" post](https://x.com/TheCoderBtw/status/2121061189962866865), rebuilt clean-room
  so it works on any picture, outside any one app. No code, images, names or logos from that post's app are used.
- Technique: ordered dithering (Bayer, 1973). `engine.js` is pure and deterministic, tested by `test-engine.mjs`
  (`npm test`). The sample pictures are painted in code (`samples.js`).
- Prior art if you want more methods: [Image-to-Pixel](https://github.com/Tezumie/Image-to-Pixel) (MIT) and React Bits'
  Texture Lab. No code from either is used here.

MIT.
