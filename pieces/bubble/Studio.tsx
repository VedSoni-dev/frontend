"use client";
// suds: the page. Your footer at the bottom, live; the controls above it change the word, links and the bubble.
// Copy component gives Suds.tsx with your settings; the embed is one script tag and <suds-footer>. No AI, no uploads.
import { useEffect, useRef, useState } from "react";
import Suds, { SUDS_DEFAULTS, type SudsColumn, type SudsOptions } from "./Suds";

const POST = "https://x.com/alexmarin/status/2121270486214521306";
const KEY = "suds:v1";

function colsToText(cols: SudsColumn[]) {
  return cols.map((c) => `${c.title}: ${c.links.map((l) => (l.href && l.href !== "#" ? `${l.label} = ${l.href}` : l.label)).join(", ")}`).join("\n");
}
function textToCols(t: string): SudsColumn[] {
  return t.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 6).map((line) => {
    const i = line.indexOf(":");
    const title = i >= 0 ? line.slice(0, i).trim() : line;
    const rest = i >= 0 ? line.slice(i + 1) : "";
    const links = rest.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12).map((x) => {
      const [label, href] = x.split("=").map((y) => y.trim());
      return { label, href: href || "#" };
    });
    return { title, links };
  });
}
function props(o: SudsOptions) {
  const r = (n: number) => Math.round(n * 100) / 100;
  return `word=${JSON.stringify(o.word)} theme="${o.theme}" size={${r(o.size)}} refraction={${r(o.refraction)}} wobble={${r(o.wobble)}} hue={${r(o.hue)}}`;
}
function embed(o: SudsOptions) {
  const r = (n: number) => Math.round(n * 100) / 100;
  const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<script src="https://frontend.vedantsoni.com/bubble/suds.js" defer></script>
<suds-footer word="${attr(o.word)}" theme="${o.theme}" size="${r(o.size)}" refraction="${r(o.refraction)}" wobble="${r(o.wobble)}" hue="${r(o.hue)}">
  <script type="application/json">${JSON.stringify(o.columns).replace(/</g, "\\u003c")}</script>
</suds-footer>`;
}

export default function Studio() {
  const [o, setO] = useState<SudsOptions>(SUDS_DEFAULTS);
  const [linksText, setLinksText] = useState(colsToText(SUDS_DEFAULTS.columns));
  const [open, setOpen] = useState(false);
  const [howto, setHowto] = useState(false);
  const [note, setNote] = useState("");
  const [fallback, setFallback] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = { ...SUDS_DEFAULTS, ...(JSON.parse(raw) as Partial<SudsOptions>) };
        setO(s); setLinksText(colsToText(s.columns));
      }
    } catch { /* storage blocked: start from the defaults */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", esc); return () => removeEventListener("keydown", esc);
  }, [open]);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* fine */ } }, [o]);
  useEffect(() => { if (!note) return; const id = setTimeout(() => setNote(""), 2600); return () => clearTimeout(id); }, [note]);
  useEffect(() => { document.documentElement.dataset.theme = o.theme; }, [o.theme]);

  const set = <K extends keyof SudsOptions>(k: K, v: SudsOptions[K]) => setO((p) => ({ ...p, [k]: v }));

  async function put(text: string, done: string) {
    try { await navigator.clipboard.writeText(text); setNote(done); } catch { setFallback(text); }
  }
  async function copyComponent() {
    try {
      const src = await (await fetch("/bubble/Suds.tsx")).text();
      const cols = JSON.stringify(o.columns, null, 2);
      const text = `// Suds.tsx: save this file in your React app (Next.js, Vite, Remix...) and render your footer:\n//   <Suds ${props(o)} columns={COLUMNS} />\n// Needs React 18+. Uses WebGL where it can, a CSS bubble where it can't. MIT.\n// Your link columns:\n//   const COLUMNS = ${cols.replace(/\n/g, "\n//   ")};\n${src}`;
      await put(text, "Copied Suds.tsx with your settings");
    } catch { setNote("Couldn't fetch the file. Open /bubble/Suds.tsx instead."); }
  }

  return (
    <div className="bb" onPointerMove={() => !moved && setMoved(true)}>
      <header className="bb-top">
        <div className="bb-corner">
          <span className="bb-brand"><Mark /> suds</span>
          <h1 className="bb-title">A glass bubble over your footer&apos;s wordmark</h1>
          <p className="bb-credit">after <a href={POST} target="_blank" rel="noreferrer">Alex Marin&apos;s footer</a> · free, MIT · <a href="/">All pieces</a></p>
        </div>

        <p className={`bb-hint${moved || open ? " bb-gone" : ""}`} aria-hidden="true">
          <span className="bb-fine">move your cursor across the word</span>
          <span className="bb-touch">drag your finger across the word</span>
        </p>

        <div className="bb-panel">
          <div className="bb-dock">
            <button className="bb-chip" aria-expanded={open} aria-controls="bb-tune" onClick={() => setOpen((v) => !v)}>
              {open ? "Close" : "Make it yours"}
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d={open ? "M3 7.5l3-3 3 3" : "M3 4.5l3 3 3-3"} /></svg>
            </button>
            <button className="bb-chip bb-primary" onClick={copyComponent}>Copy component</button>
          </div>
          <p className="bb-note" role="status">{note}</p>
          {open && (
            <div className="bb-body" id="bb-tune">
              <section className="bb-sec">
                <h2><i>1</i>Your word</h2>
                <label className="bb-field"><span className="bb-sr">Your word</span>
                  <input value={o.word} maxLength={24} onChange={(e) => set("word", e.target.value)} placeholder={SUDS_DEFAULTS.word} spellCheck={false} />
                </label>
                <div className="bb-seg" role="radiogroup" aria-label="Theme">
                  {(["dark", "light"] as const).map((t) => (
                    <button key={t} role="radio" aria-checked={o.theme === t} className={o.theme === t ? "bb-on" : ""} onClick={() => set("theme", t)}>
                      <i className={`bb-sw bb-sw-${t}`} />{t === "dark" ? "Dark" : "Light"}
                    </button>
                  ))}
                </div>
              </section>
              <section className="bb-sec">
                <h2><i>2</i>The bubble</h2>
                <Range label="Size" value={o.size} min={0.5} max={1.6} step={0.05} show={(v) => `${v.toFixed(2)}×`} onChange={(v) => set("size", v)} reset={SUDS_DEFAULTS.size} />
                <Range label="Refraction" value={o.refraction} min={0} max={1} step={0.05} onChange={(v) => set("refraction", v)} reset={SUDS_DEFAULTS.refraction} />
                <Range label="Wobble" value={o.wobble} min={0} max={1} step={0.05} onChange={(v) => set("wobble", v)} reset={SUDS_DEFAULTS.wobble} />
                <Range label="Rim hue" value={o.hue} min={0} max={1} step={0.01} hue onChange={(v) => set("hue", v)} reset={SUDS_DEFAULTS.hue} />
              </section>
              <section className="bb-sec">
                <h2><i>3</i>Links</h2>
                <label className="bb-field"><span>One column per line: <code>Title: Link, Link = /url</code></span>
                  <textarea rows={4} value={linksText} spellCheck={false} onChange={(e) => { setLinksText(e.target.value); set("columns", textToCols(e.target.value)); }} />
                </label>
              </section>
              <section className="bb-sec">
                <h2><i>4</i>Take it home</h2>
                <p className="bb-sub">Copy component gives you Suds.tsx for React with these settings. For any other site, copy the embed.</p>
                <div className="bb-actions">
                  <button onClick={() => put(embed(o), "Copied the embed snippet")}>Copy embed (any site)</button>
                </div>
                <button className="bb-link" onClick={() => setHowto((h) => !h)} aria-expanded={howto}>
                  How to use it on your site <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>
                </button>
                {howto && (
                  <div className="bb-howto">
                    <ol>
                      <li><b>React:</b> Copy component, save it as <code>Suds.tsx</code>, then put <code>{`<Suds ${props(o)} columns={COLUMNS} />`}</code> at the bottom of your layout. Your columns are pasted at the top of the file.</li>
                      <li><b>Any site:</b> Copy embed and paste it where your footer goes. The script is public, has no dependencies and calls nothing.</li>
                      <li>It uses your page&apos;s font. Set <code>font-family</code> on the footer to change it.</li>
                    </ol>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </header>

      <Suds {...o} />

      {fallback !== null && (
        <div className="bb-card" role="dialog" aria-label="Select and copy">
          <p>Your browser blocked the clipboard. Select all and copy:</p>
          <textarea readOnly value={fallback} onFocus={(e) => e.currentTarget.select()} autoFocus />
          <button onClick={() => setFallback(null)}>Done</button>
        </div>
      )}
    </div>
  );
}

function Range({ label, value, min, max, step, onChange, reset, show, hue }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; reset: number; show?: (v: number) => string; hue?: boolean }) {
  return (
    <div className={`bb-range${hue ? " bb-hue" : ""}`}>
      <label>
        <span>{label}</span>
        <output>{show ? show(value) : value.toFixed(2)}</output>
        {value !== reset && <button type="button" className="bb-reset" onClick={() => onChange(reset)} aria-label={`Reset ${label}`}>reset</button>}
      </label>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} style={{ ["--v" as string]: `${((value - min) / (max - min)) * 100}%` }} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

// our own mark: a bubble with a highlight
const Mark = () => (
  <svg viewBox="0 0 16 16" className="bb-mark" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="5.8" cy="5.6" r="1.4" fill="currentColor" /></svg>
);
