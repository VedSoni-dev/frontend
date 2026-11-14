"use client";
// vellum: a frosted-glass footer that rises over your photo, with your word cut into it as clear glass.
// One file, no dependencies besides React 18+. MIT. https://frontend.vedantsoni.com/glass
//
// How it works: the card shows your photo, softly blurred. The footer panel is a `backdrop-filter` frost over it.
// Each letter of the word is a span whose background is the SAME photo, sharp and a little brighter, sized and
// positioned in the card's coordinates and clipped to the letter with `background-clip: text`. So inside the
// letters you see straight through the frost. The entrance is CSS transitions on transform/opacity only (never blur),
// armed by JS; without JS, or with reduced motion, the footer simply shows in its final state.
import { useEffect, useRef } from "react";

export interface GlassLink { label: string; href: string }
export interface GlassProps {
  /** The word cut into the glass. */
  word?: string;
  /** The photo behind (any URL, or an object URL from a file input). */
  photo?: string;
  links?: GlassLink[];
  /** The brand mark's colour. */
  accent?: string;
  /** Frost blur in px. */
  blur?: number;
  /** How soft the photo is outside the glass, in px. */
  soft?: number;
  /** Panel height as a share of the card (0.3 to 0.7). */
  panel?: number;
  headline?: string;
  sub?: string;
  cta?: string;
  ctaHref?: string;
  /** Change this number to replay the entrance. */
  replay?: number;
}

export const GLASS_DEFAULTS: Required<Omit<GlassProps, "replay">> = {
  word: "Lumen",
  photo: "https://frontend.vedantsoni.com/glass/ember.jpg",
  links: ["Work", "Studio", "Journal", "Pricing", "Careers", "Press", "Contact"].map((label) => ({ label, href: "#" })),
  accent: "#ff8a5b",
  blur: 22,
  soft: 6,
  panel: 0.46,
  headline: "Thanks for scrolling this far.",
  sub: "Tell us what you're making. We read every note.",
  cta: "Say hello",
  ctaHref: "#",
};

export const GLASS_CSS = `
.vl{--accent:#ff8a5b;--blur:22px;--soft:6px;--panel-h:46%;--photo:none;position:relative;isolation:isolate;overflow:hidden;
  width:100%;min-height:min(640px,92svh);aspect-ratio:16/11;max-height:92svh;border-radius:24px;color:#fff;
  background:#1b2238 linear-gradient(135deg,#25345a,#3a2440 55%,#141029);font-family:"Inter Tight","Inter",ui-sans-serif,system-ui,sans-serif;
  -webkit-font-smoothing:antialiased}
.vl *{box-sizing:border-box}
.vl-photo{position:absolute;inset:0;z-index:-1;background:var(--photo) center/cover no-repeat;filter:blur(var(--soft));transform:scale(1.06)}
.vl-cta{position:absolute;left:0;right:0;top:0;bottom:var(--panel-h);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center}
.vl-cta h2{margin:0;max-width:14ch;font-size:clamp(30px,5.2vw,68px);line-height:1.02;font-weight:600;letter-spacing:-.045em;text-wrap:balance;text-shadow:0 2px 30px rgb(0 0 0/.18)}
.vl-cta p{margin:0;max-width:40ch;font-size:clamp(14px,1.3vw,17px);opacity:.88}
.vl-btn{display:inline-flex;align-items:center;gap:12px;margin-top:6px;height:44px;padding:0 6px 0 18px;border-radius:12px;background:#fff;color:#111;font-size:15px;font-weight:500;text-decoration:none}
.vl-btn i{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;background:#141a2c;color:#fff;font-style:normal}
.vl-btn i svg{width:14px;height:14px}
.vl-panel{position:absolute;left:16px;right:16px;bottom:16px;height:calc(var(--panel-h) - 16px);overflow:hidden;border-radius:18px;
  border:1px solid rgb(255 255 255/.22);background:rgb(20 22 40/.18);
  -webkit-backdrop-filter:blur(var(--blur)) brightness(.78) saturate(1.25);backdrop-filter:blur(var(--blur)) brightness(.78) saturate(1.25);
  box-shadow:inset 0 1px 0 rgb(255 255 255/.16)}
.vl-panel::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,rgb(255 255 255/.10),transparent 32%,transparent 70%,rgb(255 255 255/.06));}
.vl-meta{position:relative;display:flex;align-items:center;gap:20px;padding:clamp(16px,2.2vw,28px) clamp(18px,2.4vw,30px) 0;font-size:clamp(12px,1vw,14px)}
.vl-rule{flex:1;height:1px;background:rgb(255 255 255/.35);transform-origin:left}
.vl-nav{position:relative;display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px 18px;padding:clamp(14px,1.8vw,22px) clamp(18px,2.4vw,30px) 0;margin:0;list-style:none}
.vl-nav a{color:#fff;text-decoration:none;font-size:clamp(13px,1.15vw,16px);opacity:.92}
.vl-nav a:hover{opacity:1;text-decoration:underline;text-underline-offset:4px}
.vl-word{position:absolute;left:clamp(12px,2vw,26px);bottom:0;display:flex;align-items:flex-end;margin:0;white-space:nowrap;
  font-weight:800;line-height:.76;letter-spacing:-.075em;font-size:var(--fs,160px);transform:translateY(.1em)}
.vl-l{display:block;color:transparent;background-image:var(--photo);background-repeat:no-repeat;
  background-size:var(--bw,0) var(--bh,0);background-position:var(--bx,0) var(--by,0);
  -webkit-background-clip:text;background-clip:text;filter:brightness(1.12) saturate(1.12);
  padding:.14em .14em .08em;margin:-.14em -.14em 0} /* room for the ink past the tight letter box; the engine reads offsetLeft/Top, so the photo still lines up */
.vl-mark{position:absolute;display:flex;flex-direction:column;gap:7px;align-items:flex-end;right:clamp(18px,2.4vw,30px);top:var(--mt,55%)}
.vl-mark b{display:block;height:clamp(10px,1.6vw,22px);border-radius:99px;background:var(--accent)}
.vl-mark b:first-child{width:clamp(22px,3vw,40px);border-radius:50%;height:clamp(22px,3vw,40px)}
.vl-mark b:last-child{width:clamp(44px,7vw,96px)}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.vl-panel{background:rgb(24 26 46/.72)}}
@supports not ((background-clip:text) or (-webkit-background-clip:text)){.vl-l{color:rgb(255 255 255/.9);background:none}}
@media (max-width:640px){
  .vl{aspect-ratio:auto;min-height:88svh;border-radius:18px}
  .vl-panel{left:10px;right:10px;bottom:10px;height:min(calc(var(--panel-h) - 10px),264px)}
  .vl-cta{bottom:min(var(--panel-h),274px)}
  .vl-nav{justify-content:flex-start;gap:8px 18px}
  .vl-meta{gap:12px}
}
/* the entrance: only when JS armed it (data-armed) and motion is fine */
.vl[data-armed] .vl-panel{transform:translateY(calc(100% + 24px));transition:transform .75s cubic-bezier(.2,.8,.2,1)}
.vl[data-armed] .vl-rule{transform:scaleX(0);transition:transform .7s cubic-bezier(.6,0,.2,1) .5s}
.vl[data-armed] .vl-meta span,.vl[data-armed] .vl-nav li{opacity:0;transform:translateY(8px);transition:opacity .5s ease,transform .5s ease;transition-delay:calc(.55s + var(--i,0) * 45ms)}
.vl[data-armed] .vl-l{transform:translateY(105%);transition:transform .8s cubic-bezier(.2,.85,.25,1);transition-delay:calc(.85s + var(--i) * 70ms)}
.vl[data-armed] .vl-mark{opacity:0;transform:translateX(60px);transition:opacity .5s ease,transform .7s cubic-bezier(.2,.8,.2,1);transition-delay:calc(1s + var(--n,5) * 70ms)}
.vl[data-armed][data-in] :is(.vl-panel,.vl-rule,.vl-meta span,.vl-nav li,.vl-l,.vl-mark){opacity:1;transform:none}
.vl[data-armed][data-reset] *{transition:none!important}
@media (prefers-reduced-motion:reduce){.vl[data-armed] *{transition:none!important;transform:none!important;opacity:1!important}}
`;

// ---- engine ----
// Plain DOM, no React: the HTML/CSS version runs this same function. root = the .vl element.
export function mountGlass(root: HTMLElement) {
  const word = root.querySelector(".vl-word") as HTMLElement;
  const panel = root.querySelector(".vl-panel") as HTMLElement;
  const mark = root.querySelector(".vl-mark") as HTMLElement;
  let nat = { w: 1600, h: 1000 };
  let alive = true;

  // Fit the word to the panel width, then give each letter the photo in card coordinates.
  function layout() {
    if (!alive) return;
    const W = root.clientWidth, H = root.clientHeight;
    word.style.setProperty("--fs", "100px");
    // Width: the panel minus the margins and room for the mark. Height: the word must stay under the links.
    const narrow = W < 640; // on a phone the mark sits above the word, so the word gets the full width
    const avail = panel.clientWidth - 2 * word.offsetLeft - (narrow ? 0 : mark.offsetWidth + 12);
    const nav = root.querySelector(".vl-nav") as HTMLElement | null;
    const navBottom = nav ? nav.offsetTop + nav.offsetHeight : 0; // .vl-nav is positioned, so this is in panel coordinates
    const tall = panel.clientHeight - (word.offsetTop + 10); // the word's visible height at 100px, above the panel's bottom edge
    const roomH = panel.clientHeight - navBottom - 14 - (narrow ? mark.offsetHeight + 8 : 0);
    const fs = Math.max(40, Math.min((100 * avail) / Math.max(1, word.scrollWidth), (100 * roomH) / Math.max(1, tall)));
    word.style.setProperty("--fs", fs.toFixed(1) + "px");
    const s = Math.max(W / nat.w, H / nat.h), bw = nat.w * s, bh = nat.h * s, ox = (W - bw) / 2, oy = (H - bh) / 2;
    // offsetLeft/Top ignore transforms, so this is the letter's resting place.
    const px = panel.offsetLeft + panel.clientLeft, py = panel.offsetTop + panel.clientTop;
    const shift = fs * 0.1; // the word's translateY(.1em)
    word.querySelectorAll<HTMLElement>(".vl-l").forEach((l) => {
      const x = px + word.offsetLeft + l.offsetLeft, y = py + word.offsetTop + l.offsetTop + shift;
      l.style.setProperty("--bw", bw + "px");
      l.style.setProperty("--bh", bh + "px");
      l.style.setProperty("--bx", (ox - x).toFixed(1) + "px");
      l.style.setProperty("--by", (oy - y).toFixed(1) + "px");
    });
    const top = word.offsetTop + shift;
    mark.style.setProperty("--mt", Math.max(0, narrow ? top - mark.offsetHeight - 8 : top - mark.offsetHeight * 0.1) + "px");
  }

  function readPhoto() {
    const m = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(root).getPropertyValue("--photo"));
    if (!m) return layout();
    const img = new Image();
    img.onload = () => { nat = { w: img.naturalWidth || 1600, h: img.naturalHeight || 1000 }; layout(); };
    img.onerror = () => layout();
    img.src = m[1];
  }

  // Entrance: arm it (hidden start state), then play when 35% of the card is on screen; replay when it comes back.
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function play() {
    root.setAttribute("data-reset", "");
    root.removeAttribute("data-in");
    void root.offsetWidth;
    root.removeAttribute("data-reset");
    requestAnimationFrame(() => requestAnimationFrame(() => root.setAttribute("data-in", "")));
  }
  let io: IntersectionObserver | null = null;
  let seen = false;
  if (!still && "IntersectionObserver" in window) {
    root.setAttribute("data-armed", "");
    io = new IntersectionObserver((es) => {
      seen = true;
      for (const e of es) {
        if (e.intersectionRatio >= 0.35 && !root.hasAttribute("data-in")) root.setAttribute("data-in", "");
        else if (!e.isIntersecting) root.removeAttribute("data-in");
      }
    }, { threshold: [0, 0.35] });
    io.observe(root);
  }
  const failsafe = setTimeout(() => { if (!seen) root.setAttribute("data-in", ""); }, 3000);

  const ro = new ResizeObserver(() => layout());
  ro.observe(root);
  if (document.fonts) document.fonts.ready.then(() => layout());
  readPhoto();

  return {
    play,
    refresh() { readPhoto(); },
    dispose() { alive = false; clearTimeout(failsafe); ro.disconnect(); if (io) io.disconnect(); root.removeAttribute("data-armed"); },
  };
}
// ---- end engine ----

function cssUrl(u: string) { return `url("${u.replace(/["\\\n]/g, "")}")`; }

export default function Glass(props: GlassProps) {
  const o = { ...GLASS_DEFAULTS, ...props };
  const ref = useRef<HTMLElement>(null);
  const api = useRef<ReturnType<typeof mountGlass> | null>(null);
  const letters = Array.from(o.word || " ");

  useEffect(() => {
    if (!ref.current) return;
    api.current = mountGlass(ref.current);
    return () => { api.current?.dispose(); api.current = null; };
  }, []);
  useEffect(() => { api.current?.refresh(); }, [o.word, o.photo, o.panel]);
  useEffect(() => { if (props.replay) api.current?.play(); }, [props.replay]);

  const style = { "--accent": o.accent, "--blur": `${o.blur}px`, "--soft": `${o.soft}px`, "--panel-h": `${Math.round(o.panel * 100)}%`, "--photo": cssUrl(o.photo), "--n": letters.length } as React.CSSProperties;
  const year = new Date().getFullYear();

  return (
    <footer className="vl" ref={ref} style={style}>
      <style>{GLASS_CSS}</style>
      <div className="vl-photo" aria-hidden="true" />
      {(o.headline || o.cta) && (
        <div className="vl-cta">
          {o.headline && <h2>{o.headline}</h2>}
          {o.sub && <p>{o.sub}</p>}
          {o.cta && (
            <a className="vl-btn" href={o.ctaHref}>{o.cta}<i><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" /></svg></i></a>
          )}
        </div>
      )}
      <div className="vl-panel">
        <div className="vl-meta">
          <span style={{ "--i": 0 } as React.CSSProperties}>© {year} {o.word}</span>
          <i className="vl-rule" aria-hidden="true" />
          <span style={{ "--i": 1 } as React.CSSProperties}>All rights reserved</span>
        </div>
        <nav aria-label="Footer">
          <ul className="vl-nav">
            {o.links.map((l, i) => (
              <li key={i} style={{ "--i": i + 1 } as React.CSSProperties}><a href={l.href}>{l.label}</a></li>
            ))}
          </ul>
        </nav>
        <p className="vl-word" aria-label={o.word}>
          {letters.map((c, i) => (
            <span key={i} className="vl-l" aria-hidden="true" style={{ "--i": i } as React.CSSProperties}>{c === " " ? " " : c}</span>
          ))}
        </p>
        <span className="vl-mark" aria-hidden="true"><b /><b /></span>
      </div>
    </footer>
  );
}
