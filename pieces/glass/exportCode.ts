// vellum: turn the current settings into code people paste into their own site.
import { GLASS_CSS, GLASS_DEFAULTS, type GlassProps } from "./Glass";

export type GlassSettings = Required<Omit<GlassProps, "replay">>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Bundled photos are absolute URLs; an uploaded photo is a blob: URL that only lives in this tab. */
export function exportablePhoto(photo: string) {
  if (photo.startsWith("blob:")) return "/your-photo.jpg";
  return photo.startsWith("/glass/") ? `https://frontend.vedantsoni.com${photo}` : photo;
}

export function reactUsage(o: GlassSettings) {
  const r = (n: number) => Math.round(n * 100) / 100;
  const links = JSON.stringify(o.links);
  const lines = [
    `word=${JSON.stringify(o.word)}`,
    `photo=${JSON.stringify(exportablePhoto(o.photo))}`,
    `accent=${JSON.stringify(o.accent)}`,
    `blur={${r(o.blur)}} soft={${r(o.soft)}} panel={${r(o.panel)}}`,
    `headline=${JSON.stringify(o.headline)}`,
    `sub=${JSON.stringify(o.sub)}`,
    `cta=${JSON.stringify(o.cta)} ctaHref=${JSON.stringify(o.ctaHref)}`,
    `links={${links}}`,
  ];
  return `<Glass\n  ${lines.join("\n  ")}\n/>`;
}

export function reactFile(src: string, o: GlassSettings) {
  const usage = reactUsage(o).split("\n").map((l) => `//   ${l}`).join("\n");
  const upload = o.photo.startsWith("blob:") ? "\n// Your uploaded photo stays on your computer: put it in your site's public folder as /your-photo.jpg (or change the path)." : "";
  return `// Glass.tsx (vellum): save this file in your React app (Next.js, Vite, Remix...) and render it at the bottom of your page:\n${usage}\n// Needs React 18+. No other dependencies. MIT.${upload}\n${src}`;
}

/** One self-contained HTML file: the same CSS, the footer markup and the same engine as a plain script. */
export function htmlFile(engineJs: string, o: GlassSettings) {
  const year = new Date().getFullYear();
  const photo = exportablePhoto(o.photo);
  const letters = Array.from(o.word || " ")
    .map((c, i) => `<span class="vl-l" aria-hidden="true" style="--i:${i}">${c === " " ? "&nbsp;" : esc(c)}</span>`)
    .join("");
  const links = o.links.map((l, i) => `      <li style="--i:${i + 1}"><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("\n");
  const cta = o.headline || o.cta
    ? `  <div class="vl-cta">
    ${o.headline ? `<h2>${esc(o.headline)}</h2>` : ""}
    ${o.sub ? `<p>${esc(o.sub)}</p>` : ""}
    ${o.cta ? `<a class="vl-btn" href="${esc(o.ctaHref)}">${esc(o.cta)}<i><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5"/></svg></i></a>` : ""}
  </div>\n`
    : "";
  return `<!-- vellum: a frosted-glass footer with your word cut into it as clear glass. MIT. https://frontend.vedantsoni.com/glass
     Paste the <style>, the <footer> and the <script> into your page (the footer goes at the bottom). ${o.photo.startsWith("blob:") ? "\n     Your uploaded photo stays on your computer: save it next to this page as your-photo.jpg (or change --photo)." : ""} -->
<style>${GLASS_CSS}</style>

<footer class="vl" style="--accent:${esc(o.accent)};--blur:${o.blur}px;--soft:${o.soft}px;--panel-h:${Math.round(o.panel * 100)}%;--photo:url('${esc(photo)}');--n:${Array.from(o.word).length}">
  <div class="vl-photo" aria-hidden="true"></div>
${cta}  <div class="vl-panel">
    <div class="vl-meta"><span style="--i:0">&copy; ${year} ${esc(o.word)}</span><i class="vl-rule" aria-hidden="true"></i><span style="--i:1">All rights reserved</span></div>
    <nav aria-label="Footer"><ul class="vl-nav">
${links}
    </ul></nav>
    <p class="vl-word" aria-label="${esc(o.word)}">${letters}</p>
    <span class="vl-mark" aria-hidden="true"><b></b><b></b></span>
  </div>
</footer>

<script>
${engineJs.trim()}
document.querySelectorAll(".vl").forEach(function (el) { mountGlass(el); });
</script>
`;
}

export { GLASS_DEFAULTS };
