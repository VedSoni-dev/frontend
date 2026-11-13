# Third-party notices

This site is MIT licensed (see `LICENSE`). It hosts four pieces that were first published as their own MIT-licensed
repos by fork this (@forkthis_ai); their code is in `pieces/<path>/`, each under its original MIT licence:

| Path | Code | From | Licence |
|---|---|---|---|
| `/flowers` | `pieces/flowers/` | [github.com/VedSoni-dev/seedbed](https://github.com/VedSoni-dev/seedbed) | MIT, © 2026 seedbed contributors |
| `/slider` | `pieces/slider/` | [github.com/VedSoni-dev/detent](https://github.com/VedSoni-dev/detent) | MIT, © 2026 detent contributors |
| `/footer` | `pieces/footer/` | [github.com/VedSoni-dev/grainfoot](https://github.com/VedSoni-dev/grainfoot) | MIT, © 2026 grainfoot contributors |
| `/gait` | `pieces/gait/` | [github.com/VedSoni-dev/midstance](https://github.com/VedSoni-dev/midstance) | MIT, © 2026 Midstance contributors |

Each piece is a clean-room rebuild from public posts; no original code, logo or brand is used. Design credits:
Mohamed Siddique (flowers), Max Yan (slider), Faris (footer), Praveen Kumar (gait).

## From detent (`/slider`)

- **qrcode-generator** (npm, by Kazuhiko Arase, MIT): draws the QR code on `/slider`. Its licence ships in `node_modules/qrcode-generator/LICENSE`.

The haptic trigger in `pieces/slider/detent.js` is detent's own code, written from the publicly documented technique (`navigator.vibrate` on Android; a `<label>` for an iOS 17.4+ `<input type="checkbox" switch>` on iPhone). The technique is also used by the MIT-licensed [web-haptics](https://github.com/lochie/web-haptics) (Lochie Axon) and [ios-haptics](https://github.com/tijnjh/ios-haptics); no code from either is included.

## The index page

- **taste-skill** ([github.com/Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), MIT): the index at `/` is built with its kit, and the parts it uses ship in `public/assets` (system, cards, motion, layout and the pinned-chapters moment).

## Others

- **@fontsource-variable/inter** (OFL-1.1): the Inter face on `/footer`.
- Fonts loaded from Google Fonts (OFL-1.1): Epilogue, JetBrains Mono, Instrument Sans, DM Mono, Newsreader, Inter, Geist Mono.
- The studio kit in `kit/` (MIT, Vedant Soni): AI modes, Sign in with publik, the mode picker.
