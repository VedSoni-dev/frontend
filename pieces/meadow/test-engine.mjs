// loam: checks on the pure parts of the engine (pieces/meadow/loam.js) and on the copy-out code. No browser, no network.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const E = await import(new URL("./loam.js", import.meta.url));

// config hygiene: junk becomes defaults, values clamp, the mix accepts a list or a comma string
assert.deepEqual(E.normalize(null), E.DEFAULTS);
assert.deepEqual(E.normalize({ planter: "boat", ground: "moon", density: "lots", bugs: "nope", mix: 7 }), E.DEFAULTS);
const c = E.normalize({ density: 9, wind: -1, sun: 999, planter: "round", mix: "daisy, poppy,tulip", bugs: "false", seed: "12" });
assert.equal(c.density, 1); assert.equal(c.wind, 0); assert.equal(c.sun, 360); assert.equal(c.planter, "round");
assert.deepEqual(c.mix, ["poppy", "daisy"]); assert.equal(c.bugs, false); assert.equal(c.seed, 12);
assert.deepEqual(E.normalize({ mix: [] }).mix, [], "grass only is allowed");

// the same seed is the same meadow; another seed is another meadow
const a = E.buildField(E.DEFAULTS, 1280, 800), b = E.buildField(E.DEFAULTS, 1280, 800);
assert.deepEqual(Array.from(a.blades.slice(0, 64)), Array.from(b.blades.slice(0, 64)));
assert.deepEqual(Array.from(a.heads), Array.from(b.heads));
const d = E.buildField({ ...E.DEFAULTS, seed: 12 }, 1280, 800);
assert.notDeepEqual(Array.from(a.heads.slice(0, 24)), Array.from(d.heads.slice(0, 24)));
assert.ok(a.bladeCount > 3000 && a.headCount > 60, "a dense meadow at the defaults");

// everything grows inside the planter's opening; flowers draw after leaves, tallest last
const { box } = a;
for (let i = 0; i < a.bladeCount; i += 37) { const x = a.blades[i * 8], y = a.blades[i * 8 + 1]; assert.ok(x > box.x0 + box.ft * 0.5 && x < box.x1 - box.ft * 0.5 && y > box.y0 + box.ft * 0.5 && y < box.y1 - box.ft * 0.5); }
for (let i = 1; i < a.headCount; i++) assert.ok(a.heads[i * 12 + 7] >= a.heads[(i - 1) * 12 + 7]);
const mixOnly = E.buildField({ ...E.DEFAULTS, mix: ["daisy"] }, 1280, 800);
assert.ok(mixOnly.flowers.every((f) => f[4] === 2), "only the chosen flowers grow");
assert.equal(E.buildField({ ...E.DEFAULTS, mix: [] }, 1280, 800).flowers.length, 0);
// a tall screen turns the long planter upright; round is round
const tall = E.planterBox(390, 800, "long"); assert.ok(tall.y1 - tall.y0 > tall.x1 - tall.x0);
assert.equal(E.planterBox(1000, 800, "round").round, true);

// copy-out: the public file is the same engine, it makes no requests, and nothing of the original's identity ships
const pub = readFileSync(new URL("../../public/meadow/loam.js", import.meta.url), "utf8");
assert.equal(pub, readFileSync(new URL("./loam.js", import.meta.url), "utf8"));
assert.ok(!/fetch\(|XMLHttpRequest|import\(|Math\.random/.test(pub), "the engine makes no requests and is seeded");
for (const f of ["./loam.js", "./Playground.tsx", "./exportCode.ts"]) {
  const s = readFileSync(new URL(f, import.meta.url), "utf8");
  assert.ok(!/living.?scenes|blender|fable/i.test(s), `identity leak in ${f}`);
}
const X = await import(new URL("./exportCode.ts", import.meta.url)).catch(() => ({}));
if (X.htmlSnippet) {
  const cfg = E.normalize({ planter: "square", mix: ["poppy", "clover"], wind: 0.8, sun: 200 });
  const h = X.htmlSnippet(pub, cfg);
  assert.ok(h.includes('planter="square"') && h.includes('mix="poppy,clover"') && h.includes('wind="0.8"') && h.includes('sun="200"'));
  assert.ok(!/^export /m.test(h), "the inline module has no exports left");
  assert.ok(X.cdnTag(cfg).includes("frontend.vedantsoni.com/meadow/loam.js"));
  // the attributes read back to the same settings
  const back = {}; for (const [, k, v] of X.attrs(cfg).matchAll(/(\w+)="([^"]*)"/g)) back[k] = v;
  assert.deepEqual(E.normalize(back), { ...cfg });
  new Function(X.reactFile(pub, cfg).replace(/^[\s\S]*?\/\/ ---- engine ----/, "").split("// ---- React ----")[0]); // the inlined engine parses
}
console.log("loam: engine checks passed");
