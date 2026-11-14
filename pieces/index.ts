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
  {
    path: "sharks",
    name: "shoal",
    what: "3D pixel shark shoal",
    title: "Spins a shoal of pixel sharks in 3D",
    line: "Pixel-art sharks that turn out to be 3D: drag to spin them, tune the pixel size and palette, take it as a background component or a PNG.",
    credit: { name: "stacked", handle: "stackedlol", url: "https://x.com/stackedlol/status/2121327009725047087", work: "the “3D gaussian pixel sharks” post" },
    repo: "https://github.com/VedSoni-dev/frontend/tree/main/pieces/sharks",
    usesAi: false,
    embed: { label: "Shoal.tsx", href: "/sharks/Shoal.tsx" },
    media: media("sharks"),
    theme: { light: "#05080c", dark: "#05080c" },
  },
  {
    path: "bubble",
    name: "suds",
    what: "Footer with a glass bubble lens",
    title: "Puts a glass bubble over your wordmark",
    line: "A footer whose giant word sits under a glass bubble that follows the cursor and magnifies the letters. Type your word and links, copy one file.",
    credit: { name: "Alex Marin", handle: "alexmarin", url: "https://x.com/alexmarin/status/2121270486214521306", work: "the “I'm doing something” footer video" },
    repo: "https://github.com/VedSoni-dev/frontend/tree/main/pieces/bubble",
    usesAi: false,
    embed: { label: "suds.js", href: "/bubble/suds.js" },
    media: media("bubble"),
    theme: { light: "#0a0b0d", dark: "#0a0b0d" },
  },
  {
    path: "sky",
    name: "cirrus",
    what: "Live ASCII sky header",
    title: "Draws a sky in tiny characters",
    line: "A live sky made of tiny characters for the top of your homepage: move through it and the wind writes //// behind you. Pick dawn to night, copy one file.",
    credit: { name: "unvalley", handle: "unvalley_", url: "https://x.com/unvalley_/status/2121293930641997992", work: "the “blue sky study” post" },
    repo: "https://github.com/VedSoni-dev/frontend/tree/main/pieces/sky",
    usesAi: false,
    embed: { label: "cirrus.js", href: "/sky/cirrus.js" },
    media: media("sky"),
    theme: { light: "#4ea4dc", dark: "#0d1222" },
  },
  {
    path: "glass",
    name: "vellum",
    what: "Frosted-glass footer with clear letters",
    title: "Cuts your word into frosted glass",
    line: "A footer that rises over your photo as frosted glass, with your word cut through it as clear glass. Your word, your photo, copy one file.",
    credit: { name: "Sonia Tkachuk", handle: "sonia_axion", url: "https://x.com/sonia_axion/status/2121301089458987125", work: "a footer design" },
    repo: "https://github.com/VedSoni-dev/frontend/tree/main/pieces/glass",
    usesAi: false,
    embed: { label: "Glass.tsx", href: "/glass/Glass.tsx" },
    media: media("glass"),
    theme: { light: "#ecebef", dark: "#0f1016" },
  },
  {
    path: "meadow",
    name: "loam",
    what: "Living flower meadow in a planter",
    title: "Grows a flower meadow in a planter",
    line: "A flower meadow in a wooden planter for your site or your desk: it sways on its own and parts where you move. Pick the flowers, copy one file.",
    credit: { name: "Rishi", handle: "that_rishi07", url: "https://x.com/that_rishi07/status/2121338147187425617", work: "the living flower meadow post" },
    repo: "https://github.com/VedSoni-dev/frontend/tree/main/pieces/meadow",
    usesAi: false,
    embed: { label: "loam.js", href: "/meadow/loam.js" },
    media: media("meadow"),
    theme: { light: "#d9c8b3", dark: "#d9c8b3" },
  },
];

export function piece(path: string): Piece {
  const p = PIECES.find((x) => x.path === path);
  if (!p) throw new Error(`No piece at /${path}: add it to pieces/index.ts`);
  return p;
}
