// Our own sample pictures, painted in code (no image licences, nothing to download). Pure: RGBA bytes out.
const mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return mix(mix(hash(xi, yi), hash(xi + 1, yi), u), mix(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}
const fbm = (x, y) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s; };

function paint(w, h, fn) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = fn(x / w, y / h, w / h), i = (y * w + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  return d;
}

/** A sun low over hills, clouds lit from below. */
export function dusk(w, h) {
  return paint(w, h, (u, v, ar) => {
    const sx = 0.68, sy = 0.42;
    const dx = (u - sx) * ar, dy = v - sy, r = Math.sqrt(dx * dx + dy * dy);
    const sky = 1 - v * 0.9;
    const cloud = sstep(0.45, 0.75, fbm(u * 3 * ar, v * 7)) * (1 - sstep(0.35, 0.55, v));
    let l = 70 + sky * 95 + Math.max(0, 1 - r * 1.8) * 170 + cloud * 110 * Math.max(0.2, 1 - r);
    const hill = 0.56 + 0.07 * Math.sin(u * 5 + 1) + 0.05 * fbm(u * 6, 2) - 0.03;
    const hill2 = 0.66 + 0.05 * Math.sin(u * 3.3 + 4) + 0.06 * fbm(u * 9, 7);
    if (v > hill) l = 45 + fbm(u * 20, v * 20) * 40 - (v - hill) * 60;
    if (v > hill2) l = 18 + fbm(u * 30, v * 30) * 30;
    return [Math.min(255, l * 1.15), l * 0.78, l * 0.55];
  });
}

/** A soft glow in the dark, like a light behind fog. */
export function glow(w, h) {
  return paint(w, h, (u, v, ar) => {
    const dx = (u - 0.5) * ar, dy = (v - 0.62), r = Math.sqrt(dx * dx + dy * dy * 1.6);
    const fog = fbm(u * 4 * ar + 3, v * 4);
    const l = Math.max(0, 1 - r * 1.5) ** 1.6 * 230 + fog * 40;
    return [l, l * 0.9, l * 0.85];
  });
}

/** Ridges fading into haze. */
export function ridges(w, h) {
  return paint(w, h, (u, v) => {
    let l = 200 - v * 70;
    for (let k = 0; k < 5; k++) {
      const top = 0.35 + k * 0.12 + 0.1 * (fbm(u * (2 + k), k * 3.1) - 0.5);
      if (v > top) l = 175 - k * 38 + (v - top) * 30 + fbm(u * 25, v * 25) * 12;
    }
    return [l * 0.95, l, l * 1.05];
  });
}

export const SAMPLES = [
  { id: "dusk", name: "Dusk", paint: dusk },
  { id: "glow", name: "Glow", paint: glow },
  { id: "ridges", name: "Ridges", paint: ridges },
];
