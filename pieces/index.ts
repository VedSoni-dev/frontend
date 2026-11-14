// The list of pieces: the ONE data file the index (/), every piece's gate and metadata, and the sitemap read.
//
// Adding a front-end build later is a new path plus one entry here:
//   1. its code in pieces/<path>/ and its static files (preview.mp4, poster.jpg, cover.png, icon.svg, embeds) in public/<path>/;
//   2. a route group app/(<path>)/ with its own root layout (its CSS stays on its own pages) and app/(<path>)/<path>/page.tsx
//      that wraps the tool in <Gate piece="<path>">;
//   3. its AI route, if it has one, at app/api/<path>/<name> through answerJSON() (lib/gate.ts);
//   4. one entry below.
// Server and client both import this file: plain data only.

export interface Piece {
  /** The URL path and every folder name: /<path>, pieces/<path>, public/<path>, app/(<path>). */
  path: string;
  /** The tool's own name (its open-source repo's name). */
  name: string;
  /** What it is, in a few words: the page title and the gate. */
  what: string;
  /** What it does, as a verb and an object: the card title on the index. */
  title: string;
  /** One plain line: what a person does with it. */
  line: string;
  /** The original design it was rebuilt from, credited on the card, the gate and the README. */
  credit: { name: string; handle: string; url: string; work: string };
  /** The piece's own open-source repo (MIT). */
  repo: string;
  /** true: one of its features calls AI through the kit (publik plan or the person's own key). */
  usesAi: boolean;
  /** A file people embed in their own sites, served publicly (never behind the gate). */
  embed?: { label: string; href: string };
  /** The real product, from the clone's docs/media: a short loop (from its GIF), its poster frame, the share card. */
  media: { video: string; poster: string; cover: string };
  /** The browser bar colour on its page, light and dark. */
  theme: { light: string; dark: string };
}

export const SITE = "https://frontend.vedantsoni.com";
export const REPO = "https://github.com/VedSoni-dev/frontend";

const media = (path: string) => ({ video: `/${path}/preview.mp4`, poster: `/${path}/poster.jpg`, cover: `/${path}/cover.png` });

export const PIECES: Piece[] = [
  {
    path: "flowers",
    name: "seedbed",
    what: "Flower hover effect",
    title: "Grows flowers under the cursor",
    line: "Move across a grid of dots and flowers grow out of it, then wilt back. Five styles, copied into your site as one file.",
    credit: { name: "Mohamed Siddique", handle: "msiddique26", url: "https://x.com/msiddique26/status/2120936635856752710", work: "the “let's see what blooms” post" },
    repo: "https://github.com/VedSoni-dev/seedbed",
    usesAi: true,
    embed: { label: "seedbed.js", href: "/flowers/seedbed.js" },
    media: media("flowers"),
    theme: { light: "#f4f0e6", dark: "#121410" },
  },
  {
    path: "slider",
    name: "detent",
    what: "Haptic slider",
    title: "Clicks at every whole number",
    line: "A slider that clicks at every whole number on a phone. Tune its range, colour and cap, then paste it into your app.",
    credit: { name: "Max Yan", handle: "MlXZY88", url: "https://x.com/MlXZY88/status/2120973389498098103", work: "a haptic slider design" },
    repo: "https://github.com/VedSoni-dev/detent",
    usesAi: true,
    embed: { label: "detent.js", href: "/slider/detent.js" },
    media: media("slider"),
    theme: { light: "#ffffff", dark: "#141413" },
  },
  {
    path: "footer",
    name: "grainfoot",
    what: "Footer with a grain photo band",
    title: "Adds print grain to footer photos",
    line: "A drop-in site footer whose photo band gets a matte print grain. List your image paths, tune the grain, copy one file.",
    credit: { name: "Faris", handle: "Faris_rzk", url: "https://x.com/Faris_rzk", work: "a footer design" },
    repo: "https://github.com/VedSoni-dev/grainfoot",
    usesAi: true,
    embed: { label: "GrainFooter.tsx", href: "/footer/GrainFooter.tsx" },
    media: media("footer"),
    theme: { light: "#f4f2ee", dark: "#121211" },
  },
  {
    path: "gait",
    name: "Midstance",
    what: "Gait-lab dashboard",
    title: "Draws a running session live",
    line: "Type in a running session's numbers and get a live halftone load map, a motion-capture runner and a protocol.",
    credit: { name: "Praveen Kumar", handle: "praveenisomer", url: "https://x.com/praveenisomer", work: "a gait-lab dashboard reel" },
    repo: "https://github.com/VedSoni-dev/midstance",
    usesAi: false,
    media: media("gait"),
    theme: { light: "#eef0f0", dark: "#eef0f0" },
  },
  {
    path: "dither",
    name: "backdrop",
    what: "Dithered background maker",
    title: "Dithers any picture into a wallpaper",
    line: "Drop in any picture and get it back as a dark, orange pixel dither. Tune the dots and colours, download a PNG for your screen.",
    credit: { name: "TheCoderBTW", handle: "TheCoderBtw", url: "https://x.com/TheCoderBtw/status/2121061189962866865", work: "the “New look!” post" },
    repo: "https://github.com/VedSoni-dev/frontend/tree/main/pieces/dither",
    usesAi: false,
    media: media("dither"),
    theme: { light: "#0b0a0a", dark: "#0b0a0a" },
  },
  {
    path: "effects",
    name: "tincture",
    what: "Liquid and torn-print image effects",
    title: "Melts your photo into a printed card",
    line: "Drop in your photo and it melts into a card, poster, chip row or ticket: liquid, marble, torn print, glow, grain. Download a PNG or copy the component.",
    credit: { name: "Yax_buzz", handle: "Yaxbuzz", url: "https://x.com/Yaxbuzz/status/2121270887714611691", work: "a set of UI element designs" },
    repo: "https://github.com/VedSoni-dev/frontend/tree/main/pieces/effects",
    usesAi: false,
    embed: { label: "Tincture.tsx", href: "/effects/Tincture.tsx" },
    media: media("effects"),
    theme: { light: "#f3f1ed", dark: "#131215" },
  },
];

export function piece(path: string): Piece {
  const p = PIECES.find((x) => x.path === path);
  if (!p) throw new Error(`No piece at /${path}: add it to pieces/index.ts`);
  return p;
}
