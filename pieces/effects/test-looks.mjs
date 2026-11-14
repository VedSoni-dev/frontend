// tincture's looks: clamping, hash round-trip, junk in → defaults out. No browser.
import assert from "node:assert/strict";
import { normalize, encodeHash, decodeHash, DEFAULT_LOOK, PRESET_IDS, LAYOUTS } from "./looks.js";

assert.deepEqual(normalize(null), { ...DEFAULT_LOOK });
assert.deepEqual(normalize("garbage"), { ...DEFAULT_LOOK });
const n = normalize({ layout: "ticket", preset: "marble", dials: { warp: 4, grain: -1, edge: "x", tint: 0.333 }, texts: { ticket: { head: "Hi", evil: 1 }, nope: { a: "b" } } });
assert.equal(n.layout, "ticket"); assert.equal(n.preset, "marble");
assert.deepEqual(n.dials, { warp: 1, grain: 0, tint: 0.33 });
assert.deepEqual(n.texts, { ticket: { head: "Hi" } });
assert.equal(normalize({ layout: "nope", preset: "nope" }).layout, "split");
for (const layout of LAYOUTS.map((l) => l.id)) for (const preset of PRESET_IDS) {
  const look = normalize({ layout, preset, dials: { warp: 0.2, scale: 0.9, grain: 0, edge: 1, tint: 0.5 } });
  const back = decodeHash("#" + encodeHash(look));
  assert.deepEqual({ ...back, texts: {} }, { ...look, texts: {} });
}
assert.equal(decodeHash("#nothing"), null);
assert.equal(decodeHash("#look=split.liquid").dials, null);
console.log("tincture looks: ok");
