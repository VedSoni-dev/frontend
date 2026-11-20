// baize: checks on the pure parts of the engine (pieces/hold/baize.js) and on the copy-out code. No browser, no network.
import assert from "node:assert/strict";
const E = await import(new URL("./baize.js", import.meta.url));

// config hygiene: junk becomes defaults, numbers clamp, felt takes a name or a hex colour
assert.deepEqual(E.normalize(null), E.DEFAULTS);
assert.deepEqual(E.normalize({ felt: "plaid", ball: "eight", hold: "soon", label: "   ", sound: "nope" }), E.DEFAULTS);
const c = E.normalize({ felt: "BLUE", ball: 99, hold: 10, size: 999, reset: -4, sound: "" , label: " Hold to pay ", done: "Paid" });
assert.equal(c.felt, "blue"); assert.equal(c.ball, 15); assert.equal(c.hold, 300); assert.equal(c.size, 240); assert.equal(c.reset, 0);
assert.equal(c.sound, true, "a bare sound attribute turns it on");
assert.equal(c.label, "Hold to pay"); assert.equal(c.done, "Paid");
assert.equal(E.normalize({ felt: "#AA3355" }).felt, "#aa3355");
assert.equal(E.normalize({ label: "x".repeat(80) }).label.length, 40);

// colour: the felt palette is darker words on a lighter bed, for every felt
for (const f of [...Object.keys(E.FELTS), "#101010", "#f0f0f0"]) {
  const p = E.feltPalette(f);
  for (const v of Object.values(p)) assert.match(v, /^#[0-9a-f]{6}$/);
  const L = (h) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
  assert.ok(L(p.ink) < L(p.base) && L(p.base) < L(p.hi), `palette order for ${f}`);
}
assert.equal(E.shade("#808080", 1), "#ffffff");
assert.equal(E.shade("#808080", -1), "#000000");

// balls: 1–8 solids, 9–15 stripes of the same colours
assert.deepEqual(E.ballLook(8), { n: 8, color: "#151515", stripe: false });
assert.deepEqual(E.ballLook(9), { n: 9, color: E.BALL_COLORS[0], stripe: true });
assert.equal(E.ballLook(0).n, 8, "no ball number falls back to the 8"); assert.equal(E.ballLook(40).n, 15);

// a struck ball arrives still rolling (at k × its starting speed)
assert.equal(E.rolling(0, 0.4), 0); assert.equal(E.rolling(1, 0.4), 1);
const v = (t) => (E.rolling(t + 1e-4, 0.4) - E.rolling(t, 0.4)) / 1e-4;
assert.ok(Math.abs(v(1 - 1e-4) / v(0) - 0.4) < 0.01);

// the break: the cue reaches the ball, the cue ball stops at the object ball, the object ball reaches the pocket and
// drops, and the words change only after it has dropped
const g = { L: 400, M: 150, D: 40, cueFrom: -3 };
const s0 = E.breakAt(0, g), ev = s0.events;
assert.equal(s0.cueX, -3); assert.equal(s0.ballX, 0); assert.equal(s0.done, 0);
assert.ok(Math.abs(E.breakAt(ev.hit, g).cueX) < 1e-9, "the cue touches the ball at the hit");
assert.ok(Math.abs(E.breakAt(ev.clack, g).ballX - g.L) < 1e-6, "the cue ball meets the object ball at the clack");
assert.equal(E.breakAt(ev.clack, g).objX, 0);
assert.ok(Math.abs(E.breakAt(ev.drop, g).objX - g.M) < 1e-6, "the object ball is over the pocket at the drop");
assert.equal(E.breakAt(ev.drop, g).done, 0, "the words wait for the drop");
const end = E.breakAt(ev.end, g);
assert.equal(end.objOp, 0); assert.equal(end.done, 1); assert.equal(end.cueOp, 0); assert.ok(end.check > 0.99);
let last = -1;
for (let t = 0; t <= ev.clack; t += 5) { const x = E.breakAt(t, g).ballX; assert.ok(x >= last - 1e-9, "the cue ball never rolls backwards"); last = x; }
assert.ok(ev.hit < ev.clack && ev.clack < ev.drop && ev.drop < ev.end);

// the copy-out code carries the buttons and only the settings that differ from the defaults
const X = await import(new URL("./exportCode.ts", import.meta.url)).catch(() => null);
if (X) {
  const s = { v: 1, count: 2, hold: 1000, size: 88, reset: 1800, sound: true, buttons: [
    { label: 'Hold to "go"', done: "Gone", felt: "teal", ball: 3 }, { label: "Hold to send", done: "Sent", felt: "blue", ball: 9 }, { label: "x", done: "y", felt: "red", ball: 1 } ] };
  const h = X.htmlSnippet(s);
  assert.match(h, /<script type="module" src="https:\/\/frontend\.vedantsoni\.com\/hold\/baize\.js"><\/script>/);
  assert.equal((h.match(/<baize-hold /g) || []).length, 2, "one tag per shown button");
  assert.match(h, /label="Hold to &quot;go&quot;" done="Gone" felt="teal" ball="3" sound>/);
  assert.doesNotMatch(h, /hold="|size="/);
  assert.match(X.reactFile(s), /export default function HoldButton/);
}
console.log("baize engine ok");
