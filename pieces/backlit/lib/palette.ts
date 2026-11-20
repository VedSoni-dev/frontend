// Album art → the glow's colours. Pure maths over RGBA pixels (the caller draws the art small onto a canvas),
// so it is testable without a DOM.

export type RGB = [number, number, number];

function hsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Light needs colour: lift a picked colour to a glowing saturation and lightness, keeping its hue. */
export function toLight(c: RGB): RGB {
  const [h, s, l] = hsl(c);
  if (s < 0.12) return fromHsl(h, 0, Math.max(0.78, l)); // greys become a warm white, not mud
  return fromHsl(h, Math.max(0.72, Math.min(1, s * 1.25)), Math.min(0.66, Math.max(0.52, l)));
}

export const hex = (c: RGB) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

/** RGBA bytes → up to `k` glow colours, most vivid and most present first.
 *  A small k-means over pixels weighted by how colourful they are; near-black and near-white pixels barely count. */
export function paletteFrom(px: ArrayLike<number>, k = 4): RGB[] {
  const pts: { c: RGB; w: number }[] = [];
  for (let i = 0; i + 3 < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const c: RGB = [px[i], px[i + 1], px[i + 2]];
    const [, s, l] = hsl(c);
    const w = 0.08 + s * (1 - Math.abs(l - 0.5) * 1.6);
    pts.push({ c, w: Math.max(0.02, w) });
  }
  if (!pts.length) return [[255, 255, 255]];
  // seed with the most colourful pixels spread apart (deterministic, so the same art gives the same glow)
  const sorted = [...pts].sort((a, b) => b.w - a.w);
  const dist = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const seeds: RGB[] = [sorted[0].c];
  for (const p of sorted) { if (seeds.length >= k) break; if (seeds.every((s) => dist(s, p.c) > 60 ** 2)) seeds.push(p.c); }
  let cent = seeds.map((c) => [...c] as RGB);
  let mass = cent.map(() => 0);
  for (let it = 0; it < 8; it++) {
    const acc = cent.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      let bi = 0, bd = Infinity;
      cent.forEach((c, j) => { const d = dist(c, p.c); if (d < bd) { bd = d; bi = j; } });
      const a = acc[bi]; a[0] += p.c[0] * p.w; a[1] += p.c[1] * p.w; a[2] += p.c[2] * p.w; a[3] += p.w;
    }
    cent = acc.map((a, j) => (a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]].map(Math.round) as RGB : cent[j]));
    mass = acc.map((a) => a[3]);
  }
  const ranked = cent.map((c, j) => ({ c, m: mass[j] * (0.35 + hsl(c)[1]) })).filter((x) => x.m > 0).sort((a, b) => b.m - a.m);
  const lit = ranked.map((x) => toLight(x.c));
  // drop near-duplicates once lifted
  const out: RGB[] = [];
  for (const c of lit) if (out.every((o) => dist(o, c) > 40 ** 2)) out.push(c);
  return out.length ? out : [[255, 255, 255]];
}

/** Presets for when there's no art yet, or the person wants a fixed colour. */
export const PRESETS: Record<string, string[]> = {
  "from the art": [],
  magenta: ["#ff2fb3", "#8f3dff", "#ff5a7a"],
  ocean: ["#2fa8ff", "#19e0c8", "#5b6bff"],
  ember: ["#ff6a2b", "#ffb12f", "#ff3d5a"],
  lime: ["#b6ff3b", "#3bffb0", "#e6ff6a"],
  white: ["#fff4e6", "#ffffff", "#ffe2c4"],
};
