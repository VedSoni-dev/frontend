// The files people embed in their own sites, served as plain public files (never behind the gate):
//   pieces/flowers/seedbed.js     -> public/flowers/seedbed.js   (an ES module that also defines <seedbed-garden>)
//   pieces/slider/detent.js       -> public/slider/detent.js     (the same engine as a plain script: window.Detent + [data-detent])
//   pieces/footer/GrainFooter.tsx -> public/footer/GrainFooter.tsx (the one-file React component)
//   pieces/effects/Tincture.tsx   -> public/effects/Tincture.tsx   (tincture's one-file React component, shader inside)
// Run by `npm run dev` and `npm run build`; the outputs are committed too, so the URLs work from any checkout.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

for (const d of ["public/flowers", "public/slider", "public/footer", "public/effects"]) mkdirSync(d, { recursive: true });
copyFileSync("pieces/flowers/seedbed.js", "public/flowers/seedbed.js");
copyFileSync("pieces/footer/GrainFooter.tsx", "public/footer/GrainFooter.tsx");
copyFileSync("pieces/effects/Tincture.tsx", "public/effects/Tincture.tsx");

// detent: the ES module becomes one plain script tag (from detent's own scripts/copy-source.mjs).
const src = readFileSync("pieces/slider/detent.js", "utf8").replace(/^export (const|function|let) /gm, "$1 ");
writeFileSync("public/slider/detent.js", `/*! detent · a slider you can feel · MIT · https://github.com/VedSoni-dev/detent */
(function () {
"use strict";
${src}
var api = { mount: mount, normalize: normalize, describeDevice: describeDevice, capabilities: capabilities, DEFAULTS: DEFAULTS };
globalThis.Detent = api;
function boot() {
  document.querySelectorAll("[data-detent]").forEach(function (n) {
    if (n.__detent) return;
    var opts = optionsFromDataset(n.dataset);
    opts.onChange = function (v) { n.dataset.value = String(v); n.dispatchEvent(new CustomEvent("detent:change", { detail: { value: v }, bubbles: true })); };
    n.__detent = mount(n, opts);
  });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
}
if (typeof module === "object" && module && module.exports) module.exports = api;
})();
`);
console.log("copy-sources: public/flowers/seedbed.js, public/slider/detent.js, public/footer/GrainFooter.tsx, public/effects/Tincture.tsx");
