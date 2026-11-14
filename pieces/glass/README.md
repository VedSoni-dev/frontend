# vellum (/glass)

A frosted-glass footer that rises over your photo, with your word cut into it as clear glass. Scroll to the bottom: the
panel slides up, the rule draws across, the links fade in left to right, the word rises letter by letter and the mark
slides in. Inside each letter the photo is sharp; around it, it stays frosted.

Live at https://frontend.vedantsoni.com/glass (free, Sign in with publik). After Sonia Tkachuk's footer design (Axion,
https://x.com/sonia_axion/status/2121301089458987125): a clean-room rebuild in our own design, with a placeholder brand.
None of the original's photo, brand, mark or copy is used; the three photos here are generated in code.

## Use it
- **React:** copy `Glass.tsx` (https://frontend.vedantsoni.com/glass/Glass.tsx) into your app and render
  `<Glass word="Lumen" photo="/your-photo.jpg" />` at the bottom of your page. Props: `word`, `photo`, `links`,
  `accent`, `blur`, `soft`, `panel`, `headline`, `sub`, `cta`, `ctaHref`, `replay`.
- **Any site:** the page's "Copy HTML + CSS" gives one block (style, footer markup, a short script) with your settings.

## How it works
- The card shows your photo, softly blurred (`filter: blur`, set once, never animated).
- The footer panel is a frost over it: `backdrop-filter: blur() brightness() saturate()` with `-webkit-` prefixes and a
  hairline border.
- Each letter is a span whose background is the same photo, sharp and a little brighter, sized like `object-fit: cover`
  for the whole card and offset by the letter's resting position, then cut to the letter with `background-clip: text`.
  So the letters are clear windows through the frost. Positions are measured with `offsetLeft/Top` (which ignore
  transforms) and kept in sync with a ResizeObserver.
- The entrance is CSS transitions on `transform` and `opacity` only, armed by JS (`data-armed`) and played by an
  IntersectionObserver at 35% visible (`data-in`). No JS, or `prefers-reduced-motion`, shows the final state.
- Fallbacks: no `backdrop-filter` gives a solid translucent panel; no `background-clip: text` gives plain light letters.

Files: `Glass.tsx` (the component + `mountGlass()`, the plain-DOM engine the HTML version also runs), `Studio.tsx` (the
page), `exportCode.ts` (copy as React or HTML), `styles.css`. MIT, no third-party code.
