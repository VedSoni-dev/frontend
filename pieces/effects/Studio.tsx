"use client";
// tincture: drop your own photo into four ready-made layouts and watch it melt (liquid, marble, torn print, glow,
// grain gradient, posterize). Tweak five dials, edit the words, take it away as a PNG or a one-file React component.
// One WebGL renderer (Tincture.tsx) draws every slot, then each slot's 2D canvas copies the frame, so the preview
// and the PNG come from the same shader. The photo never leaves this tab.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { createRenderer, PRESETS, type PresetId, type Renderer, type Treatment } from "./Tincture";
import { DIALS, LAYOUTS, PRESET_IDS, TEXTS, decodeHash, encodeHash, normalize, type DialId, type LayoutId, type Look } from "./looks.js";

const POST = "https://x.com/Yaxbuzz/status/2121270887714611691";
const STORE = "tincture:look";
const MAX_EDGE = 2048;
const MAX_BYTES = 30 * 1024 * 1024;
type RGB = [number, number, number];
type Kind = "image" | "cloud" | "gradient";
type Slot = { el: HTMLCanvasElement; kind: Kind; seed: number; torn: string; lowres?: number };
type Photo = { canvas: HTMLCanvasElement; name: string; sample?: boolean };
const DUSK = PRESETS.gradient.palette;

// ---------- the photo ----------
function fit(src: CanvasImageSource, w: number, h: number) {
  const k = Math.min(1, MAX_EDGE / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
async function decode(file: File): Promise<HTMLCanvasElement> {
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) throw new Error("HEIC photos don't open in this browser. Export it as JPG or PNG first (on iPhone: Settings, Camera, Formats, Most Compatible).");
  if (file.type && !file.type.startsWith("image/")) throw new Error("That isn't an image. Try a JPG, PNG or WebP.");
  if (file.size > MAX_BYTES) throw new Error("That file is over 30 MB. Try a smaller copy.");
  try { const b = await createImageBitmap(file); const c = fit(b, b.width, b.height); b.close(); return c; }
  catch {
    const url = URL.createObjectURL(file);
    try {
      const im = new Image(); im.src = url; await im.decode();
      return fit(im, im.naturalWidth, im.naturalHeight);
    } catch { throw new Error("This image couldn't be read. Try another file, or export it again as JPG."); }
    finally { URL.revokeObjectURL(url); }
  }
}
/** Our own sample, painted in code: a dusk sky, a beam of light, a cluster of petals, a stem. */
function paintSample(): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = 1200; c.height = 1500; const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 1500); sky.addColorStop(0, "#2b3566"); sky.addColorStop(0.55, "#3c4f86"); sky.addColorStop(1, "#1d5160");
  g.fillStyle = sky; g.fillRect(0, 0, 1200, 1500);
  const beam = g.createRadialGradient(330, 120, 20, 330, 300, 620); beam.addColorStop(0, "#fff4f0"); beam.addColorStop(0.35, "#f6a6c0aa"); beam.addColorStop(1, "#f6a6c000");
  g.fillStyle = beam; g.fillRect(0, 0, 1200, 1500);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const petal = (x: number, y: number, r: number, hue: number) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rnd();
      g.fillStyle = `hsl(${hue + rnd() * 40 - 20} 85% ${55 + rnd() * 25}%)`;
      g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.7, r * 0.45, a, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#ffd25a"; g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fill();
  };
  g.strokeStyle = "#3f8a52"; g.lineWidth = 18; g.lineCap = "round";
  g.beginPath(); g.moveTo(760, 760); g.bezierCurveTo(820, 1000, 700, 1180, 640, 1500); g.stroke();
  g.fillStyle = "#58b06a"; g.beginPath(); g.ellipse(700, 1150, 140, 40, -0.6, 0, Math.PI * 2); g.fill();
  petal(760, 620, 190, 330); petal(560, 760, 150, 290); petal(930, 800, 140, 20); petal(820, 900, 110, 45);
  g.fillStyle = "#c9b7ff55"; g.fillRect(0, 1260, 1200, 60);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,240,250,${rnd() * 0.5})`; g.fillRect(rnd() * 1200, rnd() * 1100, 3, 3); }
  return c;
}
/** Three soft colours from the photo (dark, middle, light), washed toward white for the cloud and gradients. */
function paletteOf(src: HTMLCanvasElement): [RGB, RGB, RGB] {
  const c = document.createElement("canvas"); c.width = 12; c.height = 12; const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(src, 0, 0, 12, 12);
  const d = g.getImageData(0, 0, 12, 12).data; const px: RGB[] = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]);
  px.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const avg = (a: RGB[]) => a.reduce((s, p) => [s[0] + p[0] / a.length, s[1] + p[1] / a.length, s[2] + p[2] / a.length] as RGB, [0, 0, 0] as RGB);
  const wash = (p: RGB, k: number) => p.map((x) => x + (1 - x) * k) as RGB;
  const t = Math.floor(px.length / 3);
  return [wash(avg(px.slice(2 * t)), 0.7), wash(avg(px.slice(t, 2 * t)), 0.45), wash(avg(px.slice(0, t)), 0.4)];
}

// ---------- state ----------
function initialLook(): Look {
  if (typeof window === "undefined") return normalize(null);
  const fromHash = decodeHash(location.hash);
  let stored: Look | null = null;
  try { const raw = localStorage.getItem(STORE); stored = raw ? normalize(JSON.parse(raw)) : null; } catch { /* blocked storage: defaults */ }
  if (fromHash) return { ...fromHash, texts: stored?.texts ?? {} };
  return stored ?? normalize(null);
}
function treatmentOf(look: Look): Treatment {
  return { ...PRESETS[look.preset], ...(look.dials ?? {}) };
}

// ---------- slots ----------
type Reg = (key: string, s: Slot | null) => void;
const SlotCtx = createContext<{ reg: Reg; empty: boolean; pick: () => void; sample: () => void }>({ reg: () => {}, empty: true, pick: () => {}, sample: () => {} });

function Paint({ id, kind, seed = 1, torn = "", lowres, className, prompt }: { id: string; kind: Kind; seed?: number; torn?: string; lowres?: number; className?: string; prompt?: boolean }) {
  const { reg, empty, pick, sample } = useContext(SlotCtx);
  const ref = useCallback((el: HTMLCanvasElement | null) => reg(id, el ? { el, kind, seed, torn, lowres } : null), [reg, id, kind, seed, torn, lowres]);
  return (
    <div className={`tn-slot ${className ?? ""}`}>
      <canvas ref={ref} data-x="slot" data-slot={id} aria-hidden="true" />
      {prompt && empty && kind === "image" && (
        <div className="tn-prompt">
          <button type="button" onClick={pick}>Drop your photo here</button>
          <button type="button" className="tn-link" onClick={sample}>or try a sample</button>
        </div>
      )}
    </div>
  );
}

function ChipPrompt() {
  const { empty, pick, sample } = useContext(SlotCtx);
  if (!empty) return null;
  return <div className="tn-chip-prompt"><button type="button" onClick={pick}>Drop your photo here</button><button type="button" className="tn-link" onClick={sample}>or try a sample</button></div>;
}

function Editable({ value, onChange, className, label }: { value: string; onChange: (v: string) => void; className?: string; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current && ref.current.textContent !== value) ref.current.textContent = value; }, [value]);
  return (
    <span ref={ref} data-x="text" className={`tn-edit ${className ?? ""}`} contentEditable suppressContentEditableWarning spellCheck={false}
      role="textbox" aria-label={label}
      onInput={(e) => onChange((e.currentTarget.textContent ?? "").slice(0, 140))}
      onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/\s+/g, " ")); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }} />
  );
}

// Our own glyphs (no borrowed icon sets): a four-point spark, a dot-in-ring, a leaf stroke, a wavy underline.
const Spark = ({ className }: { className?: string }) => (<svg data-x="svg" className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.9 5.6 4.9 9.6 10.5 10.5-5.6.9-9.6 4.9-10.5 10.5C11.1 16.9 7.1 12.9 1.5 12 7.1 11.1 11.1 7.1 12 1.5Z" fill="currentColor" /></svg>);
const Ring = ({ className }: { className?: string }) => (<svg data-x="svg" className={className} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="3.5" fill="currentColor" /></svg>);
const Leaf = ({ className }: { className?: string }) => (<svg data-x="svg" className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16Zm0 0 9-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const Wave = ({ className }: { className?: string }) => (<svg data-x="svg" className={className} viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 5c12-4 18 4 30 0s18-4 30 0 18 4 30 0 18-4 30 0 18 4 30 0 18-4 30 0 12 2 16 0" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" /></svg>);
const GLYPHS = [Spark, Ring, Leaf];

function Barcode({ code }: { code: string }) {
  let x = 0; const bars: ReactNode[] = [];
  for (const ch of (code || "x").padEnd(12, "·")) {
    const n = ch.charCodeAt(0);
    for (let i = 0; i < 3; i++) { const w = 1 + ((n >> i) & 1) * 1.6; bars.push(<rect key={bars.length} x={x} y="0" width={w} height="40" fill="currentColor" />); x += w + 1.4 + ((n >> (i + 3)) & 1); }
  }
  return <svg data-x="svg" className="tn-barcode" viewBox={`0 0 ${x} 40`} preserveAspectRatio="none" aria-hidden="true">{bars}</svg>;
}

// ---------- layouts ----------
function Layout({ look, setText }: { look: Look; setText: (f: string, v: string) => void }) {
  const t = { ...TEXTS[look.layout], ...(look.texts[look.layout] ?? {}) } as Record<string, string>;
  const E = (f: string, cls: string, label: string) => <Editable value={t[f]} onChange={(v) => setText(f, v)} className={cls} label={label} />;
  switch (look.layout) {
    case "split":
      return (
        <>
          <Paint id="cloud" kind="cloud" lowres={10} className="tn-fill" seed={3} />
          <div className="tn-split" data-x="box">
            <div className="tn-split-copy">
              {E("head", "tn-serif tn-split-head", "Headline")}
              <div className="tn-split-foot">
                <div className="tn-cta"><Leaf className="tn-cta-icon" />{E("cta", "tn-cta-text", "Button text")}</div>
                <Wave className="tn-wave" />
                {E("note", "tn-note", "Caption")}
              </div>
            </div>
            <Paint id="main" kind="image" torn="left" className="tn-split-img" prompt />
          </div>
        </>
      );
    case "poster":
      return (
        <div className="tn-poster" data-x="box">
          <Paint id="grad" kind="gradient" seed={5} className="tn-poster-grad" />
          <div className="tn-poster-copy">
            {E("head", "tn-serif tn-poster-head", "Headline")}
            <span className="tn-bullet tn-b1"><i data-x="box" />{E("label1", "tn-label", "Label one")}</span>
            <span className="tn-bullet tn-b2"><i data-x="box" />{E("label2", "tn-label", "Label two")}</span>
            <span className="tn-bullet tn-b3"><i data-x="box" />{E("label3", "tn-label", "Label three")}</span>
          </div>
          <Paint id="main" kind="image" torn="left" seed={2} className="tn-poster-img" prompt />
          <div className="tn-trail" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => { const G = GLYPHS[i % 3]; return <span key={i} style={{ opacity: 1 - i * 0.16 }} data-o={1 - i * 0.16}><G /></span>; })}
          </div>
        </div>
      );
    case "chips":
      return (
        <>
          <Paint id="grad" kind="gradient" seed={8} className="tn-fill" />
          <div className="tn-chips">
            {E("head", "tn-serif tn-chips-head", "Line")}
            <div className="tn-chip-row">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="tn-chip">
                  <Paint id={`chip${i}`} kind="image" seed={i * 1.7 + 1} className="tn-chip-img" />
                  {i === 6 ? <Ring className="tn-chip-glyph" /> : <Spark className="tn-chip-glyph" />}
                </div>
              ))}
            </div>
            <ChipPrompt />
          </div>
        </>
      );
    case "ticket":
      return (
        <>
          <Paint id="cloud" kind="cloud" lowres={10} className="tn-fill" seed={6} />
          <div className="tn-ticket" data-x="box">
            <Paint id="main" kind="image" torn="right" seed={4} className="tn-ticket-img" prompt />
            <div className="tn-ticket-copy">
              {E("head", "tn-serif tn-ticket-head", "Title")}
              {E("sub", "tn-ticket-sub", "Subtitle")}
              <div className="tn-ticket-row">{E("date", "tn-mono", "Date")}{E("code", "tn-mono", "Code")}</div>
              <Barcode code={t.code} />
            </div>
          </div>
        </>
      );
  }
}

// ---------- export ----------
function radii(cs: CSSStyleDeclaration, w: number, h: number): number[] {
  return [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((r) => {
    const v = parseFloat(r) || 0; return r.endsWith("%") ? (v / 100) * Math.min(w, h) : v;
  });
}
function wrap(g: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []; let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? line + " " + word : word;
    if (g.measureText(next).width > width + 0.5 && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
async function svgImage(el: SVGSVGElement, color: string) {
  const c = el.cloneNode(true) as SVGSVGElement;
  c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const src = new XMLSerializer().serializeToString(c).replaceAll("currentColor", color);
  const im = new Image(); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src); await im.decode(); return im;
}

// ---------- the studio ----------
export default function Studio() {
  const [look, setLook] = useState<Look>(() => normalize(null));
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "load" | "png">("");
  const [drag, setDrag] = useState(false);
  const [toast, setToast] = useState("");
  const [motion, setMotion] = useState(true);
  const [noGL, setNoGL] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slots = useRef(new Map<string, Slot>());
  const R = useRef<Renderer | null>(null);
  const live = useRef({ look, photo, palette: DUSK as [RGB, RGB, RGB], motion, t0: 0, frozen: 4, kick: () => {} });
  live.current.look = look; live.current.photo = photo; live.current.motion = motion;

  // Load the saved look once on the client (hash first), then keep the hash and storage in step.
  useEffect(() => { setLook(initialLook()); setMotion(!matchMedia("(prefers-reduced-motion: reduce)").matches); setReady(true); }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORE, JSON.stringify(look)); } catch { /* fine */ }
    try { history.replaceState(null, "", "#" + encodeHash(look)); } catch { /* fine */ }
    live.current.kick();
  }, [look, ready]);

  const reg = useCallback<Reg>((key, s) => { if (s) slots.current.set(key, s); else slots.current.delete(key); live.current.kick(); }, []);

  const treatFor = useCallback((s: Slot): { T: Treatment; image: boolean } => {
    const { look: lk, photo: ph, palette } = live.current;
    const base = treatmentOf(lk);
    if (s.kind === "cloud") return { T: { ...PRESETS.gradient, warp: 0.9, scale: 0.15, grain: 0, marble: 1, palette }, image: false };
    if (s.kind === "gradient") return { T: { ...PRESETS.gradient, warp: base.warp, scale: Math.min(base.scale, 0.5), grain: base.grain, palette: DUSK }, image: false };
    if (!ph) return { T: { ...base, mode: 1, palette: [[0.93, 0.91, 0.95], [0.8, 0.84, 0.95], [0.95, 0.8, 0.86]] }, image: false };
    return { T: base, image: true };
  }, []);

  // One renderer, every slot, one animation loop. Paused when the tab is hidden or motion is off.
  useEffect(() => {
    const r = createRenderer();
    R.current = r; if (!r) setNoGL(true);
    let raf = 0, last = 0;
    live.current.t0 = performance.now();
    const frame = (now: number) => {
      raf = 0;
      const L = live.current;
      if (L.motion && !document.hidden && now - last < 30) { raf = requestAnimationFrame(frame); return; }
      last = now;
      const time = L.motion ? (now - L.t0) / 1000 : L.frozen;
      if (!L.motion) L.frozen = time;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      for (const s of slots.current.values()) {
        const k = s.lowres ? 1 / s.lowres : 1;
        const cw = s.el.clientWidth, ch = s.el.clientHeight; if (!cw || !ch) continue;
        const w = Math.max(2, Math.round(cw * dpr * k)), h = Math.max(2, Math.round(ch * dpr * k));
        if (s.el.width !== w || s.el.height !== h) { s.el.width = w; s.el.height = h; }
        const g = s.el.getContext("2d")!;
        g.clearRect(0, 0, w, h);
        if (r) {
          const { T, image } = treatFor(s);
          if (r.draw({ w, h, dpr: dpr * k, time, treatment: T, seed: s.seed, torn: s.torn, image })) g.drawImage(r.canvas, 0, 0);
        } else if (L.photo && s.kind === "image") {
          const p = L.photo.canvas, sc = Math.max(w / p.width, h / p.height);
          g.drawImage(p, (w - p.width * sc) / 2, (h - p.height * sc) / 2, p.width * sc, p.height * sc);
        }
      }
      if (L.motion && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    live.current.kick = kick;
    const onVis = () => kick();
    document.addEventListener("visibilitychange", onVis);
    r?.canvas.addEventListener("webglcontextrestored", kick);
    const ro = new ResizeObserver(kick); if (stageRef.current) ro.observe(stageRef.current);
    kick();
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis); ro.disconnect(); r?.destroy(); R.current = null; };
  }, [treatFor]);
  useEffect(() => { if (motion) live.current.t0 = performance.now() - live.current.frozen * 1000; live.current.kick(); }, [motion]);

  const usePhoto = useCallback((canvas: HTMLCanvasElement, name: string, sample?: boolean) => {
    R.current?.setImage(canvas);
    live.current.palette = paletteOf(canvas);
    setPhoto({ canvas, name, sample }); setError(null); live.current.kick();
  }, []);
  const openFile = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    setBusy("load"); setError(null);
    try { usePhoto(await decode(file), file.name); }
    catch (e) { setError(e instanceof Error ? e.message : "This image couldn't be read."); }
    finally { setBusy(""); }
  }, [usePhoto]);
  const pick = useCallback(() => fileRef.current?.click(), []);
  const sample = useCallback(() => usePhoto(paintSample(), "sample", true), [usePhoto]);
  const clear = () => { setPhoto(null); live.current.palette = DUSK; R.current?.setImage(null); live.current.kick(); };

  // Drop anywhere, paste anywhere.
  useEffect(() => {
    let depth = 0;
    const has = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes("Files");
    const enter = (e: DragEvent) => { if (has(e)) { depth++; setDrag(true); } };
    const leave = (e: DragEvent) => { if (has(e) && --depth <= 0) { depth = 0; setDrag(false); } };
    const over = (e: DragEvent) => { if (has(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => { if (!has(e)) return; e.preventDefault(); depth = 0; setDrag(false); openFile(e.dataTransfer!.files[0]); };
    const paste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.isContentEditable) return;
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); openFile(f); }
    };
    addEventListener("dragenter", enter); addEventListener("dragleave", leave); addEventListener("dragover", over); addEventListener("drop", drop); addEventListener("paste", paste);
    return () => { removeEventListener("dragenter", enter); removeEventListener("dragleave", leave); removeEventListener("dragover", over); removeEventListener("drop", drop); removeEventListener("paste", paste); };
  }, [openFile]);

  const T = treatmentOf(look);
  const setDial = (id: DialId, v: number) => setLook((l) => ({ ...l, dials: { ...(l.dials ?? {}), [id]: v } }));
  const setText = useCallback((f: string, v: string) => setLook((l) => ({ ...l, texts: { ...l.texts, [l.layout]: { ...(l.texts[l.layout] ?? {}), [f]: v } } })), []);
  const shuffle = () => setLook((l) => ({ ...l, dials: Object.fromEntries(DIALS.map((d) => [d.id, Math.round((0.15 + Math.random() * 0.7) * 100) / 100])) }));

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  async function exportPng() {
    const stage = stageRef.current; const r = R.current; if (!stage) return;
    setBusy("png");
    try {
      await document.fonts.ready;
      const box = stage.getBoundingClientRect();
      for (const scale of [Math.max(2, 1600 / box.width), 1]) {
        const out = document.createElement("canvas"); out.width = Math.round(box.width * scale); out.height = Math.round(box.height * scale);
        const g = out.getContext("2d"); if (!g) continue;
        g.scale(scale, scale); g.imageSmoothingQuality = "high";
        g.fillStyle = getComputedStyle(stage).backgroundColor; g.fillRect(0, 0, box.width, box.height);
        const time = live.current.motion ? (performance.now() - live.current.t0) / 1000 : live.current.frozen;
        for (const el of stage.querySelectorAll<HTMLElement>("[data-x]")) {
          const rc = el.getBoundingClientRect(); const x = rc.left - box.left, y = rc.top - box.top, w = rc.width, h = rc.height;
          if (!w || !h) continue;
          const cs = getComputedStyle(el);
          const kind = el.dataset.x;
          // The box's own radius, or the slot wrapper's (canvases sit inside a rounded wrapper).
          const shape = kind === "slot" ? getComputedStyle(el.parentElement!) : cs;
          g.save(); g.globalAlpha = Number(el.closest<HTMLElement>("[data-o]")?.dataset.o ?? 1);
          if (kind !== "text") { g.beginPath(); g.roundRect(x, y, w, h, radii(shape, w, h)); g.clip(); }
          if (kind === "box") { g.fillStyle = cs.backgroundColor; g.fillRect(x, y, w, h); }
          else if (kind === "slot") {
            const s = slots.current.get(el.dataset.slot!);
            if (s && r) {
              const k = s.lowres ? 1 / s.lowres : 1; const { T: tr, image } = treatFor(s);
              const pw = Math.max(2, Math.round(w * scale * k)), ph = Math.max(2, Math.round(h * scale * k));
              if (r.draw({ w: pw, h: ph, dpr: scale * k, time, treatment: tr, seed: s.seed, torn: s.torn, image })) g.drawImage(r.canvas, x, y, w, h);
            } else g.drawImage(el as HTMLCanvasElement, x, y, w, h);
          } else if (kind === "text") {
            g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
            g.fillStyle = cs.color; g.textBaseline = "middle";
            try { (g as unknown as { letterSpacing: string }).letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing; } catch { /* older browsers */ }
            const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
            const lines = wrap(g, (el.textContent ?? "").trim(), w);
            g.textAlign = cs.textAlign === "center" ? "center" : cs.textAlign === "right" || cs.textAlign === "end" ? "right" : "left";
            const tx = g.textAlign === "center" ? x + w / 2 : g.textAlign === "right" ? x + w : x;
            lines.forEach((ln, i) => g.fillText(ln, tx, y + lh * (i + 0.5)));
          } else if (kind === "svg") {
            g.drawImage(await svgImage(el as unknown as SVGSVGElement, cs.color), x, y, w, h);
          }
          g.restore();
        }
        const blob = await new Promise<Blob | null>((res) => out.toBlob(res, "image/png"));
        if (!blob) continue;
        const name = `tincture-${look.layout}-${look.preset}.png`;
        const file = new File([blob], name, { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
        if (matchMedia("(pointer: coarse)").matches && nav.canShare?.({ files: [file] })) {
          try { await nav.share({ files: [file], title: "tincture" }); return; } catch { /* cancelled: fall through to download */ }
        }
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        flash(`Saved ${out.width}×${out.height} PNG`);
        return;
      }
      throw new Error("blank");
    } catch { setError("The PNG couldn't be made in this browser. Try again, or try a smaller window."); }
    finally { setBusy(""); live.current.kick(); }
  }

  const snippet = useMemo(() => {
    const torn = look.layout === "ticket" ? "right" : look.layout === "chips" ? "" : "left";
    const props = [`src="/your-photo.jpg"`, `preset="${look.preset}"`, ...DIALS.map((d) => `${d.id}={${T[d.id]}}`), torn ? `torn="${torn}"` : ""].filter(Boolean);
    return `// 1. Save https://frontend.vedantsoni.com/effects/Tincture.tsx into your app (one file, MIT, React only).\n// 2. Use it anywhere. It fills its box like object-fit: cover.\nimport Tincture from "./Tincture";\n\n<div style={{ width: 480, height: 600 }}>\n  <Tincture ${props.join(" ")} />\n</div>\n`;
  }, [look.layout, look.preset, T]);
  async function copyCode() {
    try { await navigator.clipboard.writeText(snippet); flash("Copied. Save Tincture.tsx next to it."); }
    catch { const ta = document.createElement("textarea"); ta.value = snippet; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); flash("Copied"); }
  }

  const ctx = useMemo(() => ({ reg, empty: !photo, pick, sample }), [reg, photo, pick, sample]);

  return (
    <div className="tn">
      <header className="tn-top">
        <span className="tn-brand"><Spark className="tn-brand-mark" />tincture</span>
        <h1 className="tn-title">Your photo, melted into ready-made layouts</h1>
        <p className="tn-credit">After <a href={POST} target="_blank" rel="noreferrer">Yax_buzz&rsquo;s UI element designs</a> · free, MIT</p>
      </header>

      <main className="tn-main">
        <section className="tn-stage-wrap" aria-label="Preview">
          <div className="tn-layouts" role="tablist" aria-label="Layout">
            {LAYOUTS.map((l) => (
              <button key={l.id} role="tab" aria-selected={look.layout === l.id} className={look.layout === l.id ? "on" : ""} onClick={() => setLook((x) => ({ ...x, layout: l.id }))}>{l.label}</button>
            ))}
          </div>
          <SlotCtx.Provider value={ctx}>
            <div ref={stageRef} className={`tn-stage tn-l-${look.layout}`} data-layout={look.layout}>
              <Layout look={look} setText={setText} />
              {busy === "load" && <div className="tn-state">Reading your photo…</div>}
              {drag && <div className="tn-state tn-drop">Drop to melt it</div>}
            </div>
          </SlotCtx.Provider>
          {error && <div className="tn-error" role="alert"><span>{error}</span><button onClick={() => setError(null)}>Dismiss</button><button onClick={pick}>Choose another</button></div>}
          {noGL && <p className="tn-note">WebGL is off in this browser, so you see the plain photo. The effects need WebGL (any recent browser has it).</p>}
          <p className="tn-hint">Click any text in the layout to change it.</p>
        </section>

        <aside className="tn-panel" aria-label="Controls">
          <div className="tn-group">
            <button className="tn-primary" onClick={pick} disabled={busy === "load"}>{photo && !photo.sample ? "Choose another photo" : "Choose your photo"}</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => { openFile(e.target.files?.[0]); e.target.value = ""; }} />
            <p className="tn-small">{photo ? (photo.sample ? "Showing our sample. " : `Using ${photo.name}. `) : "Or drop or paste one anywhere. "}Your photo stays on this device: nothing is uploaded.</p>
            <div className="tn-row">
              {!photo && <button className="tn-ghost" onClick={sample}>Try a sample</button>}
              {photo && <button className="tn-ghost" onClick={clear}>Remove photo</button>}
              <button className="tn-ghost" onClick={() => setMotion((m) => !m)} aria-pressed={!motion}>{motion ? "Pause motion" : "Play motion"}</button>
            </div>
          </div>

          <div className="tn-group">
            <h2>Treatment</h2>
            <div className="tn-chips-pick">
              {PRESET_IDS.map((p: PresetId) => (
                <button key={p} className={look.preset === p ? "on" : ""} aria-pressed={look.preset === p} onClick={() => setLook((l) => ({ ...l, preset: p, dials: null }))}>{PRESETS[p].label}</button>
              ))}
            </div>
            {DIALS.map((d) => (
              <label key={d.id} className="tn-dial">
                <span>{d.label}<b>{Math.round(T[d.id] * 100)}</b></span>
                <input type="range" min={0} max={1} step={0.01} value={T[d.id]} aria-label={d.label} onChange={(e) => setDial(d.id, Number(e.target.value))} />
              </label>
            ))}
            <div className="tn-row">
              <button className="tn-ghost" onClick={() => setLook((l) => ({ ...l, dials: null }))}>Reset dials</button>
              <button className="tn-ghost" onClick={shuffle}>Shuffle</button>
            </div>
          </div>

          <div className="tn-group">
            <h2>Take it away</h2>
            <button className="tn-primary" onClick={exportPng} disabled={busy === "png"}>{busy === "png" ? "Making PNG…" : "Download PNG"}</button>
            <button className="tn-ghost tn-wide" onClick={copyCode}>Copy as React component</button>
            <p className="tn-small">The component is one file, <a href="/effects/Tincture.tsx" target="_blank" rel="noreferrer">Tincture.tsx</a>, with the shader inside. The link to this look is in your address bar.</p>
          </div>

          <details className="tn-group tn-how">
            <summary>How it works</summary>
            <ol>
              <li>Pick a layout above the preview, then choose, drop or paste a photo.</li>
              <li>Pick a treatment and move the dials: Warp and Scale shape the melt, Edge tears the paper, Grain and Tint finish it.</li>
              <li>Click any words to rewrite them, then download the PNG or copy the component.</li>
            </ol>
            <p className="tn-small">One WebGL shader does it all: fbm domain warp, posterize, tint, glow, film grain and a noise-torn edge. Open source at <a href="https://github.com/VedSoni-dev/frontend/tree/main/pieces/effects" target="_blank" rel="noreferrer">pieces/effects</a>.</p>
          </details>
        </aside>
      </main>
      {toast && <div className="tn-toast" role="status">{toast}</div>}
    </div>
  );
}
