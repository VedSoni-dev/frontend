// baize · a hold-to-confirm button that is a little pool table. Hold it: the cue comes in and draws back while the
// words fill; hold long enough and it breaks, the cue ball sinks the object ball and the button says it's done. Let go
// early and the shot rolls back. One file, no dependencies, no network. MIT · https://frontend.vedantsoni.com/hold
// The ES module also defines <baize-hold> (attributes: label, done, felt, ball, hold, size, reset, sound, disabled) and
// fires "confirm" (and "cancel" on an early release) on it.

export const FELTS = {
  green: "#33a05e",
  blue: "#3f83c5",
  red: "#b83c4a",
  purple: "#6b52c4",
  teal: "#178a84",
  slate: "#3f4a59",
};
// a standard set: 1–8 solids, 9–15 stripes of the same colours
export const BALL_COLORS = ["#f2c21b", "#2858c4", "#d7352c", "#5c2f92", "#ee7a21", "#1d8a4f", "#8a2531", "#151515"];
export const DEFAULTS = { label: "Hold to confirm", done: "Confirmed", felt: "green", ball: 8, hold: 1000, size: 88, reset: 1800, sound: false };
export const ATTRS = ["label", "done", "felt", "ball", "hold", "size", "reset", "sound", "disabled"];
export const RATIO = 4.6; // width = RATIO × height

const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d, a, b) => { const n = Number(v); return v !== "" && v != null && Number.isFinite(n) ? clamp(n, a, b) : d; };
const str = (v, d, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : d);
const bool = (v) => v === true || v === "" || v === "true" || v === "on" || v === 1;

export function normalize(c) {
  if (!c || typeof c !== "object") c = {};
  const f = typeof c.felt === "string" ? c.felt.trim().toLowerCase() : "";
  return {
    label: str(c.label, DEFAULTS.label, 40),
    done: str(c.done, DEFAULTS.done, 40),
    felt: FELTS[f] || HEX.test(f) ? f : DEFAULTS.felt,
    ball: Math.round(num(c.ball, DEFAULTS.ball, 1, 15)),
    hold: Math.round(num(c.hold, DEFAULTS.hold, 300, 5000)),
    size: Math.round(num(c.size, DEFAULTS.size, 32, 240)),
    reset: Math.round(num(c.reset, DEFAULTS.reset, 0, 20000)),
    sound: bool(c.sound),
  };
}

// ---- colour ----
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (a) => "#" + a.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
/** Mix a colour toward white (amt > 0) or black (amt < 0). */
export function shade(h, amt) {
  const t = amt < 0 ? 0 : 255, k = Math.abs(amt);
  return hex(rgb(h).map((v) => v + (t - v) * k));
}
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

/** The felt's palette: the bed, its lighter middle, the cushion band, the pressed-in words and their lit edge. */
export function feltPalette(felt) {
  const base = FELTS[felt] || (HEX.test(felt) ? felt.toLowerCase() : FELTS.green);
  const dark = lum(base) < 0.06;
  return {
    base,
    hi: shade(base, 0.1),
    lo: shade(base, -0.16),
    ink: dark ? shade(base, -0.45) : shade(base, -0.5),
    lit: shade(base, dark ? 0.16 : 0.24),
  };
}

/** What the object ball looks like: its colour, whether it's a stripe, and the ink of its number. */
export function ballLook(n) {
  const b = Math.round(clamp(Number(n) || 8, 1, 15));
  return { n: b, color: BALL_COLORS[(b - 1) % 8], stripe: b > 8 };
}

// ---- motion ----
const lerp = (a, b, t) => a + (b - a) * t;
const u = (t, a, d) => clamp((t - a) / d, 0, 1);
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const back = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
// a struck ball: fast off the cue, slowing, still rolling when it arrives (end speed = k × start speed)
// x(t) = a·t + (1−a)·t², so x(1) = 1 and x'(1) = k·x'(0)
export const rolling = (t, k) => { const a = 2 / (1 + k); return a * t + (1 - a) * t * t; };

/** Where everything is at time t (ms) of a full break. Pure, so it's tested without a browser. */
export function breakAt(t, g) {
  const HIT = 70, T1 = 330, T2 = 210, SINK = 150;
  const con = HIT + T1, drop = con + T2;
  const s = {};
  // the cue: thrust, follow through, then slide away
  s.cueX = t < HIT ? lerp(g.cueFrom, 0, easeIn(t / HIT)) : t < HIT + 90 ? lerp(0, 0.6, easeOut((t - HIT) / 90)) : lerp(0.6, -2.4, easeInOut(u(t, HIT + 170, 380)));
  s.cueOp = 1 - u(t, HIT + 230, 300);
  // the cue ball: rolls to the object ball, then a short stun
  s.ballX = t < HIT ? 0 : t < con ? g.L * rolling(u(t, HIT, T1), 0.4) : g.L + g.D * 0.08 * easeOut(u(t, con, 160));
  // the object ball: rolls into the pocket and drops
  s.objX = t < con ? 0 : g.M * rolling(u(t, con, T2), 0.75);
  const k = u(t, drop, SINK);
  s.objS = 1 - 0.38 * easeIn(k);
  s.objOp = 1 - easeIn(k);
  s.objDim = 1 - 0.65 * k;
  s.fill = 1;
  s.done = easeOut(u(t, drop + 40, 240));
  s.check = easeInOut(u(t, drop + 170, 300));
  s.events = { hit: HIT, clack: con, drop, end: drop + 520 };
  return s;
}

// ---- look ----
const NOISE = (freq, alpha, rgbv) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 ${rgbv} 0 0 0 0 ${rgbv} 0 0 0 0 ${rgbv} ${alpha} 0 0 0 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const GRAIN =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='140' preserveAspectRatio='none'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.0035 .2' numOctaves='3' seed='11'/%3E%3CfeColorMatrix values='0 0 0 0 .42 0 0 0 0 .24 0 0 0 0 .09 1.25 0 0 0 -.5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`;

export const CSS = `
:host { --h: 88px; display: inline-block; position: relative; font-size: calc(var(--h) / 10); width: ${RATIO * 10}em; max-width: 100%; height: 10em; vertical-align: middle; -webkit-tap-highlight-color: transparent; contain: layout style; }
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
.t { all: unset; box-sizing: border-box; position: absolute; inset: 0 0 .32em; display: block; border-radius: 3.3em; cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  background: ${GRAIN} 0 0 / 100% 100%, linear-gradient(180deg, #e2cba2 0%, #d6bb8c 38%, #c79f6c 78%, #b78a57 100%);
  box-shadow: 0 .32em 0 #a56f3c, 0 .32em 0 .03em #8d5a2c, 0 .7em 1.1em -.3em rgb(70 40 14 / .42), 0 1.6em 2.4em -1em rgb(0 0 0 / .26), inset 0 .1em 0 rgb(255 246 226 / .8), inset 0 -.12em .1em rgb(122 72 30 / .45);
  transition: transform .18s cubic-bezier(.2,.8,.2,1), filter .18s; }
.t:focus-visible { outline: .18em solid var(--felt); outline-offset: .3em; }
.t[aria-disabled="true"] { cursor: default; }
:host([disabled]) .t { cursor: not-allowed; filter: saturate(.35) opacity(.6); }
.dia { position: absolute; width: .44em; height: .44em; margin: -.22em 0 0 -.22em; transform: rotate(45deg); border-radius: .06em; background: #fbf6ea; box-shadow: 0 0 0 .05em rgb(120 78 36 / .55), 0 .06em .05em rgb(80 45 15 / .35); }
.felt { position: absolute; inset: 1.22em 1.3em 1.3em; border-radius: 2.15em; background: ${NOISE(".9", ".3", "0")}, var(--lo);
  box-shadow: 0 0 0 .07em rgb(255 240 214 / .7), 0 0 0 .15em rgb(118 70 28 / .38), inset 0 .32em .32em -.12em rgb(0 0 0 / .4), inset 0 0 0 .06em rgb(0 0 0 / .25); }
.bed { position: absolute; inset: .42em .44em; border-radius: 1.75em; background: ${NOISE(".95", ".22", "0")}, ${NOISE(".75", ".07", "1")}, radial-gradient(130% 160% at 50% 36%, var(--hi) 0%, var(--felt) 60%, var(--lo) 125%);
  box-shadow: 0 0 0 .06em rgb(0 0 0 / .2), inset 0 .14em .2em -.04em rgb(0 0 0 / .26), 0 .05em 0 .04em rgb(255 255 255 / .06); }
.lbl { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -54%); font: 800 2.2em/1.15 var(--baize-font, ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif); letter-spacing: -.012em; white-space: nowrap; pointer-events: none; will-change: opacity, filter; }
.ink { color: var(--ink); text-shadow: 0 .045em 0 var(--lit), 0 -.03em .02em rgb(0 0 0 / .22); }
.fill { position: absolute; inset: 0; color: #fff; text-shadow: 0 .04em .07em rgb(0 0 0 / .28); clip-path: inset(-.3em 100% -.3em -.3em); }
.done { color: #fff; text-shadow: 0 .04em .07em rgb(0 0 0 / .28); opacity: 0; }
.pocket { position: absolute; top: 50%; right: 1.2em; width: 4.5em; height: 4.5em; margin-top: -2.25em; border-radius: 50%; background: radial-gradient(circle at 50% 40%, #040404 0 56%, #121212 76%, #262626 100%);
  box-shadow: inset 0 .3em .45em #000, inset 0 -.1em .08em rgb(255 255 255 / .1), 0 .07em 0 .03em rgb(255 255 255 / .26), 0 -.06em .12em rgb(0 0 0 / .4); display: grid; place-items: center; }
.pocket svg { width: 52%; height: 52%; overflow: visible; }
.pocket path { fill: none; stroke: #fff; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 18; stroke-dashoffset: 18; }
.ball { position: absolute; top: 50%; width: 3em; height: 3em; margin: -1.5em 0 0 -1.5em; will-change: transform; }
.ball::before { content: ""; position: absolute; inset: 0; border-radius: 50%; box-shadow: .16em .3em .32em -.06em rgb(0 0 0 / .5), .05em .12em .08em rgb(0 0 0 / .25); }
.face { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; }
.gloss { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 33% 27%, rgb(255 255 255 / .95) 0 .2em, rgb(255 255 255 / .38) .55em, rgb(255 255 255 / 0) 1.05em), radial-gradient(circle at 44% 40%, rgb(0 0 0 / 0) 46%, rgb(0 0 0 / .34) 100%); }
.cue .face { background: radial-gradient(circle at 42% 36%, #fffefa 0%, #f3efe6 55%, #d6cfc1 100%); }
.dot { position: absolute; left: 50%; top: 50%; width: .44em; height: .44em; margin: -.22em; border-radius: 50%; background: #d3262f; }
.mark { position: absolute; left: 50%; top: 50%; width: 1.5em; height: 1.5em; margin: -.75em; border-radius: 50%; background: #fbf8ef; color: #141414; font: 800 .95em/1.58em var(--baize-font, ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif); text-align: center; letter-spacing: -.04em; }
.mark b { font: inherit; display: block; font-size: 1em; }
.cuew { position: absolute; z-index: 2; top: calc(1.22em + 3.55em - .32em); height: .64em; right: calc(100% - 4.05em); width: 24em; pointer-events: none; opacity: 0; will-change: transform, opacity; }
.stick, .stick-sh { position: absolute; inset: 0; clip-path: polygon(0 0, 100% 22%, 100% 78%, 0 100%); -webkit-mask-image: linear-gradient(to right, transparent 0, #000 55%); mask-image: linear-gradient(to right, transparent 0, #000 55%); }
.stick { background: linear-gradient(180deg, rgb(255 255 255 / .55), rgb(255 255 255 / 0) 42%, rgb(0 0 0 / .16)), linear-gradient(to left, #3d6fb0 0 .26em, #f6f1e6 .26em 1.25em, #c9b79a 1.25em 1.32em, #e8d5ad 1.32em, #dcc293 45%, #c9a46c 100%); }
.stick-sh { transform: translate(.15em, .62em); background: #000; opacity: .24; filter: blur(.2em); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .t { transition: none; } }
`;

const DIAMONDS = [0.236, 0.368, 0.5, 0.632, 0.764];
const MARKUP = `
<div class="cuew" aria-hidden="true"><i class="stick-sh"></i><i class="stick"></i></div>
<button class="t" type="button">
  ${DIAMONDS.map((x) => `<i class="dia" style="left:${x * 100}%;top:.62em"></i><i class="dia" style="left:${x * 100}%;top:calc(100% - .68em)"></i>`).join("")}
  <span class="felt"><span class="bed"></span>
    <span class="lbl main"><span class="ink"></span><span class="fill" aria-hidden="true"></span></span>
    <span class="lbl done" aria-hidden="true"></span>
    <span class="pocket"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.6l3.6 3.5L17.6 8.4"/></svg></span>
    <span class="ball obj" aria-hidden="true"><span class="face"><span class="mark"><b></b></span></span><span class="gloss"></span></span>
    <span class="ball cue" aria-hidden="true"><span class="face"><i class="dot"></i></span><span class="gloss"></span></span>
  </span>
</button>
<span class="sr" role="status" aria-live="polite"></span>`;

// ---- sound (synthesized, only when asked for) ----
let audio = null, noiseBuf = null;
function ctx() {
  if (audio) return audio;
  const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { audio = new AC(); } catch { return null; }
  noiseBuf = audio.createBuffer(1, audio.sampleRate * 0.2, audio.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return audio;
}
function blip(ac, at, { freq, to, dur, gain, type = "sine" }) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ac.destination); o.start(at); o.stop(at + dur + 0.02);
}
function hiss(ac, at, { dur, gain, f, q = 1, kind = "bandpass" }) {
  const s = ac.createBufferSource(), b = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; b.type = kind; b.frequency.value = f; b.Q.value = q;
  g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(b).connect(g).connect(ac.destination); s.start(at); s.stop(at + dur + 0.02);
}
export function play(kind) {
  const ac = ctx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  const t = ac.currentTime + 0.005;
  if (kind === "hit") { hiss(ac, t, { dur: 0.03, gain: 0.22, f: 2100, q: 0.9 }); blip(ac, t, { freq: 1150, dur: 0.035, gain: 0.07 }); }
  if (kind === "clack") { blip(ac, t, { freq: 2950, dur: 0.07, gain: 0.16 }); blip(ac, t, { freq: 4180, dur: 0.05, gain: 0.08 }); hiss(ac, t, { dur: 0.018, gain: 0.16, f: 3200, kind: "highpass" }); }
  if (kind === "drop") { blip(ac, t, { freq: 190, to: 62, dur: 0.17, gain: 0.32 }); hiss(ac, t + 0.03, { dur: 0.07, gain: 0.08, f: 520, kind: "lowpass" }); blip(ac, t + 0.09, { freq: 1500, dur: 0.03, gain: 0.03 }); }
  if (kind === "roll") hiss(ac, t, { dur: 0.32, gain: 0.025, f: 380, kind: "lowpass" });
}

// ---- the button ----
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * Mount a baize button into `host` (in its shadow root). Returns { set, reset, destroy, el }.
 * Fires "confirm" on the host when the ball drops (detail: { label, done }), "cancel" when someone lets go early.
 */
export function mount(host, opts = {}) {
  const root = host.shadowRoot || host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${CSS}</style>${MARKUP}`;
  const $ = (s) => root.querySelector(s);
  const btn = $(".t"), felt = $(".felt"), cuew = $(".cuew"), cue = $(".ball.cue"), dot = $(".dot"), obj = $(".ball.obj"), mark = $(".mark"),
    main = $(".lbl.main"), ink = $(".ink"), fill = $(".fill"), done = $(".lbl.done"), tick = $(".pocket path"), live = $(".sr");
  let o = normalize(opts);
  let onConfirm = typeof opts.onConfirm === "function" ? opts.onConfirm : null;
  let disabled = !!opts.disabled;

  // state: mode is idle | charge | release | break | done | rack
  const S = { mode: "idle", t0: 0, p: 0, spin: 1, cueX: -2.6, cueOp: 0, ballX: 0, objX: 0, objS: 1, objOp: 1, objDim: 1, fill: 0, done: 0, check: 0, from: null, fired: {} };
  let raf = 0, timer = 0, held = false, g = null;

  function apply() {
    const pal = feltPalette(o.felt);
    host.style.setProperty("--h", `${o.size}px`);
    for (const [k, v] of Object.entries({ felt: pal.base, hi: pal.hi, lo: pal.lo, ink: pal.ink, lit: pal.lit })) host.style.setProperty(`--${k}`, v);
    ink.textContent = fill.textContent = o.label;
    done.textContent = o.done;
    btn.setAttribute("aria-label", `${o.label} (press and hold)`);
    const b = ballLook(o.ball);
    const face = obj.querySelector(".face");
    face.style.background = b.stripe
      ? `linear-gradient(180deg, #f7f3ea 0 23%, ${b.color} 23% 77%, #f7f3ea 77%)`
      : `radial-gradient(circle at 42% 36%, ${shade(b.color, 0.22)} 0%, ${b.color} 58%, ${shade(b.color, -0.3)} 100%)`;
    mark.firstChild.textContent = String(b.n);
    mark.style.width = mark.style.height = b.n > 9 ? "1.62em" : "1.5em";
    mark.style.margin = b.n > 9 ? "-.81em" : "-.75em";
    mark.style.fontSize = b.n > 9 ? ".82em" : ".95em";
    mark.style.lineHeight = b.n > 9 ? "1.98em" : "1.58em";
    btn.toggleAttribute("disabled", disabled);
    layout();
    render();
  }

  // geometry in px, from the felt's real size
  function geo() {
    const em = o.size / 10;
    const W = felt.clientWidth || (RATIO * 10 - 2.6) * em;
    const D = 3 * em, cue0 = 4.3 * em, obj0 = W - 9.2 * em, pocket = W - 3.45 * em;
    return { em, W, D, cue0, obj0, pocket, L: obj0 - D - cue0, M: pocket - obj0 };
  }
  function layout() {
    const q = geo();
    cue.style.left = `${q.cue0}px`;
    obj.style.left = `${q.obj0}px`;
    // a button that's done keeps its cue ball against where the object ball was, whatever its new size
    if (S.mode === "done") { g = q; S.ballX = q.L + q.D * 0.08; }
  }

  function roll(dotEl, x, r, base) {
    const a = base + x / r, c = Math.cos(a);
    dotEl.style.transform = `translateX(${(Math.sin(a) * r * 0.78).toFixed(2)}px) scaleX(${Math.max(0, c).toFixed(3)})`;
    dotEl.style.opacity = c > 0.05 ? "1" : "0";
  }
  function render() {
    const r = (o.size / 10) * 1.5;
    cuew.style.transform = `translateX(${S.cueX.toFixed(3)}em)`;
    cuew.style.opacity = S.cueOp.toFixed(3);
    cue.style.transform = `translateX(${S.ballX.toFixed(2)}px)`;
    roll(dot, S.ballX * S.spin, r, -0.42);
    obj.style.transform = `translateX(${S.objX.toFixed(2)}px) scale(${S.objS.toFixed(3)})`;
    obj.style.opacity = S.objOp.toFixed(3);
    obj.style.filter = S.objDim < 1 ? `brightness(${S.objDim.toFixed(3)})` : "";
    roll(mark, S.objX, r, 0);
    fill.style.clipPath = `inset(-.3em ${((1 - S.fill) * 100).toFixed(2)}% -.3em -.3em)`;
    main.style.opacity = (1 - S.done).toFixed(3);
    main.style.filter = S.done > 0.01 ? `blur(${(S.done * 0.12).toFixed(3)}em)` : "";
    done.style.opacity = S.done.toFixed(3);
    done.style.filter = S.done < 0.99 && S.done > 0.01 ? `blur(${((1 - S.done) * 0.12).toFixed(3)}em)` : "";
    done.style.transform = `translate(-50%, -54%) scale(${(0.96 + S.done * 0.04).toFixed(3)})`;
    tick.style.strokeDashoffset = (18 * (1 - S.check)).toFixed(2);
    btn.setAttribute("aria-disabled", S.mode === "idle" || S.mode === "charge" ? "false" : "true");
  }

  const emit = (type, detail) => host.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  const go = (mode) => { S.mode = mode; S.t0 = now(); S.from = { ...S }; S.fired = {}; loop(); };
  const once = (k, fn) => { if (!S.fired[k]) { S.fired[k] = true; fn(); } };
  const sfx = (k) => { if (o.sound) { play(k); if (k === "clack" && navigator.vibrate) try { navigator.vibrate(10); } catch { /* fine */ } } };

  function loop() { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
  function frame() {
    const t = now() - S.t0, f = S.from;
    const calm = reduced();
    if (S.mode === "charge") {
      const inK = easeOut(u(t, 0, 170));
      S.p = u(t, 190, o.hold);
      S.cueOp = calm ? 0 : Math.max(f.cueOp, inK);
      S.cueX = lerp(-2.4, -0.25, inK) - easeOut(S.p) * 3.1;
      S.fill = S.p;
      if (S.p >= 1 && t >= 190 + o.hold + 60) return strike(1);
    } else if (S.mode === "cancel") {
      const k = easeOut(u(t, 0, 240));
      S.cueX = lerp(f.cueX, -3.4, k); S.cueOp = lerp(f.cueOp, 0, k); S.fill = lerp(f.fill, 0, k);
      if (k >= 1) return idle();
    } else if (S.mode === "weak") {
      // a soft shot: the ball rolls part of the way, stops, and rolls back to its spot
      const p = S.power, HIT = 60, out = 220 + 380 * p, wait = 200, home = 320 + 420 * p, d = g.L * 0.55 * p;
      S.cueX = t < HIT ? lerp(f.cueX, 0, easeIn(t / HIT)) : lerp(0.3, -2.6, easeInOut(u(t, HIT + 60, 360)));
      S.cueOp = calm ? 0 : t < HIT ? f.cueOp : 1 - u(t, HIT + 120, 260);
      if (t >= HIT) once("hit", () => sfx("hit"));
      S.ballX = calm ? 0 : t < HIT + out ? d * (1 - (1 - u(t, HIT, out)) ** 2) : d * (1 - easeInOut(u(t, HIT + out + wait, home)));
      S.fill = lerp(f.fill, 0, easeOut(u(t, HIT, 300)));
      if (t >= HIT + out + wait + home) return idle();
    } else if (S.mode === "break") {
      const s = breakAt(t, g);
      if (calm) {
        S.cueOp = 0; S.ballX = 0; S.objX = 0; S.fill = 1;
        S.objOp = S.objS = 1 - u(t, 0, 160); S.objDim = 1;
        S.done = u(t, 60, 200); S.check = u(t, 160, 200);
        if (t >= 160) once("drop", () => { sfx("drop"); fire(); });
        if (t >= 400) return settle();
      } else {
        Object.assign(S, { cueX: s.cueX, cueOp: s.cueOp, ballX: s.ballX, objX: s.objX, objS: s.objS, objOp: s.objOp, objDim: s.objDim, fill: 1, done: s.done, check: s.check });
        if (t >= s.events.hit) once("hit", () => sfx("hit"));
        if (t >= s.events.clack) once("clack", () => sfx("clack"));
        if (t >= s.events.drop) once("drop", () => { sfx("drop"); fire(); });
        if (t >= s.events.end) return settle();
      }
    } else if (S.mode === "rack") {
      // the cue ball rolls home, the words come back (white behind the ball), the object ball is racked again
      const k = easeInOut(u(t, 0, 640));
      S.ballX = calm ? 0 : lerp(f.ballX, 0, k);
      S.done = 1 - easeOut(u(t, 0, 200));
      S.check = 1 - u(t, 0, 160);
      S.fill = calm ? 1 - u(t, 0, 300) : fillAt(S.ballX);
      S.objX = 0; S.objDim = 1;
      const a = u(t, 260, 300);
      S.objS = calm ? 1 : lerp(0.4, 1, back(a)); S.objOp = easeOut(a);
      if (t >= 600) once("roll", () => {});
      if (t >= 660) { S.fill = 0; return idle(); }
    }
    render();
    raf = requestAnimationFrame(frame);
  }
  // during the rack, the words are white to the left of the cue ball
  let lab = null;
  function fillAt(x) {
    if (!lab) return 0;
    const c = g.cue0 + x;
    return clamp((c - lab.l) / lab.w, 0, 1);
  }

  function fire() {
    live.textContent = o.done;
    const detail = { label: o.label, done: o.done };
    emit("confirm", detail);
    if (onConfirm) try { onConfirm(detail); } catch (e) { console.error(e); }
  }
  function strike(power) {
    g = geo(); layout();
    if (power >= 1) {
      // roll a whole number of turns on the way down, so the red dot ends face up like it started
      const xe = g.L + g.D * 0.08, c = 2 * Math.PI * g.em * 1.5;
      S.spin = xe > 0 ? (Math.max(1, Math.round(xe / c)) * c) / xe : 1;
      g.cueFrom = S.cueX; go("break"); return;
    }
    S.spin = 1;
    S.power = power; go("weak");
  }
  function settle() {
    S.mode = "done"; Object.assign(S, { cueOp: 0, ballX: g.L + g.D * 0.08, objOp: 0, objS: 0.62, done: 1, check: 1, fill: 1 });
    render();
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    if (o.reset > 0) timer = setTimeout(rack, o.reset);
  }
  function rack() {
    clearTimeout(timer);
    if (S.mode !== "done") return;
    g = geo();
    const fr = felt.getBoundingClientRect(), lr = ink.getBoundingClientRect();
    const sx = fr.width ? felt.clientWidth / fr.width : 1;
    lab = { l: (lr.left - fr.left) * sx, w: Math.max(1, lr.width * sx) };
    live.textContent = "";
    go("rack");
  }
  function idle() {
    Object.assign(S, { mode: "idle", p: 0, cueX: -2.6, cueOp: 0, ballX: 0, objX: 0, objS: 1, objOp: 1, objDim: 1, fill: 0, done: 0, check: 0 });
    cancelAnimationFrame(raf);
    render();
  }

  function press() {
    if (disabled || S.mode !== "idle") return;
    held = true;
    if (o.sound) ctx(); // made inside the gesture, so it may play
    go("charge");
  }
  function release() {
    if (!held) return;
    held = false;
    if (S.mode !== "charge") return;
    if (S.p < 0.08) { go("cancel"); emit("cancel", { label: o.label }); return; }
    if (S.p < 1) { emit("cancel", { label: o.label }); strike(S.p); }
  }

  const down = (e) => { if (e.button !== 0) return; try { btn.setPointerCapture(e.pointerId); } catch { /* fine */ } press(); };
  const up = () => release();
  const key = (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); press(); } };
  const keyUp = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); release(); } };
  const menu = (e) => e.preventDefault();
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointercancel", up);
  btn.addEventListener("lostpointercapture", up);
  btn.addEventListener("keydown", key);
  btn.addEventListener("keyup", keyUp);
  btn.addEventListener("blur", up);
  btn.addEventListener("contextmenu", menu);
  btn.addEventListener("click", (e) => e.preventDefault());
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { if (S.mode === "idle" || S.mode === "done") { layout(); render(); } }) : null;
  ro?.observe(felt);

  apply();

  return {
    el: host,
    get state() { return S.mode; },
    set(next = {}) {
      if ("onConfirm" in next) onConfirm = typeof next.onConfirm === "function" ? next.onConfirm : null;
      if ("disabled" in next) disabled = !!next.disabled;
      o = normalize({ ...o, ...next });
      apply();
    },
    /** Put the balls back now (after a confirm with reset 0, or to cut the wait short). */
    reset() { if (S.mode === "done") rack(); },
    destroy() { cancelAnimationFrame(raf); clearTimeout(timer); ro?.disconnect(); root.innerHTML = ""; },
  };
}

// ---- <baize-hold> ----
if (typeof customElements !== "undefined" && typeof HTMLElement !== "undefined" && !customElements.get("baize-hold")) {
  const read = (el) => {
    const c = {};
    for (const a of ["label", "done", "felt", "ball", "hold", "size", "reset"]) if (el.hasAttribute(a)) c[a] = el.getAttribute(a);
    c.sound = el.hasAttribute("sound") && el.getAttribute("sound") !== "false";
    c.disabled = el.hasAttribute("disabled") && el.getAttribute("disabled") !== "false";
    return c;
  };
  customElements.define("baize-hold", class extends HTMLElement {
    static get observedAttributes() { return ATTRS; }
    connectedCallback() { if (!this.baize) this.baize = mount(this, read(this)); }
    attributeChangedCallback() { if (this.baize) this.baize.set(read(this)); }
    disconnectedCallback() { /* keep it: React and friends move nodes around */ }
    reset() { this.baize?.reset(); }
  });
}
