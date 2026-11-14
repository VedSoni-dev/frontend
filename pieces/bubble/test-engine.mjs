// suds: checks on the plain-script build (public/bubble/suds.js): the API is there, the word fits, markup is escaped,
// unsafe links are dropped and nothing of the original's identity ships. No browser, no network.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const src = readFileSync("public/bubble/suds.js", "utf8");
const g = {};
new Function("globalThis", "customElements", src)(g, undefined);
const S = g.Suds;
for (const k of ["createSuds", "sudsMarkup", "injectSudsCss", "fitSize", "DEFAULTS"]) assert.ok(S[k], `missing ${k}`);
assert.equal(S.fitSize(500, 1000), 192); // long word fills ~96% of the band
assert.equal(S.fitSize(20, 1000), 340); // one letter is capped
assert.equal(S.fitSize(0, 1000), 120); // empty word falls back
const m = S.sudsMarkup({ ...S.DEFAULTS, word: "<b>", columns: [{ title: "A", links: [{ label: "x", href: "javascript:alert(1)" }] }] });
assert.ok(m.includes("&lt;b&gt;") && !m.includes("<b>") && m.includes('href="#"'));
assert.ok(S.sudsMarkup({ ...S.DEFAULTS, word: "  " }).includes(S.DEFAULTS.word)); // empty word -> placeholder
for (const f of ["public/bubble/suds.js", "public/bubble/Suds.tsx"]) assert.ok(!/one\s*design|one\.design|\bAX\b|EDE8DF/i.test(readFileSync(f, "utf8")), `identity leak in ${f}`);
assert.ok(!/fetch\(|XMLHttpRequest|import\(/.test(src), "the embed makes no requests");
console.log("suds: engine checks passed");
