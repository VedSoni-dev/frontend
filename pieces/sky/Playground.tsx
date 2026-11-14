"use client";
// cirrus: the page. A live sky across the top, a placeholder homepage card sitting in it, and a small panel to tune the
// sky and take it home (HTML for any site, Sky.tsx for React, a whole .html page, or a PNG wallpaper). No AI, no uploads.
import { useEffect, useRef, useState } from "react";
import { DEFAULTS, mount, normalize, PALETTES, type Sky, type SkyConfig, type SkyTime } from "./cirrus.js";
import { htmlPage, htmlSnippet, reactFile, attrs } from "./exportCode";
import { loadConfig, saveConfig } from "./store";

const POST = "https://x.com/unvalley_/status/2121293930641997992";
const TIME_LABEL: Record<SkyTime, string> = { dawn: "Dawn", noon: "Noon", dusk: "Dusk", night: "Night" };

export default function Playground() {
  const skyEl = useRef<HTMLDivElement>(null);
  const sky = useRef<Sky | null>(null);
  const [c, setC] = useState<SkyConfig>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [howto, setHowto] = useState(false);
  const [note, setNote] = useState("");
  const [fallback, setFallback] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);

  // load the saved / linked sky, then mount the engine once
  useEffect(() => {
    const start = loadConfig();
    setC(start); setReady(true);
    if (skyEl.current) sky.current = mount(skyEl.current, start);
    return () => { sky.current?.destroy(); sky.current = null; };
  }, []);
  useEffect(() => { if (!ready) return; sky.current?.set(c); saveConfig(c); }, [c, ready]);
  useEffect(() => { if (!note) return; const id = setTimeout(() => setNote(""), 2600); return () => clearTimeout(id); }, [note]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, select");
      if (e.key === "Escape") setOpen(false);
      else if (!typing && !e.metaKey && !e.ctrlKey && (e.key === "t" || e.key === "T")) setOpen((v) => !v);
    };
    addEventListener("keydown", key); return () => removeEventListener("keydown", key);
  }, []);

  const set = <K extends keyof SkyConfig>(k: K, v: SkyConfig[K]) => setC((p) => normalize({ ...p, [k]: v }));

  async function engine() { const r = await fetch("/sky/cirrus.js"); if (!r.ok) throw new Error(String(r.status)); return r.text(); }
  async function put(text: string, done: string) {
    try { await navigator.clipboard.writeText(text); setNote(done); } catch { setFallback(text); }
  }
  async function copy(kind: "html" | "react") {
    try {
      const src = await engine();
      await put(kind === "html" ? htmlSnippet(src, c) : reactFile(src, c), kind === "html" ? "Copied the HTML with your sky" : "Copied Sky.tsx with your sky");
    } catch { setNote("Couldn't fetch the engine. Open /sky/cirrus.js instead."); }
  }
  function save(blob: Blob, name: string) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function page() {
    try {
      const p = PALETTES[c.time];
      save(new Blob([htmlPage(await engine(), c, p.page, c.time === "night" ? "#e4e9f7" : "#16202c")], { type: "text/html" }), "sky.html");
      setNote("Downloaded sky.html");
    } catch { setNote("Couldn't build the page. Try again."); }
  }
  async function png(w: number, h: number) {
    try {
      const b = await sky.current?.toPNG(w, h);
      if (!b) throw new Error("none");
      save(b, `sky-${c.time}-${w}x${h}.png`); setNote(`Saved a ${w}×${h} PNG`);
    } catch { setNote("Your browser couldn't make the PNG. Try the screen size."); }
  }
  const screenSize = () => {
    const d = Math.min(3, typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
    return [Math.round(screen.width * d), Math.round(screen.height * d)] as const;
  };

  return (
    <div className="sk" data-time={c.time} onPointerMove={() => !moved && setMoved(true)}>
      <section className="sk-sky" ref={skyEl} aria-label="A live sky drawn in characters" />
      <header className="sk-top">
          <div className="sk-corner">
            <span className="sk-brand"><Mark /> cirrus</span>
            <h1 className="sk-title">A sky of tiny characters for the top of your homepage</h1>
            <p className="sk-credit">after <a href={POST} target="_blank" rel="noreferrer">unvalley&apos;s blue sky study</a> · free, MIT · <a href="/">All pieces</a></p>
          </div>

          <p className={`sk-hint${moved || open ? " sk-gone" : ""}`} aria-hidden="true">
            <span className="sk-fine">move through the sky</span>
            <span className="sk-touch">drag sideways through the sky</span>
          </p>

          <div className="sk-panel">
            <div className="sk-dock">
              <button className="sk-chip" aria-expanded={open} aria-controls="sk-tune" onClick={() => setOpen((v) => !v)}>
                {open ? "Close" : "Make it yours"}
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d={open ? "M3 7.5l3-3 3 3" : "M3 4.5l3 3 3-3"} /></svg>
              </button>
              <button className="sk-chip sk-primary" onClick={() => copy("html")}>Copy code</button>
            </div>
            <p className="sk-note" role="status">{note}</p>
            {open && (
              <div className="sk-body" id="sk-tune">
                <section className="sk-sec">
                  <h2><i>1</i>Time of day</h2>
                  <div className="sk-seg sk-seg4" role="radiogroup" aria-label="Time of day">
                    {(Object.keys(TIME_LABEL) as SkyTime[]).map((t) => (
                      <button key={t} role="radio" aria-checked={c.time === t} className={c.time === t ? "sk-on" : ""} onClick={() => set("time", t)}>
                        <i className="sk-sw" style={{ background: `linear-gradient(${PALETTES[t].sky[0]}, ${PALETTES[t].sky[3]})` }} />{TIME_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </section>
                <section className="sk-sec">
                  <h2><i>2</i>The sky</h2>
                  <Range label="Cloud cover" value={c.cover} min={0} max={1} step={0.05} onChange={(v) => set("cover", v)} reset={DEFAULTS.cover} />
                  <Range label="Wind (trail length)" value={c.wind} min={0} max={1} step={0.05} onChange={(v) => set("wind", v)} reset={DEFAULTS.wind} />
                  <Range label="Drift speed" value={c.speed} min={0} max={1} step={0.05} onChange={(v) => set("speed", v)} reset={DEFAULTS.speed} />
                  <Range label="Cell size" value={c.cell} min={6} max={16} step={1} show={(v) => `${v}px`} onChange={(v) => set("cell", v)} reset={DEFAULTS.cell} />
                  <div className="sk-seg" role="radiogroup" aria-label="Characters">
                    {(["ascii", "dots", "blocks"] as const).map((g) => (
                      <button key={g} role="radio" aria-checked={c.glyphs === g} className={c.glyphs === g ? "sk-on" : ""} onClick={() => set("glyphs", g)}>
                        <code>{g === "ascii" ? "(:o8" : g === "dots" ? "·•●" : "░▒▓"}</code>{g === "ascii" ? "Type" : g === "dots" ? "Dots" : "Blocks"}
                      </button>
                    ))}
                  </div>
                  <div className="sk-toggles">
                    <Toggle label="Wind trail" on={c.trail} onChange={(v) => set("trail", v)} />
                    <Toggle label="Ghost gust" on={c.gust} onChange={(v) => set("gust", v)} />
                    <Toggle label="Fade into page" on={c.fade} onChange={(v) => set("fade", v)} />
                  </div>
                  <div className="sk-actions sk-two">
                    <button onClick={() => set("seed", Math.floor(Math.random() * 1e6))}>New clouds</button>
                    <button onClick={() => setC(normalize(null))}>Reset all</button>
                  </div>
                </section>
                <section className="sk-sec">
                  <h2><i>3</i>Take it home</h2>
                  <p className="sk-sub">One file, your settings baked in, no dependencies, no network calls.</p>
                  <div className="sk-actions sk-two">
                    <button onClick={() => copy("html")}>Copy HTML</button>
                    <button onClick={() => copy("react")}>Copy Sky.tsx</button>
                    <button onClick={page}>Download .html</button>
                    <button onClick={() => { const [w, h] = screenSize(); png(w, h); }}>PNG for this screen</button>
                  </div>
                  <button className="sk-link" onClick={() => png(3840, 2160)}>or a 3840×2160 wallpaper</button>
                  <button className="sk-link" onClick={() => setHowto((h) => !h)} aria-expanded={howto}>
                    How to use it on your site <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>
                  </button>
                  {howto && (
                    <div className="sk-howto">
                      <ol>
                        <li><b>Any site:</b> Copy HTML and paste it where the sky goes (top of <code>&lt;body&gt;</code>). Change <code>height:45vh</code> to taste.</li>
                        <li><b>React / Next.js:</b> Copy Sky.tsx, save it, and render <code>{`<Sky style={{ height: "45vh" }} />`}</code> above your content. Props override the baked settings, e.g. <code>time=&quot;night&quot;</code>.</li>
                        <li><b>Or link it:</b> <code>{`<script type="module" src="https://frontend.vedantsoni.com/sky/cirrus.js"></script>`}</code> and <code>{`<cirrus-sky ${attrs(c)}>`}</code>.</li>
                        <li>This page&apos;s address keeps your settings: bookmark it to come back to this sky.</li>
                      </ol>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
      </header>

      <main className="sk-card">
        <div className="sk-card-in">
          <p className="sk-kicker">placeholder homepage · yours goes here</p>
          <h2 className="sk-name">Your Name</h2>
          <p className="sk-bio">Designer and developer in a small, sunny town. I make quiet tools for the web and write about how they work.</p>
          <div className="sk-cols">
            <div>
              <h3>Now</h3>
              <ul><li>Building a tiny weather app</li><li>Reading about cloud types</li><li>Learning to draw with type</li></ul>
            </div>
            <div>
              <h3>Elsewhere</h3>
              <ul><li><a href="#" onClick={(e) => e.preventDefault()}>Notes</a></li><li><a href="#" onClick={(e) => e.preventDefault()}>Projects</a></li><li><a href="#" onClick={(e) => e.preventDefault()}>Email</a></li></ul>
            </div>
          </div>
          <p className="sk-foot">Sky: cirrus, after <a href={POST} target="_blank" rel="noreferrer">unvalley&apos;s blue sky study</a>. Free and open source, <a href="https://github.com/VedSoni-dev/frontend/tree/main/pieces/sky" target="_blank" rel="noreferrer">code on GitHub</a>.</p>
        </div>
      </main>

      {fallback !== null && (
        <div className="sk-dialog" role="dialog" aria-label="Select and copy">
          <p>Your browser blocked the clipboard. Select all and copy:</p>
          <textarea readOnly value={fallback} onFocus={(e) => e.currentTarget.select()} autoFocus />
          <button onClick={() => setFallback(null)}>Done</button>
        </div>
      )}
    </div>
  );
}

function Range({ label, value, min, max, step, onChange, reset, show }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; reset: number; show?: (v: number) => string }) {
  return (
    <div className="sk-range">
      <label>
        <span>{label}</span>
        <output>{show ? show(value) : value.toFixed(2)}</output>
        {value !== reset && <button type="button" className="sk-reset" onClick={() => onChange(reset)} aria-label={`Reset ${label}`}>reset</button>}
      </label>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} style={{ ["--v" as string]: `${((value - min) / (max - min)) * 100}%` }} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="sk-toggle" onClick={() => onChange(!on)}>
      <i aria-hidden="true" />{label}
    </button>
  );
}

// our own mark: a cloud made of three dots over a slash of wind
const Mark = () => (
  <svg viewBox="0 0 16 16" className="sk-mark" aria-hidden="true"><circle cx="5" cy="7" r="2.2" fill="currentColor" /><circle cx="8.5" cy="5.5" r="2.8" fill="currentColor" /><circle cx="11.8" cy="7.4" r="2" fill="currentColor" /><path d="M4 13l2-3M8 13l2-3M12 13l2-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
);
