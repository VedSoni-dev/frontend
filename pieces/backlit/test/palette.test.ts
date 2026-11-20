import { test } from "node:test";
import assert from "node:assert/strict";
import { paletteFrom, toLight, hex } from "../lib/palette.ts";

const px = (cols: [number, number, number][], n = 50) => { const a: number[] = []; for (const c of cols) for (let i = 0; i < n; i++) a.push(c[0], c[1], c[2], 255); return a; };

test("finds the vivid colours in mostly dark art", () => {
  const p = paletteFrom(px([[10, 8, 12], [10, 8, 12], [10, 8, 12], [220, 30, 140], [120, 40, 230]]));
  assert.ok(p.length >= 2);
  const hues = p.map(hex);
  assert.ok(hues.some((h) => parseInt(h.slice(1, 3), 16) > 200), `expected a magenta-ish colour in ${hues}`);
});

test("greys become a warm white, colours stay bright", () => {
  const w = toLight([128, 128, 128]);
  assert.ok(w[0] > 190 && w[1] > 190);
  const m = toLight([90, 10, 60]);
  assert.ok(Math.max(...m) > 200);
});

test("empty input still returns a colour", () => {
  assert.equal(paletteFrom([]).length, 1);
});
