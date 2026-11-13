// backdrop's engine: ordered dithering into a small dark-weighted palette. Pure and deterministic, no DOM: it reads and
// writes RGBA byte arrays, so the browser (preview and export) and node (tests, media) run the same code.
//   cells = box-downscale the picture to a grid (one cell per dot)
//   L     = Rec. 709 luminance → contrast → darkness (black point + gamma, so shadows fall to black)
//   out   = ordered threshold (Bayer 4×4 / 8×8 or interleaved-gradient noise) between the palette's luminance steps
//   mix   = blend with the cell's own colour
// Ordered dithering (Bayer, 1973) is a public technique; no third-party code here.

/** @typedef {"bayer4" | "bayer8" | "noise"} Pattern */

export const PATTERNS = ["bayer8", "bayer4", "noise"];

/** Palette ramps, darkest first. Each is 5 colours: black, dark grey, the accent, a light grey, an off-white. */
export const PALETTES = {
  ember: { name: "Ember", accent: "#ff5a0a" },
  ash: { name: "Ash", accent: "#d9d4ce" },
  blood: { name: "Blood", accent: "#e01e2b" },
  phosphor: { name: "Phosphor", accent: "#39e26a" },
  ink: { name: "Ink", accent: "#6f6f6f" },
};

export const DEFAULTS = { dot: 3, contrast: 1.15, darkness: 0.4, mix: 0, pattern: "bayer8", palette: "ember", accent: "#ff5a0a" };

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lum(r, g, b) { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }

/** The 5-step ramp for an accent colour, sorted by luminance (darkest first). Ash and Ink lean neutral. */
export function ramp(accentHex) {
  const a = hexToRgb(accentHex) ?? [255, 90, 10];
  const cols = [[10, 9, 9], [52, 49, 48], a, [150, 144, 140], [232, 226, 220]];
  return cols.map((c) => ({ c, l: lum(c[0], c[1], c[2]) })).sort((x, y) => x.l - y.l);
}

/** A Bayer matrix of size n (a power of 2), built recursively, thresholds in (0, 1). */
export function bayer(n) {
  let m = [[0]];
  for (let s = 1; s < n; s *= 2) {
    const next = Array.from({ length: s * 2 }, () => new Array(s * 2));
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const v = 4 * m[y][x];
      next[y][x] = v; next[y][x + s] = v + 2; next[y + s][x] = v + 3; next[y + s][x + s] = v + 1;
    }
    m = next;
  }
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[y * n + x] = (m[y][x] + 0.5) / (n * n);
  return out;
}

const B4 = bayer(4), B8 = bayer(8);

export function threshold(pattern, x, y) {
  if (pattern === "bayer4") return B4[(y & 3) * 4 + (x & 3)];
  if (pattern === "noise") { const v = 52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1); return v - Math.floor(v); }
  return B8[(y & 7) * 8 + (x & 7)];
}

/** Settings from anything (storage, a URL): never throws, falls back to the defaults. */
export function normalize(o) {
  const s = o && typeof o === "object" ? o : {};
  const num = (v, d, a, b) => (typeof v === "number" && Number.isFinite(v) ? clamp(v, a, b) : d);
  const palette = typeof s.palette === "string" && (s.palette in PALETTES || s.palette === "custom") ? s.palette : DEFAULTS.palette;
  const accent = hexToRgb(s.accent) ? String(s.accent).toLowerCase() : palette in PALETTES ? PALETTES[palette].accent : DEFAULTS.accent;
  return {
    dot: Math.round(num(s.dot, DEFAULTS.dot, 1, 8)),
    contrast: num(s.contrast, DEFAULTS.contrast, 0.5, 2),
    darkness: num(s.darkness, DEFAULTS.darkness, 0, 1),
    mix: num(s.mix, DEFAULTS.mix, 0, 1),
    pattern: PATTERNS.includes(s.pattern) ? s.pattern : DEFAULTS.pattern,
    palette,
    accent,
  };
}

/** Box-downscale RGBA (w×h) to a gw×gh grid of average colours. */
export function downscale(data, w, h, gw, gh) {
  const out = new Float32Array(gw * gh * 3);
  for (let gy = 0; gy < gh; gy++) {
    const y0 = Math.floor((gy * h) / gh), y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * h) / gh));
    for (let gx = 0; gx < gw; gx++) {
      const x0 = Math.floor((gx * w) / gw), x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * w) / gw));
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4, a = data[i + 3] / 255; // transparency flattens onto black
        r += data[i] * a; g += data[i + 1] * a; b += data[i + 2] * a; n++;
      }
      const o = (gy * gw + gx) * 3;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
    }
  }
  return out;
}

/** The tone curve: contrast around mid-grey, then darkness (black point + gamma). */
export function tone(l, contrast, darkness) {
  let v = clamp((l - 0.5) * contrast + 0.5, 0, 1);
  const bp = darkness * 0.25;
  v = clamp((v - bp) / (1 - bp), 0, 1);
  return Math.pow(v, 1 + darkness * 1.2);
}

/**
 * Dither a w×h RGBA picture into a gw×gh RGBA grid (one pixel per dot). gw/gh default to w/dot, h/dot.
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
export function dither(data, w, h, opts, gw, gh) {
  const o = normalize(opts);
  gw = gw ?? Math.max(1, Math.round(w / o.dot));
  gh = gh ?? Math.max(1, Math.round(h / o.dot));
  const cells = downscale(data, w, h, gw, gh);
  const steps = ramp(o.accent), last = steps.length - 1;
  const out = new Uint8ClampedArray(gw * gh * 4);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const ci = (y * gw + x) * 3, r = cells[ci], g = cells[ci + 1], b = cells[ci + 2];
    const v = tone(lum(r, g, b), o.contrast, o.darkness) * last; // position along the ramp
    const lo = Math.min(last, Math.floor(v));
    const pick = v - lo > threshold(o.pattern, x, y) ? Math.min(last, lo + 1) : lo;
    const c = steps[pick].c, oi = (y * gw + x) * 4;
    out[oi] = c[0] + (r - c[0]) * o.mix;
    out[oi + 1] = c[1] + (g - c[1]) * o.mix;
    out[oi + 2] = c[2] + (b - c[2]) * o.mix;
    out[oi + 3] = 255;
  }
  return { data: out, width: gw, height: gh };
}

/** Nearest-neighbour upscale of a grid by an integer factor. */
export function upscale(grid, factor) {
  const f = Math.max(1, Math.floor(factor)), W = grid.width * f, H = grid.height * f;
  const out = new Uint8ClampedArray(W * H * 4), src = new Uint32Array(grid.data.buffer, grid.data.byteOffset, grid.width * grid.height);
  const dst = new Uint32Array(out.buffer);
  for (let y = 0; y < H; y++) {
    const row = ((y / f) | 0) * grid.width;
    for (let x = 0; x < W; x++) dst[y * W + x] = src[row + ((x / f) | 0)];
  }
  return { data: out, width: W, height: H };
}

/**
 * How to export at a target size: cover-crop the source to the target's aspect (centred), dither at target/dot,
 * upscale by the whole dot, centre-crop any remainder. Returns the source crop and the grid size.
 */
export function exportPlan(sw, sh, tw, th, dot) {
  const d = Math.max(1, Math.round(dot));
  const ta = tw / th, sa = sw / sh;
  let cw = sw, ch = sh;
  if (sa > ta) cw = Math.round(sh * ta); else ch = Math.round(sw / ta);
  const crop = { x: Math.floor((sw - cw) / 2), y: Math.floor((sh - ch) / 2), w: cw, h: ch };
  const gw = Math.ceil(tw / d), gh = Math.ceil(th / d);
  return { crop, gw, gh, dot: d, width: tw, height: th, offX: Math.floor((gw * d - tw) / 2), offY: Math.floor((gh * d - th) / 2) };
}
