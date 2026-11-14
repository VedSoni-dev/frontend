"use client";
// shoal: a full-screen 3D shoal of pixel-splat sharks. Drag to spin, pinch or scroll to zoom, tap a shark for its name.
// The Tune chip changes pixel size, count, speed, auto-orbit and palette; take it home as a PNG or as Shoal.tsx.
// Everything runs in this tab: no uploads, no AI, no network beyond fetching our own Shoal.tsx for Copy.
import { useCallback, useEffect, useRef, useState } from "react";
import { createShoal, DEFAULTS, PALETTES, type PaletteId, type ShoalScene } from "./Shoal";

const POST = "https://x.com/stackedlol/status/2121327009725047087";
type Look = { pixelSize: number; count: number; speed: number; palette: PaletteId; autoOrbit: boolean };
const START: Look = { pixelSize: DEFAULTS.pixelSize, count: DEFAULTS.count, speed: DEFAULTS.speed, palette: DEFAULTS.palette, autoOrbit: DEFAULTS.autoOrbit };

function usage(l: Look) {
  return `<Shoal pixelSize={${l.pixelSize}} count={${l.count}} speed={${l.speed}} palette="${l.palette}" autoOrbit={${l.autoOrbit}} />`;
}

export default function Studio() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ShoalScene | null>(null);
  const [look, setLook] = useState<Look>(START);
  const [state, setState] = useState<"ok" | "nowebgl" | "error">("ok");
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const [howto, setHowto] = useState(false);
  const [touched, setTouched] = useState(false);
  const [picked, setPicked] = useState<{ name: string; n: number } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const lookRef = useRef(look); lookRef.current = look;

  const onPick = useCallback((name: string | null) => {
    setTouched(true);
    setPicked(name ? { name, n: Date.now() } : null);
  }, []);

  useEffect(() => {
    const c = canvas.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setLook((l) => ({ ...l, autoOrbit: false, speed: 0.3 }));
    try {
      scene.current = createShoal(c, { ...lookRef.current, ...(reduced ? { autoOrbit: false, speed: 0.3 } : {}), onPick });
      setState("ok");
    } catch (e) {
      setState(String((e as Error).message) === "webgl2" ? "nowebgl" : "error");
    }
    const first = () => setTouched(true);
    c.addEventListener("pointerdown", first, { once: true });
    return () => { c.removeEventListener("pointerdown", first); scene.current?.dispose(); scene.current = null; };
  }, [attempt, onPick]);

  useEffect(() => { scene.current?.set(look); }, [look]);
  useEffect(() => { if (!picked) return; const id = setTimeout(() => setPicked(null), 1600); return () => clearTimeout(id); }, [picked]);
  useEffect(() => { if (!note) return; const id = setTimeout(() => setNote(""), 2600); return () => clearTimeout(id); }, [note]);
  useEffect(() => { document.documentElement.dataset.palette = look.palette; }, [look.palette]);

  const set = <K extends keyof Look>(k: K, v: Look[K]) => setLook((l) => ({ ...l, [k]: v }));

  async function download() {
    if (!scene.current) return;
    setBusy(true);
    try {
      const blob = await scene.current.snapshot();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `shoal-${look.palette}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setNote("PNG saved");
    } catch (e) { setNote((e as Error).message || "Couldn't make the PNG."); }
    finally { setBusy(false); }
  }
  async function copy() {
    setBusy(true);
    try {
      const src = await (await fetch("/sharks/Shoal.tsx")).text();
      const text = `// Shoal.tsx: save this file in your app, then render it inside a sized box, e.g. a fixed full-screen background:\n//   <div style={{ position: "fixed", inset: 0, zIndex: -1 }}>${usage(look)}</div>\n// Needs React 18+ and a browser with WebGL2. MIT.\n${src}`;
      try { await navigator.clipboard.writeText(text); setNote("Copied Shoal.tsx with your settings"); }
      catch { setFallback(text); }
    } catch { setNote("Couldn't fetch the file. Open /sharks/Shoal.tsx instead."); }
    finally { setBusy(false); }
  }

  return (
    <div className="sh">
      <canvas ref={canvas} className="sh-canvas" aria-label="A shoal of pixel sharks swimming in 3D. Drag to spin, pinch or scroll to zoom, tap a shark for its name." />

      {state === "nowebgl" && (
        <div className="sh-fallback">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sharks/poster.jpg" alt="A still of the shoal of pixel sharks" />
          <p>Your browser can&apos;t run WebGL2, so here&apos;s a still.</p>
        </div>
      )}
      {state === "error" && (
        <div className="sh-card" role="alert">
          <p>The scene didn&apos;t start.</p>
          <button onClick={() => setAttempt((a) => a + 1)}>Retry</button>
        </div>
      )}

      <header className="sh-corner">
        <span className="sh-brand"><Fin /> shoal</span>
        <span className="sh-credit">after <a href={POST} target="_blank" rel="noreferrer">stacked&apos;s 3D pixel sharks</a></span>
      </header>

      <p className={`sh-hint${touched ? " sh-gone" : ""}`}>drag to spin · pinch or scroll to zoom · tap a shark</p>
      <p className="sh-picked" aria-live="polite">{picked ? <span key={picked.n}>{picked.name}</span> : null}</p>
      <p className="sh-note" aria-live="polite">{note}</p>

      <div className={`sh-panel${open ? " sh-open" : ""}`}>
        <button className="sh-chip" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Tune"}</button>
        {open && (
          <div className="sh-body">
            <Range label="Pixel size" value={look.pixelSize} min={1} max={8} step={1} show={(v) => (v === 1 ? "1 · smooth" : String(v))} onChange={(v) => set("pixelSize", v)} reset={START.pixelSize} />
            <Range label="Sharks" value={look.count} min={1} max={10} step={1} onChange={(v) => set("count", v)} reset={START.count} />
            <Range label="Swim speed" value={look.speed} min={0} max={2} step={0.1} show={(v) => `${v.toFixed(1)}×`} onChange={(v) => set("speed", v)} reset={START.speed} />
            <label className="sh-toggle"><input type="checkbox" checked={look.autoOrbit} onChange={(e) => set("autoOrbit", e.target.checked)} /> Auto-orbit</label>
            <div className="sh-pals" role="radiogroup" aria-label="Palette">
              {PALETTES.map((p) => (
                <button key={p.id} role="radio" aria-checked={look.palette === p.id} className={look.palette === p.id ? "sh-on" : ""} onClick={() => set("palette", p.id)}>
                  <i style={{ background: p.bg }} /> {p.label}
                </button>
              ))}
            </div>
            <div className="sh-actions">
              <button onClick={download} disabled={busy || state !== "ok"}>Download PNG</button>
              <button onClick={copy} disabled={busy}>Copy component</button>
            </div>
            <button className="sh-link" onClick={() => setHowto((h) => !h)} aria-expanded={howto}>{howto ? "Hide" : "How to use it on your site"}</button>
            {howto && (
              <div className="sh-howto">
                <ol>
                  <li>Copy component, save it as <code>Shoal.tsx</code> in your React app.</li>
                  <li>Put it in any sized box. As a page background: <code>{`<div style={{position:"fixed",inset:0,zIndex:-1}}><Shoal /></div>`}</code></li>
                  <li>Your settings now: <code>{usage(look)}</code></li>
                  <li>Not React? <code>createShoal(canvas, opts)</code> from the same file works on any canvas.</li>
                </ol>
                <p>Or Download PNG for a wallpaper: it saves the frame you see, at your screen&apos;s size.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {fallback !== null && (
        <div className="sh-card sh-copybox" role="dialog" aria-label="Select and copy">
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
    <div className="sh-range">
      <label>
        <span>{label}</span>
        <output>{show ? show(value) : value}</output>
        {value !== reset && <button type="button" className="sh-reset" onClick={() => onChange(reset)} aria-label={`Reset ${label}`}>reset</button>}
      </label>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

// our own mark: a little pixel fin
const Fin = () => (
  <svg viewBox="0 0 8 8" className="sh-mark" aria-hidden="true" shapeRendering="crispEdges">
    <path d="M4 1h1v1h1v2h1v2H1V5h1V4h1V2h1z" fill="currentColor" />
  </svg>
);
