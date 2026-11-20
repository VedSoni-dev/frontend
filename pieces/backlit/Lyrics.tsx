"use client";
// The lyrics, ten ways. Every style gets the same facts (the lines, which one is being sung, how many of its words
// have landed, the cover's colours) and draws them its own way. Per-frame motion comes from CSS variables the player
// sets on the page every frame: --wp (how far through the word being sung, 0..1) and --lvl (how loud, 0..1).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Line } from "./lib/lrc";

export type StyleId = "thread" | "sing" | "poster" | "flash" | "neon" | "vinyl" | "scroll" | "cutout" | "film" | "drop";
export type Backdrop = "dark" | "haze";
export const STYLES: { id: StyleId; name: string; line: string; backdrop: Backdrop }[] = [
  { id: "thread", name: "Thread", line: "The song as a conversation, a bubble a line", backdrop: "dark" },
  { id: "sing", name: "Sing", line: "One big line that fills in as it's sung", backdrop: "dark" },
  { id: "poster", name: "Poster", line: "Every line set as a gig poster", backdrop: "dark" },
  { id: "flash", name: "Flash", line: "One word at a time, as big as it gets", backdrop: "dark" },
  { id: "neon", name: "Neon", line: "Tubes that buzz on as each word lands", backdrop: "dark" },
  { id: "vinyl", name: "Vinyl", line: "A record spinning, the words beside it", backdrop: "dark" },
  { id: "scroll", name: "Scroll", line: "The whole song gliding past your line", backdrop: "haze" },
  { id: "cutout", name: "Cutout", line: "Words cut from magazines, stuck on as sung", backdrop: "dark" },
  { id: "film", name: "Film", line: "Letterbox, grain and subtitles", backdrop: "haze" },
  { id: "drop", name: "Drop", line: "Words fall in and bounce into place", backdrop: "dark" },
];
export const isStyle = (s: unknown): s is StyleId => STYLES.some((x) => x.id === s);

export type LyricProps = {
  lines: Line[]; index: number; sung: number; colors: string[]; art: string | null;
  title: string; artist: string; playing: boolean; align: "left" | "center";
  now(): number; onSeek?(i: number): void;
};

// ---------- words: syllables joined back into words, each with the range of timed pieces it covers ----------
export type Group = { text: string; first: number; last: number };
export function groupsOf(l: Line | undefined): Group[] {
  if (!l?.text) return [];
  const toks = l.words?.length ? l.words.map((w) => w.text) : l.text.split(/(?<=\s)/);
  const spaced = toks.some((t, i) => i < toks.length - 1 && /\s$/.test(t)) || toks.some((t, i) => i > 0 && /^\s/.test(t));
  const out: Group[] = [];
  let cur: Group | null = null;
  toks.forEach((t, i) => {
    if (cur && (!spaced || /^\s/.test(t))) { if (cur.text.trim()) out.push({ ...cur, text: cur.text.trim() }); cur = null; }
    if (!cur) cur = { text: "", first: i, last: i };
    cur.text += t; cur.last = i;
    if (/\s$/.test(t) || i === toks.length - 1) { if (cur.text.trim()) out.push({ ...cur, text: cur.text.trim() }); cur = null; }
  });
  return out;
}
type St = "past" | "now" | "next";
const stOf = (g: Group, sung: number): St => (sung - 1 > g.last ? "past" : sung - 1 >= g.first ? "now" : "next");
const nowGroup = (gs: Group[], sung: number) => { let k = -1; gs.forEach((g, i) => { if (sung - 1 >= g.first) k = i; }); return k; };
const textLine = (lines: Line[], from: number, dir: 1 | -1) => { for (let i = from; i >= 0 && i < lines.length; i += dir) if (lines[i].text) return lines[i]; return undefined; };

// a small seeded random, so a line's cut-outs and tilts stay put on every frame
function rnd(seed: number) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** The words of a line as spans with their state: sung, being sung, still to come. */
function Words({ gs, sung, cls, style }: { gs: Group[]; sung: number; cls: string; style?: (g: Group, i: number) => CSSProperties }) {
  return <>{gs.map((g, i) => <span key={i}><span className={`${cls} ${stOf(g, sung)}`} style={style?.(g, i)}>{g.text}</span>{i < gs.length - 1 ? " " : ""}</span>)}</>;
}
const Dots = () => <span className="dots" aria-label="instrumental"><i /><i /><i /></span>;

export function Lyrics(p: LyricProps & { style: StyleId }) {
  const S = { thread: Thread, sing: Sing, poster: Poster, flash: Flash, neon: Neon, vinyl: Vinyl, scroll: Scroll, cutout: Cutout, film: Film, drop: Drop }[p.style] ?? Thread;
  return <div className={`st st-${p.style} ${p.align}`} key={p.style} aria-live="polite"><S {...p} /></div>;
}

// ---------- 1. Thread: a conversation, one bubble a line, the words typing themselves in ----------
function Thread({ lines, index, sung, title, artist, art }: LyricProps) {
  const side = (i: number) => (Math.floor(i / 2) % 2 ? "r" : "l");
  const shown: number[] = [];
  for (let i = index; i >= 0 && shown.length < 7; i--) if (lines[i].text || i === index) shown.unshift(i);
  return (
    <div className="th">
      <header className="th-head">
        <span className="th-av" style={art ? { backgroundImage: `url("${art}")` } : undefined} />
        <span><b>{title}</b><small>{artist}</small></span>
      </header>
      <div className="th-list">
        {index < 0 && <div className="th-row"><div className="th-in"><div className="th-b l tail typing"><Dots /></div></div></div>}
        {shown.map((i, k) => {
          const l = lines[i], age = shown.length - 1 - k, s = side(i);
          const nextShown = shown[k + 1];
          const tail = nextShown === undefined || side(nextShown) !== s;
          return (
            <div key={i} className="th-row" data-age={Math.min(age, 6)}>
              <div className="th-in">
                <div className={`th-b ${s}${tail ? " tail" : ""}${age === 0 ? " now" : ""}`}>
                  {!l.text ? <Dots /> : age === 0 ? <Words gs={groupsOf(l)} sung={sung} cls="tw" /> : l.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- 2. Sing: one big line, each word filling with light as it's sung ----------
function Sing({ lines, index, sung, title, artist }: LyricProps) {
  if (index < 0) return <div className="sg"><p className="sg-cur intro">{title}</p><p className="sg-next">{artist}</p></div>;
  const cur = lines[index], prev = textLine(lines, index - 1, -1), next = textLine(lines, index + 1, 1);
  return (
    <div className="sg">
      <p className="sg-prev" key={`p${index}`}>{prev?.text}</p>
      <p className="sg-cur" key={`c${index}`}>{cur.text ? <Words gs={groupsOf(cur)} sung={sung} cls="sw" /> : <Dots />}</p>
      <p className="sg-next" key={`n${index}`}>{next?.text}</p>
    </div>
  );
}

// ---------- 3. Poster: the line set in big condensed type, every row filling the width, words inking in ----------
function rowsOf(gs: Group[]): Group[][] {
  const total = gs.reduce((a, g) => a + g.text.length + 1, 0);
  const rows = Math.min(6, Math.max(1, Math.round(total / 9)));
  const target = total / rows;
  const out: Group[][] = []; let row: Group[] = [], len = 0;
  for (const g of gs) {
    if (row.length && len + g.text.length > target * 1.3 && out.length < 5) { out.push(row); row = []; len = 0; }
    row.push(g); len += g.text.length + 1;
  }
  if (row.length) out.push(row);
  return out;
}
function Poster({ lines, index, sung, title, artist, colors }: LyricProps) {
  const intro = index < 0;
  const cur = intro ? undefined : lines[index];
  const gs = useMemo(() => (intro ? groupsOf({ t: 0, text: `${title} ` }) : groupsOf(cur)), [intro, cur, title]);
  const rows = useMemo(() => rowsOf(gs), [gs]);
  const box = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<number[] | null>(null);
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => {
    // the poster face downloads on first use: measure again once it has
    const f = document.fonts; if (!f) return;
    const again = () => setFontsTick((n) => n + 1);
    void f.ready.then(again); f.addEventListener("loadingdone", again);
    return () => f.removeEventListener("loadingdone", again);
  }, []);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const fit = () => {
      const host = el.parentElement!.getBoundingClientRect();
      const tag = el.querySelector<HTMLElement>(".po-tag")?.offsetHeight ?? 40;
      const W = Math.min(host.width * 0.92, 1100), H = (host.height - tag) * 0.86;
      const ms = [...el.querySelectorAll<HTMLElement>(".po-measure > span")].map((s) => s.getBoundingClientRect().width || 1);
      let fs = ms.map((w) => (100 * W) / w);
      const total = fs.reduce((a, f) => a + f * 0.9, 0);
      if (total > H) fs = fs.map((f) => (f * H) / total);
      setSizes(fs.map((f) => Math.min(f, H * 0.62)));
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el.parentElement!);
    return () => ro.disconnect();
  }, [rows, fontsTick]);
  const ink = (r: number) => (r % 2 ? colors[(r >> 1) % colors.length] ?? "#fff" : "#fff");
  return (
    <div className="po" ref={box}>
      <div className="po-measure" aria-hidden="true">{rows.map((r, i) => <span key={i}>{r.map((g) => g.text).join(" ")}</span>)}</div>
      <div className="po-tag"><span>{artist}</span><span>{title}</span></div>
      <div className={`po-rows${sizes ? " fit" : ""}`} key={intro ? "intro" : index}>
        {cur && !cur.text ? <p className="po-row gap" style={{ fontSize: 160 }}>♪</p> : rows.map((r, ri) => (
          <p key={ri} className="po-row" style={{ fontSize: sizes?.[ri] ?? 60, "--ink": ink(ri) } as CSSProperties}>
            {intro ? <span className="pw past">{r.map((g) => g.text).join(" ")}</span> : <Words gs={r} sung={sung} cls="pw" />}
          </p>
        ))}
      </div>
    </div>
  );
}

// ---------- 4. Flash: one word at a time, filling the screen ----------
function Flash({ lines, index, sung, title, artist, colors }: LyricProps) {
  const cur = index >= 0 ? lines[index] : undefined;
  const gs = groupsOf(cur);
  const k = nowGroup(gs, sung);
  const word = index < 0 ? title : !cur?.text ? "" : k >= 0 ? gs[k].text : "";
  const prev = k > 0 ? gs[k - 1].text : (textLine(lines, index - 1, -1) && groupsOf(textLine(lines, index - 1, -1)).slice(-1)[0]?.text) || "";
  const seed = hashStr(`${index}:${k}`), r = rnd(seed);
  const color = [`#fff`, colors[0], "#fff", colors[1] ?? colors[0], colors[2] ?? "#fff"][seed % 5];
  const len = Math.max(3, [...word].length);
  return (
    <div className="fl">
      {prev && <span className="fl-ghost" key={`g${index}:${k}`} style={{ "--len": Math.max(3, [...prev].length) } as CSSProperties}>{prev}</span>}
      {word ? <span className="fl-word" key={`w${index}:${k}`} style={{ "--len": len, "--rot": `${(r() * 8 - 4).toFixed(1)}deg`, color } as CSSProperties}><span>{word}</span></span> : <Dots />}
      <p className="fl-line">{index < 0 ? artist : cur?.text ? <Words gs={gs} sung={sung} cls="fw" /> : null}</p>
    </div>
  );
}

// ---------- 5. Neon: the line as glass tubes that buzz on word by word ----------
function Neon({ lines, index, sung, title, artist, colors }: LyricProps) {
  const cur = index >= 0 ? lines[index] : undefined, next = textLine(lines, index + 1, 1);
  const nc = colors[Math.max(0, index) % Math.max(1, colors.length)] ?? "#ff3fae";
  return (
    <div className="ne" style={{ "--nc": nc } as CSSProperties}>
      <p className="ne-line" key={index}>
        {index < 0 ? <span className="nw past">{title}</span> : cur?.text ? <Words gs={groupsOf(cur)} sung={sung} cls="nw" /> : <Dots />}
      </p>
      <p className="ne-next">{index < 0 ? artist : next?.text}</p>
    </div>
  );
}

// ---------- 6. Vinyl: the record turning, its label the cover, the words beside it ----------
function Vinyl({ lines, index, sung, title, artist, art, playing }: LyricProps) {
  const cur = index >= 0 ? lines[index] : undefined;
  const prev = textLine(lines, index - 1, -1), next = textLine(lines, index + 1, 1);
  const ring = `${title} · ${artist} · `.toUpperCase();
  return (
    <div className="vy">
      <div className={`vy-rec${playing ? " on" : ""}`}>
        <div className="vy-disc">
          <svg className="vy-ring" viewBox="0 0 100 100" aria-hidden="true">
            <defs><path id="vy-path" d="M50,50 m-21.5,0 a21.5,21.5 0 1,1 43,0 a21.5,21.5 0 1,1 -43,0" /></defs>
            <text><textPath href="#vy-path" textLength="134" lengthAdjust="spacing">{ring.repeat(Math.max(1, Math.round(60 / ring.length)))}</textPath></text>
          </svg>
          <div className="vy-label" style={art ? { backgroundImage: `url("${art}")` } : undefined}><i /></div>
        </div>
        <div className="vy-sheen" />
        <div className="vy-arm"><i /></div>
      </div>
      <div className="vy-words">
        <p className="vy-prev" key={`p${index}`}>{prev?.text}</p>
        <p className="vy-cur" key={`c${index}`}>{index < 0 ? <span className="vw past">{title}</span> : cur?.text ? <Words gs={groupsOf(cur)} sung={sung} cls="vw" /> : <Dots />}</p>
        <p className="vy-next" key={`n${index}`}>{index < 0 ? artist : next?.text}</p>
      </div>
    </div>
  );
}

// ---------- 7. Scroll: the whole song, gliding so the line being sung sits in focus ----------
function Scroll({ lines, index, sung, onSeek, title, artist }: LyricProps) {
  const list = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const ol = list.current; if (!ol) return;
    const place = () => {
      const li = ol.children[index + 1] as HTMLElement | undefined; // child 0 is the title
      const host = ol.parentElement!.clientHeight;
      const y = li ? li.offsetTop + li.offsetHeight / 2 : 0;
      ol.style.transform = `translateY(${Math.round(host * 0.42 - y)}px)`;
    };
    place();
    const ro = new ResizeObserver(place); ro.observe(ol.parentElement!);
    return () => ro.disconnect();
  }, [index, lines]);
  return (
    <div className="sc">
      <ol ref={list} className="sc-list">
        <li className={`sc-l head${index < 0 ? " on" : ""}`} style={{ "--d": Math.min(6, index + 1) } as CSSProperties}><b>{title}</b><small>{artist}</small></li>
        {lines.map((l, i) => {
          const d = Math.min(6, Math.abs(i - index));
          return (
            <li key={i} className={`sc-l${i === index ? " on" : ""}${l.text ? "" : " gap"}`} style={{ "--d": d } as CSSProperties} onClick={onSeek && l.text ? () => onSeek(i) : undefined}>
              {!l.text ? <Dots /> : i === index ? <Words gs={groupsOf(l)} sung={sung} cls="cw" /> : l.text}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------- 8. Cutout: every word a scrap cut from a magazine, stuck on as it's sung ----------
const FONTS = ["f-anton", "f-serif", "f-mono", "f-marker", "f-wide", "f-round"];
function Cutout({ lines, index, sung, title, colors }: LyricProps) {
  const cur = index >= 0 ? lines[index] : undefined;
  const gs = index < 0 ? groupsOf({ t: 0, text: `${title} ` }) : groupsOf(cur);
  const papers = ["#f3eee3", "#111111", colors[0] ?? "#ff3fae", "#ffe14d", colors[1] ?? "#7b3dff", "#f3eee3"];
  const scrap = (g: Group, i: number): CSSProperties => {
    const r = rnd(hashStr(`${index}|${i}|${g.text}`));
    const bg = papers[Math.floor(r() * papers.length)];
    const dark = bg === "#111111" || lum(bg) < 0.45;
    return { "--bg": bg, "--fg": dark ? "#fff" : "#141414", "--rot": `${(r() * 12 - 6).toFixed(1)}deg`, "--sc": (0.85 + r() * 0.55).toFixed(2), "--dy": `${(r() * 0.3 - 0.15).toFixed(2)}em` } as CSSProperties;
  };
  return (
    <div className="cu" key={index}>
      {cur && !cur.text ? <Dots /> : (
        <p className="cu-line">
          {gs.map((g, i) => {
            const r = rnd(hashStr(`f${index}|${i}`));
            const st = index < 0 ? "past" : stOf(g, sung);
            const txt = r() < 0.35 ? g.text.toUpperCase() : g.text;
            return <span key={i} className={`cs ${st} ${FONTS[Math.floor(r() * FONTS.length)]}${r() < 0.3 ? " taped" : ""}`} style={scrap(g, i)}><span>{txt}</span></span>;
          })}
        </p>
      )}
    </div>
  );
}
function lum(hex: string) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }

// ---------- 9. Film: letterbox, grain, the cover as the picture, subtitles ----------
function Film({ lines, index, sung, title, artist, art, colors, now }: LyricProps) {
  const tc = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = Math.max(0, now()), f = Math.floor((t % 1) * 24);
      if (tc.current) tc.current.textContent = `${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor(t / 60) % 60).padStart(2, "0")}:${String(Math.floor(t) % 60).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [now]);
  const cur = index >= 0 ? lines[index] : undefined;
  return (
    <div className="fm">
      <div className="fm-plate" style={art ? { backgroundImage: `url("${art}")` } : { background: `linear-gradient(120deg, ${colors.join(", ")})` }} />
      <div className="fm-grain" />
      <div className="fm-bar top"><span ref={tc}>00:00:00:00</span><span>{title}{artist ? ` — ${artist}` : ""}</span></div>
      <div className="fm-bar bot" />
      {index < 0 ? (
        <div className="fm-title" key="t"><small>a song by {artist || "someone"}</small><h2>{title}</h2></div>
      ) : (
        <p className="fm-sub" key={index}>{cur?.text ? <Words gs={groupsOf(cur)} sung={sung} cls="mw" /> : <i>[music]</i>}</p>
      )}
    </div>
  );
}

// ---------- 10. Drop: words fall from the top and bounce into their place ----------
function Drop({ lines, index, sung, title, colors }: LyricProps) {
  const cur = index >= 0 ? lines[index] : undefined;
  const gs = index < 0 ? groupsOf({ t: 0, text: `${title} ` }) : groupsOf(cur);
  return (
    <div className="dr" key={index}>
      {cur && !cur.text ? <Dots /> : (
        <p className="dr-line">
          {gs.map((g, i) => {
            const r = rnd(hashStr(`d${index}|${i}`));
            const st = index < 0 ? "past" : stOf(g, sung);
            const ink = i % 3 === 1 ? colors[0] : i % 3 === 2 ? colors[1] ?? "#fff" : "#fff";
            return <span key={i} className={`dw ${st}`} style={{ "--ink": ink, "--r": `${(r() * 30 - 15).toFixed(0)}deg`, "--i": i } as CSSProperties}><span>{g.text}</span></span>;
          })}
        </p>
      )}
    </div>
  );
}

/** Each style's card in the style picker: its name drawn the way the style draws words. */
export function Swatch({ id }: { id: StyleId }): ReactNode {
  switch (id) {
    case "thread": return <span className="sw-thread"><i className="l">hey</i><i className="r">sing it</i></span>;
    case "sing": return <span className="sw-sing">sing <em>it</em></span>;
    case "poster": return <span className="sw-poster"><b>LOUD</b><b>ER</b></span>;
    case "flash": return <span className="sw-flash">WOW</span>;
    case "neon": return <span className="sw-neon">neon</span>;
    case "vinyl": return <span className="sw-vinyl"><i /></span>;
    case "scroll": return <span className="sw-scroll"><i>the line before</i><b>this one</b><i>the next one</i></span>;
    case "cutout": return <span className="sw-cutout"><i>CUT</i><i>it</i><i>OUT</i></span>;
    case "film": return <span className="sw-film"><em>and it goes like this</em></span>;
    case "drop": return <span className="sw-drop"><i>d</i><i>r</i><i>o</i><i>p</i></span>;
  }
}
