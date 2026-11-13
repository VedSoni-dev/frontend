# fork this frontend: notes for coding agents

- Next.js 16 (App Router) + TypeScript. `npm run dev`, `npm run build`, `npm run typecheck`, `npm test` (engine tests).
- **One root layout per piece** (route groups): `app/(index)/` is the public index at `/`; `app/(<path>)/` holds a piece's
  layout (its fonts and CSS) and `app/(<path>)/<path>/page.tsx`. Crossing pieces is a full page load, so one piece's global
  CSS never meets another's. There is no top-level `app/layout.tsx`; unmatched URLs get `app/global-not-found.tsx`.
- **The list of pieces is `pieces/index.ts`.** The index, the gates, the metadata (`lib/meta.ts`) and the sitemap read it.
  A new front-end piece = its code in `pieces/<path>/`, its static files in `public/<path>/` (preview.mp4, poster.jpg,
  cover.png, icon.svg, any embeddable file), a route group `app/(<path>)/`, an AI route at `app/api/<path>/<name>` if it
  needs one, and one entry in `pieces/index.ts`. Keep the piece's own code as it is; rewrite only imports and URLs.
- **Every piece is behind `<Gate piece="<path>">`** (`components/Gate.tsx`): Sign in with publik through the kit's publik
  module (`/api/gate` = the kit's `gateStatus`, never "pending"; provision and choice through `/api/studio/publik/*`).
  Once in, the tool renders inside the kit's `<StudioProvider>`, which sends the usage pings. A piece with AI keeps the
  plan step; one without (`usesAi: false`) opens once signed in.
- **AI goes through the kit only:** `answerJSON()` in `lib/gate.ts` (gate check, mode check, `generateText` from
  `@/kit/ai`). Client side: `useAIRoute()` from `lib/ai-client.ts` and `<ModeButton />` from `@/kit/react/ModePanel`.
  Never a model SDK or a key in app code.
- A piece's CSS entry (`pieces/<path>/styles.css`) imports `kit/ui/kit.css` in a cascade layer so the piece's own `:root`
  tokens win, then maps the few tokens the kit's picker reads (`--fg`, ...). Each piece sets `--publik-*` for the gate.
- Embeddable files (`public/flowers/seedbed.js`, `public/slider/detent.js`, `public/footer/GrainFooter.tsx`) come from
  `scripts/copy-sources.mjs`; they are public (CORS open) and never gated. Snippets point at `https://frontend.vedantsoni.com/<path>/…`.
- `kit/` is shared across all builds and synced from the studio (`~/Projects/vedanttalksai`, `npm run kit:sync`). Don't
  edit it here.
- Never read `.env*` files, print keys or tokens, or commit them.
