"use client";
// loam: the page. The planter fills the screen; a small corner card, a hint, and a panel to choose the flowers, the
// weather and the planter, then take it home (<loam-meadow> HTML, Meadow.tsx, a CDN tag, a PNG) or keep it full screen
// as a desk plant. No AI, no uploads.
import { useEffect, useRef, useState } from "react";
import { DEFAULTS, FLOWERS, GROUNDS, mount, normalize, PLANTERS, type Flower, type Ground, type Meadow, type MeadowConfig, type PlanterShape } from "./loam.js";
import { attrs, cdnTag, CDN, htmlSnippet, reactFile } from "./exportCode";
import { loadConfig, saveConfig } from "./store";

const POST = "https://x.com/that_rishi07/status/2121338147187425617";
const FLOWER: Record<Flower, { label: string; sw: string }> = {
  poppy: { label: "Poppies", sw: "#d8170e" }, daisy: { label: "Daisies", sw: "#f7f6f1" }, cornflower: { label: "Cornflowers", sw: "#3d58e6" },
  buttercup: { label: "Buttercups", sw: "#f5c90f" }, clover: { label: "Clover", sw: "#c4549a" },
};
const PLANTER: Record<PlanterShape, string> = { long: "Long", square: "Square", round: "Round pot" };
const GROUND: Record<Ground, string> = { tiles: "Tiles", lawn: "Lawn", desk: "Desk", plain: "Plain" };

export default function Playground() {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const m = useRef<Meadow | null>(null);
  const [c, setC] = useState<MeadowConfig>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [howto, setHowto] = useState(false);
  const [note, setNote] = useState("");
  const [fallback, setFallback] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);
  const [desk, setDesk] = useState(false);
  const [live, setLive] = useState(true);

  useEffect(() => {
    const start = loadConfig();
    const forced = typeof location !== "undefined" && new URLSearchParams(location.search).get("renderer") === "static";
    setC(start); setReady(true);
    if (stage.current) { m.current = mount(stage.current, forced ? { ...start, renderer: "static" } : start); setLive(m.current.live); }
    return () => { m.current?.destroy(); m.current = null; };
  }, []);
  useEffect(() => { if (!ready) return; m.current?.set(c); saveConfig(c); }, [c, ready]);
  useEffect(() => { if (!note) return; const id = setTimeout(() => setNote(""), 2600); return () => clearTimeout(id); }, [note]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, select");
      if (e.key === "Escape") { setOpen(false); if (!document.fullscreenElement) setDesk(false); }
      else if (!typing && !e.metaKey && !e.ctrlKey && (e.key === "t" || e.key === "T")) setOpen((v) => !v);
    };
    const fs = () => { if (!document.fullscreenElement) setDesk(false); };
    addEventListener("keydown", key); document.addEventListener("fullscreenchange", fs);
    return () => { removeEventListener("keydown", key); document.removeEventListener("fullscreenchange", fs); };
  }, []);

  const set = <K extends keyof MeadowConfig>(k: K, v: MeadowConfig[K]) => setC((p) => normalize({ ...p, [k]: v }));
  const toggleFlower = (f: Flower) => setC((p) => normalize({ ...p, mix: p.mix.includes(f) ? p.mix.filter((x) => x !== f) : [...p.mix, f] }));

  async function engine() { const r = await fetch("/meadow/loam.js"); if (!r.ok) throw new Error(String(r.status)); return r.text(); }
  async function put(text: string, done: string) {
    try { await navigator.clipboard.writeText(text); setNote(done); } catch { setFallback(text); }
  }
  async function copy(kind: "html" | "react" | "cdn") {
    try {
      if (kind === "cdn") return put(cdnTag(c), "Copied the script tag with your meadow");
      const src = await engine();
      await put(kind === "html" ? htmlSnippet(src, c) : reactFile(src, c), kind === "html" ? "Copied <loam-meadow> with your meadow" : "Copied Meadow.tsx with your meadow");
    } catch { setNote("Couldn't fetch the engine. Open /meadow/loam.js instead."); }
  }
  async function png() {
    try {
      const b = await m.current?.toPNG();
      if (!b) throw new Error("none");
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `meadow-${c.seed}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setNote("Saved a PNG of this moment");
    } catch { setNote("Your browser couldn't make the PNG."); }
  }
  async function deskPlant() {
    setOpen(false); setDesk(true);
    try { await wrap.current?.requestFullscreen?.(); } catch { /* iOS: the fixed overlay is the desk plant */ }
  }
  function leaveDesk() { setDesk(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }

  return (
    <div ref={wrap} className={`lm${desk ? " lm-desk" : ""}`} onPointerMove={() => !moved && setMoved(true)}>
      <div className="lm-stage" ref={stage} role="img" aria-label="A wooden planter full of a living flower meadow, seen from above" />

      {desk ? (
        <button className="lm-leave" onClick={leaveDesk}>Leave desk plant <kbd>Esc</kbd></button>
      ) : (
        <header className="lm-top">
          <div className="lm-corner">
            <span className="lm-brand"><Mark /> loam</span>
            <h1 className="lm-title">A living flower planter for your site or your desk</h1>
            <p className="lm-credit">after <a href={POST} target="_blank" rel="noreferrer">Rishi&apos;s living flower meadow</a> · free, MIT · <a href="/">All pieces</a></p>
          </div>

          <div className="lm-panel">
            <div className="lm-dock">
              <button className="lm-chip" aria-expanded={open} aria-controls="lm-tune" onClick={() => setOpen((v) => !v)}>
                {open ? "Close" : "Make it yours"}
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d={open ? "M3 7.5l3-3 3 3" : "M3 4.5l3 3 3-3"} /></svg>
              </button>
              <button className="lm-chip lm-primary" onClick={() => copy("html")}>Copy code</button>
            </div>
            <p className="lm-note" role="status">{note}</p>
            {open && (
              <div className="lm-body" id="lm-tune">
                <section className="lm-sec">
                  <h2><i>1</i>What grows</h2>
                  <div className="lm-flowers">
                    {FLOWERS.map((f) => (
                      <button key={f} type="button" aria-pressed={c.mix.includes(f)} className="lm-flower" onClick={() => toggleFlower(f)}>
                        <i style={{ background: FLOWER[f].sw }} />{FLOWER[f].label}
                      </button>
                    ))}
                  </div>
                  <Range label="How full" value={c.density} min={0} max={1} step={0.05} show={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set("density", v)} reset={DEFAULTS.density} />
                  <div className="lm-actions lm-two">
                    <button onClick={() => set("seed", Math.floor(Math.random() * 1e6))}>Shuffle the meadow</button>
                    <button onClick={() => { m.current?.regrow(); setNote("Growing from bare soil"); }}>Grow it again</button>
                  </div>
                </section>
                <section className="lm-sec">
                  <h2><i>2</i>Weather and planter</h2>
                  <Range label="Wind" value={c.wind} min={0} max={1} step={0.05} onChange={(v) => set("wind", v)} reset={DEFAULTS.wind} />
                  <Range label="Sun from" value={c.sun} min={0} max={360} step={5} show={(v) => `${v}°`} onChange={(v) => set("sun", v)} reset={DEFAULTS.sun} />
                  <div className="lm-seg" role="radiogroup" aria-label="Planter">
                    {PLANTERS.map((p) => (
                      <button key={p} role="radio" aria-checked={c.planter === p} className={c.planter === p ? "lm-on" : ""} onClick={() => set("planter", p)}>{PLANTER[p]}</button>
                    ))}
                  </div>
                  <div className="lm-seg lm-seg4" role="radiogroup" aria-label="Ground">
                    {GROUNDS.map((g) => (
                      <button key={g} role="radio" aria-checked={c.ground === g} className={c.ground === g ? "lm-on" : ""} onClick={() => set("ground", g)}>{GROUND[g]}</button>
                    ))}
                  </div>
                  <div className="lm-toggles">
                    <Toggle label="Bees and butterflies" on={c.bugs} onChange={(v) => set("bugs", v)} />
                    <Toggle label="Grow from seed on load" on={c.grow} onChange={(v) => set("grow", v)} />
                  </div>
                  <button className="lm-link" onClick={() => setC(normalize(null))}>Reset everything</button>
                </section>
                <section className="lm-sec">
                  <h2><i>3</i>Take it home</h2>
                  <p className="lm-sub">Your flowers, weather and planter baked in. One file, no dependencies, no network calls.</p>
                  <div className="lm-actions lm-two">
                    <button onClick={() => copy("html")}>Copy HTML</button>
                    <button onClick={() => copy("react")}>Copy Meadow.tsx</button>
                    <button onClick={() => copy("cdn")}>Copy script tag</button>
                    <button onClick={png}>Download PNG</button>
                  </div>
                  <button className="lm-desk-btn" onClick={deskPlant}>Desk plant: full screen, no buttons</button>
                  <button className="lm-link" onClick={() => setHowto((h) => !h)} aria-expanded={howto}>
                    How to use it on your site <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>
                  </button>
                  {howto && (
                    <div className="lm-howto">
                      <ol>
                        <li><b>Any site:</b> Copy HTML and paste it where the planter goes. It fills its box: change <code>height:70vh</code> to taste.</li>
                        <li><b>React / Next.js:</b> Copy Meadow.tsx, save it, render <code>{`<Meadow style={{ height: "70vh" }} />`}</code>. Props override the baked settings, e.g. <code>planter=&quot;round&quot;</code>.</li>
                        <li><b>Or link it:</b> <code>{`<script type="module" src="${CDN}"></script>`}</code> then <code>{`<loam-meadow ${attrs(c)}>`}</code>.</li>
                        <li><b>Using it:</b> move through the grass to blow it aside; hold the mouse, long-press, or press <kbd>L</kbd> for the glass lens. It pauses when scrolled away and calms down for reduced motion.</li>
                        <li>Needs WebGL 2 (every current browser). Without it, it shows a still and a note. This page&apos;s address keeps your settings.</li>
                      </ol>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </header>
      )}

      {!desk && live && (
        <p className={`lm-hint${moved || open ? " lm-gone" : ""}`} aria-hidden="true">
          <span className="lm-fine">move through it · hold to look closer</span>
          <span className="lm-touch">drag through it · long-press to look closer</span>
        </p>
      )}

      {fallback !== null && (
        <div className="lm-dialog" role="dialog" aria-label="Select and copy">
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
    <div className="lm-range">
      <label>
        <span>{label}</span>
        <output>{show ? show(value) : value.toFixed(2)}</output>
        {value !== reset && <button type="button" className="lm-reset" onClick={() => onChange(reset)} aria-label={`Reset ${label}`}>reset</button>}
      </label>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} style={{ ["--v" as string]: `${((value - min) / (max - min)) * 100}%` }} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="lm-toggle" onClick={() => onChange(!on)}>
      <i aria-hidden="true" />{label}
    </button>
  );
}

// our own mark: a planter seen from above with one flower in it
const Mark = () => (
  <svg viewBox="0 0 16 16" className="lm-mark" aria-hidden="true"><rect x="1.5" y="3.5" width="13" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="8" cy="8" r="2.2" fill="currentColor" /></svg>
);
