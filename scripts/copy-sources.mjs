// The files people embed in their own sites, served as plain public files (never behind the gate):
//   pieces/flowers/seedbed.js     -> public/flowers/seedbed.js   (an ES module that also defines <seedbed-garden>)
//   pieces/slider/detent.js       -> public/slider/detent.js     (the same engine as a plain script: window.Detent + [data-detent])
//   pieces/footer/GrainFooter.tsx -> public/footer/GrainFooter.tsx (the one-file React component)
//   pieces/effects/Tincture.tsx   -> public/effects/Tincture.tsx   (tincture's one-file React component, shader inside)
//   pieces/sharks/Shoal.tsx       -> public/sharks/Shoal.tsx       (shoal's one-file React + WebGL2 component)
//   pieces/bubble/Suds.tsx        -> public/bubble/Suds.tsx        (suds' one-file React + WebGL footer)
//                                 -> public/bubble/suds.js         (its engine as a plain script: <suds-footer> + window.Suds)
//   pieces/sky/cirrus.js          -> public/sky/cirrus.js          (cirrus: an ES module that also defines <cirrus-sky>)
//   pieces/meadow/loam.js        -> public/meadow/loam.js       (loam: an ES module that also defines <loam-meadow>)
//   pieces/hold/baize.js          -> public/hold/baize.js          (baize: an ES module that also defines <baize-hold>)
//   pieces/glass/Glass.tsx        -> public/glass/Glass.tsx        (vellum's one-file React footer)
//                                 -> public/glass/glass.js         (its engine, mountGlass(), as a plain script for the HTML version)
// Run by `npm run dev` and `npm run build`; the outputs are committed too, so the URLs work from any checkout.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

for (const d of ["public/flowers", "public/slider", "public/footer", "public/effects", "public/sharks", "public/bubble", "public/sky", "public/glass", "public/meadow", "public/hold"]) mkdirSync(d, { recursive: true });
copyFileSync("pieces/flowers/seedbed.js", "public/flowers/seedbed.js");
copyFileSync("pieces/footer/GrainFooter.tsx", "public/footer/GrainFooter.tsx");
copyFileSync("pieces/effects/Tincture.tsx", "public/effects/Tincture.tsx");
copyFileSync("pieces/sharks/Shoal.tsx", "public/sharks/Shoal.tsx");
copyFileSync("pieces/bubble/Suds.tsx", "public/bubble/Suds.tsx");
copyFileSync("pieces/sky/cirrus.js", "public/sky/cirrus.js");
copyFileSync("pieces/meadow/loam.js", "public/meadow/loam.js");
copyFileSync("pieces/glass/Glass.tsx", "public/glass/Glass.tsx");
copyFileSync("pieces/hold/baize.js", "public/hold/baize.js");

// vellum: the engine region of Glass.tsx, types stripped, as a plain script (the HTML/CSS export inlines it).
{
  const ts = (await import("typescript")).default;
  const tsx = readFileSync("pieces/glass/Glass.tsx", "utf8");
  const engine = tsx.split("// ---- engine ----")[1].split("// ---- end engine ----")[0];
  const js = ts.transpileModule(engine, { compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.ESNext } }).outputText
    .replace(/^export (const|function|let) /gm, "$1 ").replace(/^export \{\};?\s*$/gm, "");
  writeFileSync("public/glass/glass.js", js.trim() + "\n");
}

// suds: the engine half of Suds.tsx (above its React marker), types stripped, as one plain script that defines <suds-footer>.
{
  const ts = (await import("typescript")).default;
  const tsx = readFileSync("pieces/bubble/Suds.tsx", "utf8");
  const engine = tsx.split("// ---- React ----")[0].replace(/^"use client";\n/, "");
  const js = ts.transpileModule(engine, { compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.ESNext } }).outputText
    .replace(/^export (const|function|let) /gm, "$1 ").replace(/^export \{\};?\s*$/gm, "");
  writeFileSync("public/bubble/suds.js", `/*! suds · a glass bubble over your footer's wordmark · MIT · https://frontend.vedantsoni.com/bubble */
(function () {
"use strict";
${js}
function readOpts(el) {
  var o = {}; var a = function (n) { return el.getAttribute(n); };
  if (a("word") != null) o.word = a("word");
  if (a("note") != null) o.note = a("note");
  if (a("theme") === "light" || a("theme") === "dark") o.theme = a("theme");
  ["size", "refraction", "wobble", "hue"].forEach(function (k) { var v = parseFloat(a(k)); if (!isNaN(v)) o[k] = v; });
  var j = a("columns") || (el.querySelector('script[type="application/json"]') || {}).textContent;
  if (j) { try { o.columns = JSON.parse(j); } catch (e) { console.warn("suds: columns is not valid JSON"); } }
  return Object.assign({}, SUDS_DEFAULTS, o);
}
if (typeof customElements !== "undefined" && !customElements.get("suds-footer")) {
  customElements.define("suds-footer", class extends HTMLElement {
    static get observedAttributes() { return ["word", "note", "theme", "size", "refraction", "wobble", "hue", "columns"]; }
    connectedCallback() {
      injectSudsCss(this.ownerDocument);
      this.style.display = "block";
      var o = readOpts(this);
      this.foot = this.ownerDocument.createElement("footer");
      this.foot.className = "suds"; this.foot.setAttribute("data-theme", o.theme);
      this.foot.innerHTML = '<div class="suds-in">' + sudsMarkup(o) + "</div>";
      this.textContent = ""; this.appendChild(this.foot);
      this.suds = createSuds(this.foot, o);
    }
    attributeChangedCallback() {
      if (!this.suds) return;
      var o = readOpts(this);
      this.foot.setAttribute("data-theme", o.theme);
      this.foot.querySelector(".suds-in").innerHTML = sudsMarkup(o);
      this.suds.set(o); this.suds.refresh();
    }
    disconnectedCallback() { if (this.suds) this.suds.dispose(); this.suds = null; }
  });
}
globalThis.Suds = { createSuds: createSuds, sudsMarkup: sudsMarkup, injectSudsCss: injectSudsCss, fitSize: fitSize, DEFAULTS: SUDS_DEFAULTS };
})();
`);
}

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
console.log("copy-sources: public/flowers/seedbed.js, public/slider/detent.js, public/footer/GrainFooter.tsx, public/effects/Tincture.tsx, public/sharks/Shoal.tsx, public/bubble/Suds.tsx, public/bubble/suds.js, public/sky/cirrus.js, public/glass/Glass.tsx, public/glass/glass.js, public/meadow/loam.js, public/hold/baize.js");
