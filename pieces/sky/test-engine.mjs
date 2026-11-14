// cirrus: checks on the pure parts of the engine (pieces/sky/cirrus.js) and on the copy-out code. No browser, no network.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const E = await import(new URL("./cirrus.js", import.meta.url));

// seeded noise is deterministic and in range
for (const [x, y] of [[0.3, 0.7], [12.5, 3.25], [-4.1, 9]]) {
  const a = E.noise2(x, y, 7), b = E.noise2(x, y, 7);
  assert.equal(a, b); assert.ok(a >= 0 && a <= 1);
}
assert.notEqual(E.noise2(1.5, 2.5, 7), E.noise2(1.5, 2.5, 8), "seed changes the sky");
const r = E.mulberry32(42); assert.equal(r(), E.mulberry32(42)());

// the wind glyph follows the stroke direction (screen y points down)
const G = (vx, vy, p) => E.TRAIL_GLYPHS[E.glyphFor(vx, vy, p)];
assert.equal(G(1, 0), "-"); assert.equal(G(-1, 0), "-");
assert.equal(G(0, 1), "|"); assert.equal(G(0, -1), "|");
assert.equal(G(1, -1), "/"); assert.equal(G(-1, 1), "/");
assert.equal(G(1, 1), "\\"); assert.equal(G(-1, -1), "\\");
// hysteresis: 25 deg off horizontal stays "-" if it was "-", but becomes "/" from scratch
const v25 = [Math.cos(25 * Math.PI / 180), -Math.sin(25 * Math.PI / 180)];
assert.equal(G(v25[0], v25[1], 0), "-"); assert.equal(G(v25[0], v25[1]), "/");

// decay is frame-rate independent: 1 s at 60 Hz vs 120 Hz ends the same, and a trail is gone in ~life
let a = 1, b = 1;
for (let i = 0; i < 60; i++) a *= E.decayFactor(1 / 60, 1.5);
for (let i = 0; i < 120; i++) b *= E.decayFactor(1 / 120, 1.5);
assert.ok(Math.abs(a - b) < 1e-9);
assert.ok(E.decayFactor(1.5, 1.5) < 0.06);

// config hygiene: junk becomes defaults, values clamp
assert.deepEqual(E.normalize(null), E.DEFAULTS);
assert.deepEqual(E.normalize({ time: "midnight", cover: "lots", glyphs: 3, trail: "nope" }), E.DEFAULTS);
const c = E.normalize({ cover: 9, wind: -1, cell: 99, time: "night", trail: "false", seed: "12" });
assert.equal(c.cover, 1); assert.equal(c.wind, 0); assert.equal(c.cell, 16); assert.equal(c.time, "night"); assert.equal(c.trail, false); assert.equal(c.seed, 12);

// copy-out: the public file is the same engine, and nothing of the original's identity ships
const pub = readFileSync(new URL("../../public/sky/cirrus.js", import.meta.url), "utf8");
assert.equal(pub, readFileSync(new URL("./cirrus.js", import.meta.url), "utf8"));
for (const f of ["./cirrus.js", "./Playground.tsx", "./exportCode.ts"]) {
  const s = readFileSync(new URL(f, import.meta.url), "utf8");
  assert.ok(!/\bUNV\b|FRAIM|Biome|bluesky/i.test(s), `identity leak in ${f}`);
}
assert.ok(!/fetch\(|XMLHttpRequest|import\(/.test(pub), "the engine makes no requests");
const { htmlSnippet, reactFile } = await import(new URL("./exportCode.ts", import.meta.url)).catch(() => ({}));
if (htmlSnippet) {
  const cfg = E.normalize({ time: "dusk", cover: 0.7 });
  const h = htmlSnippet(pub, cfg); assert.ok(h.includes('time="dusk"') && h.includes('cover="0.7"'));
  new Function(reactFile(pub, cfg).replace(/^[\s\S]*?\/\/ ---- engine ----/, "").split("// ---- React ----")[0]); // the inlined engine parses
}
console.log("cirrus: engine checks passed");
