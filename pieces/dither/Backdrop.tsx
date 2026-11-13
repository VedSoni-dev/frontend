"use client";
// backdrop: drop in any picture, get it back in the dark ordered-dither look, tune it, download a PNG for your screen.
// Everything runs in this tab: the picture is never uploaded. The engine (engine.js) is pure and tested; this file is
// input, scheduling, the preview and the export.
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent as RPointerEvent } from "react";
import { DEFAULTS, PALETTES, dither, exportPlan, normalize, upscale, type PaletteId, type Pattern, type Settings } from "./engine.js";
import { SAMPLES } from "./samples.js";

type Source = { canvas: HTMLCanvasElement; w: number; h: number; name: string; preview: ImageData; note?: string; sample?: boolean };
type Status = { kind: "empty" } | { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };
type SizeId = "screen" | "original" | "1080" | "1440" | "4k" | "phone";

const MAX_EDGE = 4096;
const MAX_BYTES = 25 * 1024 * 1024;
const PREVIEW_EDGE = 1600;
const STORE = "backdrop:settings";
const POST = "https://x.com/TheCoderBtw/status/2121061189962866865";

const PATTERN_NAMES: Record<Pattern, string> = { bayer8: "Bayer 8×8", bayer4: "Bayer 4×4", noise: "Noise" };
const SIZES: { id: SizeId; label: string }[] = [
  { id: "screen", label: "My screen" },
  { id: "original", label: "Original" },
  { id: "phone", label: "Phone" },
  { id: "1080", label: "Full HD" },
  { id: "1440", label: "QHD" },
  { id: "4k", label: "4K" },
];

function readSettings(): Settings {
  try { const raw = localStorage.getItem(STORE); return raw ? normalize(JSON.parse(raw)) : { ...DEFAULTS }; } catch { return { ...DEFAULTS }; }
}
function saveSettings(s: Settings) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* private mode: fine */ } }

function makeCanvas(w: number, h: number) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function ctx2d(c: HTMLCanvasElement) { const x = c.getContext("2d", { willReadFrequently: true }); if (!x) throw new Error("Canvas is not available in this browser."); return x; }

/** The picture at most MAX_EDGE on its long side, on black (transparency flattened), plus a small copy for the live preview. */
function toSource(img: CanvasImageSource, iw: number, ih: number, name: string, note?: string): Source {
  const k = Math.min(1, MAX_EDGE / Math.max(iw, ih)), w = Math.max(1, Math.round(iw * k)), h = Math.max(1, Math.round(ih * k));
  const canvas = makeCanvas(w, h), c = ctx2d(canvas);
  c.fillStyle = "#000"; c.fillRect(0, 0, w, h); c.imageSmoothingQuality = "high"; c.drawImage(img, 0, 0, w, h);
  const pk = Math.min(1, PREVIEW_EDGE / Math.max(w, h)), pw = Math.max(1, Math.round(w * pk)), ph = Math.max(1, Math.round(h * pk));
  const pc = makeCanvas(pw, ph), p = ctx2d(pc); p.imageSmoothingQuality = "high"; p.drawImage(canvas, 0, 0, pw, ph);
  return { canvas, w, h, name, preview: p.getImageData(0, 0, pw, ph), note };
}

function sampleSource(i: number): Source {
  const s = SAMPLES[i], w = 1600, h = 1000, c = makeCanvas(w, h);
  ctx2d(c).putImageData(new ImageData(new Uint8ClampedArray(s.paint(w, h)), w, h), 0, 0);
  return { ...toSource(c, w, h, s.id), sample: true };
}

async function decode(file: File): Promise<Source> {
  if (file.size > MAX_BYTES) throw new Error("That picture is over 25 MB. Try a smaller one.");
  const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  const animated = /gif|webp/i.test(file.type) ? "Animated pictures use their first frame." : undefined;
  const name = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").slice(0, 40) || "picture";
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try { return toSource(bmp, bmp.width, bmp.height, name, animated); } finally { bmp.close(); }
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      return toSource(img, img.naturalWidth, img.naturalHeight, name, animated);
    } catch {
      throw new Error(heic ? "This browser can't open HEIC photos. Export it as JPG first, then drop it here." : "That file didn't open as a picture. Try a JPG, PNG or WebP.");
    } finally { URL.revokeObjectURL(url); }
  }
}

function targetSize(id: SizeId, src: Source): [number, number] {
  switch (id) {
    case "original": return [src.w, src.h];
    case "1080": return [1920, 1080];
    case "1440": return [2560, 1440];
    case "4k": return [3840, 2160];
    case "phone": return [1179, 2556];
    default: {
      const d = Math.min(3, window.devicePixelRatio || 1);
      const w = Math.round(screen.width * d), h = Math.round(screen.height * d);
      return w > 0 && h > 0 ? [Math.min(w, 7680), Math.min(h, 7680)] : [1920, 1080];
    }
  }
}

/** Full-resolution export: cover-crop to the target, dither at target/dot, whole-dot upscale, PNG. */
async function render(src: Source, s: Settings, tw: number, th: number): Promise<Blob> {
  const plan = exportPlan(src.w, src.h, tw, th, s.dot);
  const crop = ctx2d(src.canvas).getImageData(plan.crop.x, plan.crop.y, plan.crop.w, plan.crop.h);
  const grid = dither(crop.data, crop.width, crop.height, s, plan.gw, plan.gh);
  const big = upscale(grid, plan.dot);
  const bc = makeCanvas(big.width, big.height); ctx2d(bc).putImageData(new ImageData(new Uint8ClampedArray(big.data), big.width, big.height), 0, 0);
  const out = makeCanvas(tw, th); ctx2d(out).drawImage(bc, -plan.offX, -plan.offY);
  return new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("The browser couldn't make the PNG."))), "image/png"));
}

export default function Backdrop() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [src, setSrc] = useState<Source | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "empty" });
  const [sample, setSample] = useState(0);
  const [compare, setCompare] = useState(false);
  const [split, setSplit] = useState(50);
  const [overlay, setOverlay] = useState(false);
  const [size, setSize] = useState<SizeId>("screen");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ url: string; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stageW, setStageW] = useState(0);

  const out = useRef<HTMLCanvasElement>(null);
  const orig = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const frame = useRef(0);

  // settings from last time; the stage opens empty until you add a picture (a sample only when you ask for one)
  useEffect(() => { setS(readSettings()); }, []);
  useEffect(() => saveSettings(s), [s]);

  // the preview's grid follows the stage's real size in device pixels, so a dot here is a dot on your screen
  useEffect(() => {
    const el = stage.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setStageW(Math.round(e.contentRect.width)));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // live preview, coalesced to one render per frame
  useEffect(() => {
    if (!src || !stageW) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      try {
        const dpr = Math.min(3, window.devicePixelRatio || 1);
        const p = src.preview, devW = stageW * dpr, devH = devW * (p.height / p.width);
        const gw = Math.max(1, Math.round(devW / s.dot)), gh = Math.max(1, Math.round(devH / s.dot));
        const g = dither(p.data, p.width, p.height, s, gw, gh);
        const c = out.current; if (!c) return;
        c.width = g.width; c.height = g.height;
        ctx2d(c).putImageData(new ImageData(new Uint8ClampedArray(g.data), g.width, g.height), 0, 0);
        const o = orig.current;
        if (o) { o.width = p.width; o.height = p.height; ctx2d(o).putImageData(p, 0, 0); }
      } catch (e) { setStatus({ kind: "error", message: `The preview failed: ${(e as Error).message}` }); }
    });
    return () => cancelAnimationFrame(frame.current);
  }, [src, s, stageW]);

  const open = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setStatus({ kind: "loading" }); setSaved(null);
    try { setSrc(await decode(file)); setStatus({ kind: "ready" }); }
    catch (e) { setStatus({ kind: "error", message: (e as Error).message }); }
  }, []);

  // drop anywhere in the window, or paste
  useEffect(() => {
    const over = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) { e.preventDefault(); setDragging(true); } };
    const leave = (e: DragEvent) => { if (!e.relatedTarget) setDragging(false); };
    const drop = (e: DragEvent) => { e.preventDefault(); setDragging(false); open(e.dataTransfer?.files?.[0]); };
    const paste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) { e.preventDefault(); open(f); }
    };
    window.addEventListener("dragover", over); window.addEventListener("dragleave", leave); window.addEventListener("drop", drop); window.addEventListener("paste", paste);
    return () => { window.removeEventListener("dragover", over); window.removeEventListener("dragleave", leave); window.removeEventListener("drop", drop); window.removeEventListener("paste", paste); };
  }, [open]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => normalize({ ...p, [k]: v }));
  const pickPalette = (id: PaletteId) => setS((p) => normalize({ ...p, palette: id, accent: id === "custom" ? p.accent : PALETTES[id].accent }));

  const showSample = (i: number) => {
    setSample(i); setSaved(null);
    try { setSrc(sampleSource(i)); setStatus({ kind: "ready" }); } catch (e) { setStatus({ kind: "error", message: String((e as Error).message) }); }
  };
  const nextSample = () => showSample(src?.sample ? (sample + 1) % SAMPLES.length : 0);

  const download = async () => {
    if (!src || busy) return;
    setBusy(true);
    try {
      const [tw, th] = targetSize(size, src);
      const blob = await render(src, s, tw, th);
      const name = `backdrop-${s.palette}-${tw}x${th}.png`;
      if (saved) URL.revokeObjectURL(saved.url);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setSaved({ url, name });
    } catch (e) { setStatus({ kind: "error", message: `The download failed: ${(e as Error).message}` }); }
    finally { setBusy(false); }
  };

  // before/after handle
  const dragSplit = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.parentElement!.getBoundingClientRect();
    setSplit(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
  };

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const aspect = src ? `${src.preview.width} / ${src.preview.height}` : "16 / 10";

  return (
    <div className="bd">
      <header className="bd-top">
        <div className="bd-brand"><span className="bd-mark" aria-hidden="true" />backdrop</div>
        <h1 className="bd-title">Turn any picture into a dithered wallpaper.</h1>
        <p className="bd-credit">The dithered background look from <a href={POST} target="_blank" rel="noreferrer">TheCoderBTW&rsquo;s &ldquo;New look!&rdquo; post</a>.</p>
      </header>

      <main className="bd-main">
        <section className="bd-stage-wrap" aria-label="Preview">
          <div ref={stage} className="bd-stage" style={{ aspectRatio: aspect, width: src ? `min(100%, calc(72svh * ${src.preview.width / src.preview.height}))` : "100%" }}>
            <canvas ref={orig} className="bd-orig" aria-hidden={!compare} hidden={!src} style={{ visibility: compare ? "visible" : "hidden" }} />
            <canvas ref={out} className="bd-out" role="img" aria-label={src?.sample ? "A sample picture, dithered" : "Your picture, dithered"} hidden={!src} style={compare ? { clipPath: `inset(0 0 0 ${split}%)` } : undefined} />
            {overlay && (
              <div className="bd-overlay" aria-hidden="true">
                <p>Start something new</p>
                <div className="bd-fake-input"><span>Describe what you want to make…</span><i /></div>
              </div>
            )}
            {compare && (
              <div className="bd-split" style={{ left: `${split}%` }} role="slider" tabIndex={0} aria-label="Before and after" aria-valuenow={Math.round(split)} aria-valuemin={0} aria-valuemax={100}
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragSplit(e); }}
                onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) dragSplit(e); }}
                onKeyDown={(e) => { if (e.key === "ArrowLeft") setSplit((v) => Math.max(0, v - 5)); if (e.key === "ArrowRight") setSplit((v) => Math.min(100, v + 5)); }}>
                <span>before · after</span>
              </div>
            )}
            {!src && status.kind !== "loading" && (
              <div className="bd-empty">
                <p>Drop your picture here</p>
                <button type="button" className="bd-pick" onClick={() => fileInput.current?.click()}>Pick a picture</button>
                <button type="button" className="bd-try" onClick={() => showSample(0)}>Try a sample</button>
              </div>
            )}
            {src?.sample && <span className="bd-sample-tag">Sample</span>}
            {status.kind === "loading" && <div className="bd-state">Opening your picture…</div>}
            {dragging && <div className="bd-state bd-drop">Drop it</div>}
          </div>
          {status.kind === "error" && (
            <div className="bd-error" role="alert">
              <span>{status.message}</span>
              <button type="button" onClick={() => fileInput.current?.click()}>Try another picture</button>
            </div>
          )}
          {src?.note && status.kind === "ready" && <p className="bd-note">{src.note}</p>}
          {src && (
            <div className="bd-view">
              <button type="button" className={compare ? "on" : ""} aria-pressed={compare} onClick={() => setCompare((v) => !v)}>Before / after</button>
              <button type="button" className={overlay ? "on" : ""} aria-pressed={overlay} onClick={() => setOverlay((v) => !v)}>As a background</button>
              <button type="button" onClick={nextSample}>{src.sample ? "Another sample" : "Try a sample"}</button>
            </div>
          )}
        </section>

        <aside className="bd-panel" aria-label="Settings">
          <div className="bd-input">
            <button type="button" className="bd-pick" onClick={() => fileInput.current?.click()}>Pick a picture</button>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => { open(e.target.files?.[0]); e.target.value = ""; }} />
            <p className="bd-how">Or drop one anywhere on this page, or paste it (⌘V / Ctrl V). Then tune it and download. <strong>Your picture never leaves your browser.</strong></p>
          </div>

          <fieldset className="bd-group">
            <legend>Palette</legend>
            <div className="bd-palettes">
              {(Object.keys(PALETTES) as Exclude<PaletteId, "custom">[]).map((id) => (
                <button key={id} type="button" className={`bd-swatch${s.palette === id ? " on" : ""}`} aria-pressed={s.palette === id} onClick={() => pickPalette(id)}>
                  <i style={{ background: `linear-gradient(90deg,#0a0909 0 30%,${PALETTES[id].accent} 30% 70%,#e8e2dc 70%)` }} />{PALETTES[id].name}
                </button>
              ))}
              <label className={`bd-swatch${s.palette === "custom" ? " on" : ""}`}>
                <input type="color" value={s.accent} onChange={(e) => setS((p) => normalize({ ...p, palette: "custom", accent: e.target.value }))} aria-label="Your own accent colour" />
                Custom
              </label>
            </div>
          </fieldset>

          <div className="bd-sliders">
            <Slider label="Dot size" value={s.dot} min={1} max={8} step={1} show={`${s.dot}px`} onChange={(v) => set("dot", v)} />
            <Slider label="Contrast" value={s.contrast} min={0.5} max={2} step={0.05} show={s.contrast.toFixed(2)} onChange={(v) => set("contrast", v)} />
            <Slider label="Darkness" value={s.darkness} min={0} max={1} step={0.01} show={pct(s.darkness)} onChange={(v) => set("darkness", v)} />
            <Slider label="Mix with original" value={s.mix} min={0} max={1} step={0.01} show={pct(s.mix)} onChange={(v) => set("mix", v)} />
            <button type="button" className="bd-reset" onClick={() => setS({ ...DEFAULTS })}>Reset to Ember</button>
          </div>

          <fieldset className="bd-group">
            <legend>Pattern</legend>
            <div className="bd-chips">
              {(Object.keys(PATTERN_NAMES) as Pattern[]).map((p) => (
                <button key={p} type="button" className={s.pattern === p ? "on" : ""} aria-pressed={s.pattern === p} onClick={() => set("pattern", p)}>{PATTERN_NAMES[p]}</button>
              ))}
            </div>
          </fieldset>

          <fieldset className="bd-group">
            <legend>Size</legend>
            <div className="bd-chips bd-sizes">
              {SIZES.map((z) => (
                <button key={z.id} type="button" className={`bd-size${size === z.id ? " on" : ""}`} aria-pressed={size === z.id} onClick={() => { setSize(z.id); setSaved(null); }}>
                  <span>{z.label}</span><small>{src ? targetSize(z.id, src).join("×") : ""}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="bd-dl">
            <button type="button" className="bd-download" onClick={download} disabled={!src || busy}>{busy ? "Making your PNG…" : "Download PNG"}</button>
            {!src && <p className="bd-how">Add a picture first, then download it.</p>}
            {saved && <a className="bd-saved" href={saved.url} target="_blank" rel="noreferrer">Didn&rsquo;t download? Open {saved.name} and long-press to save.</a>}
          </div>
        </aside>
      </main>

      <footer className="bd-foot">
        <span>backdrop is free and open source (MIT). Ordered dithering, Bayer 1973.</span>
        <a href="https://github.com/VedSoni-dev/frontend/tree/main/pieces/dither" target="_blank" rel="noreferrer">Code</a>
        <a href="/">More pieces</a>
      </footer>
    </div>
  );
}

function Slider({ label, value, min, max, step, show, onChange }: { label: string; value: number; min: number; max: number; step: number; show: string; onChange: (v: number) => void }) {
  return (
    <label className="bd-slider">
      <span className="bd-slider-head"><span>{label}</span><output>{show}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
