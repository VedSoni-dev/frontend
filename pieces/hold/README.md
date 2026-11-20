# baize (/hold)

after ozzy's "hold to confirm, but pool" — https://x.com/ozzyxs1a/status/2123441401904144799

A hold-to-confirm button that is a tiny pool table. Press and hold: the cue comes in and draws back while the words
fill white. Hold long enough and it breaks: the cue ball rolls into the object ball, the object ball drops into the
pocket, and the button says it's done, with a check in the pocket. Let go early and it plays a soft shot that rolls
back, so nothing happens by accident. A moment later the balls are racked again.

Live at https://frontend.vedantsoni.com/hold (free, Sign in with publik). A clean-room rebuild of ozzy's idea in our own
CSS: no image, code or asset from the original is used.

## Use it
- **Any site:** one script tag, then a tag per button:
  ```html
  <script type="module" src="https://frontend.vedantsoni.com/hold/baize.js"></script>
  <baize-hold label="Hold to delete" done="Deleted" felt="red" ball="1"></baize-hold>
  ```
  It fires `confirm` (detail `{ label, done }`) when the ball drops and `cancel` when someone lets go early.
- **Attributes:** `label`, `done`, `felt` (`green`, `blue`, `red`, `purple`, `teal`, `slate` or a `#hex`), `ball`
  (1–15: solids, then stripes), `hold` (ms, default 1000), `size` (height in px, default 88; width is 4.6× that),
  `reset` (ms before it racks again, default 1800, `0` stays done; call `el.reset()`), `sound`, `disabled`.
  The words use `--baize-font` if you set it (any rounded bold face looks right).
- **React:** the page's "Copy React" gives `HoldButton.tsx`, a small wrapper with an `onConfirm` prop.
- **From JS:** `import { mount } from "./baize.js"; const b = mount(div, { label, onConfirm })` → `b.set()`, `b.reset()`, `b.destroy()`.

## How it works
- A real `<button>` in a shadow root, drawn in CSS: a maple rail (an `feTurbulence` grain over a gradient) with ten
  diamonds, a felt bed with a cushion band and a speck texture, a pocket, two balls with a gloss layer, and a cue made
  of gradients with a soft shadow.
- One `requestAnimationFrame` loop runs only while something moves. The break is a pure function of time
  (`breakAt(t)`), tested without a browser: the cue thrusts, the cue ball arrives still rolling, the object ball rolls on
  into the pocket, shrinks and darkens as it drops, then the words cross-fade and the check draws.
- The balls roll: their marks slide across the face and foreshorten (`sin`/`cos` of the distance over the radius), and
  the cue ball rolls a whole number of turns so its red dot ends face up.
- Mouse, touch (pointer capture, no long-press menu), Space and Enter. Screen readers hear "Hold to confirm (press and
  hold)" and the done word. With `prefers-reduced-motion` the balls stay put and only the words and the check change.
- Sound is off unless asked for; the cue tip, the clack and the drop are synthesized with Web Audio.

Files: `baize.js` (the engine and `<baize-hold>`), `Studio.tsx` (the page), `exportCode.ts` (copy as HTML, React or
the file), `styles.css`, `test-engine.mjs`. MIT, no third-party code.
