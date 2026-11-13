// backdrop's engine checks: no browser, no network.
import assert from "node:assert/strict";
import { dither, bayer, ramp, normalize, upscale, exportPlan, DEFAULTS } from "./engine.js";

const flat = (w, h, v) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } return d; };
const grad = (w, h) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] = (x * 255) / (w - 1); d[i + 1] = (y * 255) / (h - 1); d[i + 2] = 128; d[i + 3] = 255; } return d; };
const key = (d, i) => `${d[i]},${d[i + 1]},${d[i + 2]}`;

// Bayer matrices hold every threshold once
for (const n of [4, 8]) { const m = [...bayer(n)].map((v) => Math.round(v * n * n - 0.5)).sort((a, b) => a - b); assert.deepEqual(m, Array.from({ length: n * n }, (_, i) => i)); }
// grid size follows the dot size
const src = grad(120, 90);
const g = dither(src, 120, 90, { dot: 3 });
assert.equal(g.width, 40); assert.equal(g.height, 30);
// with mix 0 every pixel is a palette colour
for (const p of ["ember", "ash", "blood", "phosphor", "ink"]) {
  const s = normalize({ palette: p }); const allowed = new Set(ramp(s.accent).map((x) => x.c.join(",")));
  const r = dither(src, 120, 90, s); for (let i = 0; i < r.data.length; i += 4) assert.ok(allowed.has(key(r.data, i)), `${p}: ${key(r.data, i)}`);
}
// same input, same output
assert.deepEqual(dither(src, 120, 90, DEFAULTS).data, dither(src, 120, 90, DEFAULTS).data);
// more darkness, more black
const black = ramp(DEFAULTS.accent)[0].c.join(",");
const count = (r) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (key(r.data, i) === black) n++; return n; };
assert.ok(count(dither(src, 120, 90, { darkness: 0.9 })) > count(dither(src, 120, 90, { darkness: 0.1 })));
// a flat mid-grey makes a two-colour checker pattern, not one flat colour
const mid = dither(flat(16, 16, 159), 16, 16, { dot: 1, darkness: 0, contrast: 1, pattern: "bayer4" });
assert.equal(new Set(Array.from({ length: 256 }, (_, i) => key(mid.data, i * 4))).size, 2);
// bad settings never throw
const n = normalize({ dot: "x", contrast: 99, pattern: "<b>", palette: "nope", accent: "red;" });
assert.equal(n.dot, 3); assert.equal(n.contrast, 2); assert.equal(n.pattern, "bayer8"); assert.equal(n.palette, "ember");
// upscale is nearest-neighbour by a whole factor
const u = upscale(g, 3); assert.equal(u.width, 120); assert.equal(key(u.data, 0), key(g.data, 0)); assert.equal(key(u.data, 2 * 4), key(g.data, 0));
// export plan: cover-crop to the target aspect, grid covers the target
const p = exportPlan(4000, 3000, 1920, 1080, 3);
assert.ok(Math.abs(p.crop.w / p.crop.h - 16 / 9) < 0.01); assert.equal(p.crop.w, 4000); assert.equal(p.crop.y, 375); assert.equal(p.gw * 3 >= 1920, true);
console.log("dither engine: ok");
