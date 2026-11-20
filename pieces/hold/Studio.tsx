"use client";
// baize: the page. Three hold-to-confirm pool tables, as in the post; press and hold one and it breaks. "Make it yours"
// changes each button's words, felt and ball and the shared feel (hold time, size, sound); "Copy" gives the HTML, a React
// component or the one file. No AI, nothing uploaded, settings stay in this browser.
import { useEffect, useRef, useState } from "react";
import { BALL_COLORS, DEFAULTS as ENGINE, FELTS, mount, normalize, RATIO, type Baize } from "./baize.js";
import { CDN, fileWithUsage, htmlSnippet, reactFile, type ButtonCfg, type Settings } from "./exportCode";

const POST = "https://x.com/ozzyxs1a/status/2123441401904144799";
const KEY = "baize:v1";
const DEFAULTS: Settings = {
  v: 1,
  buttons: [
    { label: "Hold to confirm", done: "Confirmed", felt: "green", ball: 8 },
    { label: "Hold to send", done: "Sent", felt: "blue", ball: 9 },
    { label: "Hold to delete", done: "Deleted", felt: "red", ball: 1 },
  ],
  count: 3,
  hold: ENGINE.hold,
  size: 112,
  reset: ENGINE.reset,
  sound: false,
};
const FELT_NAMES = Object.keys(FELTS) as (keyof typeof FELTS)[];
const ballColor = (n: number) => BALL_COLORS[(n - 1) % 8];

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const s = JSON.parse(raw) as Partial<Settings>;
    const buttons = DEFAULTS.buttons.map((d, i) => {
      const b = normalize({ ...d, ...(s.buttons?.[i] ?? {}) });
      return { label: b.label, done: b.done, felt: b.felt, ball: b.ball };
    });
    const f = normalize({ hold: s.hold, size: s.size, reset: s.reset, sound: s.sound });
    return { v: 1, buttons, count: Math.min(3, Math.max(1, Math.round(Number(s.count) || 3))), hold: f.hold, size: f.size, reset: f.reset, sound: f.sound };
  } catch { return DEFAULTS; }
}

export default function Studio() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [heard, setHeard] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const [fit, setFit] = useState(DEFAULTS.size);
  const loaded = useRef(false);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => { setS(load()); loaded.current = true; }, []);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked: fine */ } }, [s]);
  useEffect(() => { if (!note) return; const id = setTimeout(() => setNote(""), 2600); return () => clearTimeout(id); }, [note]);
  useEffect(() => { if (!heard) return; const id = setTimeout(() => setHeard(null), 3200); return () => clearTimeout(id); }, [heard]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [open]);
  // the buttons show at your size, smaller only when the screen can't hold them
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - 8, h = el.clientHeight - 40;
      const byW = w / RATIO, byH = h / (s.count * 1.0 + (s.count - 1) * 0.55 + 0.4);
      setFit(Math.max(36, Math.floor(Math.min(s.size, byW, byH))));
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [s.size, s.count]);

  const setB = (i: number, k: keyof ButtonCfg, v: string | number) =>
    setS((p) => ({ ...p, buttons: p.buttons.map((b, j) => (j === i ? { ...b, [k]: v } : b)) }));
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  async function put(text: string, done: string) {
    try { await navigator.clipboard.writeText(text); setNote(done); } catch { setFallback(text); }
  }
  async function copyFile() {
    try { const r = await fetch("/hold/baize.js"); if (!r.ok) throw new Error(); await put(fileWithUsage(await r.text(), s), "Copied baize.js with your buttons on top"); }
    catch { setNote("Couldn't fetch the file. Open /hold/baize.js instead."); }
  }
  const pct = (v: number, a: number, b: number) => ({ "--v": `${((v - a) / (b - a)) * 100}%` }) as React.CSSProperties;
  const clean = (b: ButtonCfg) => { const n = normalize(b); return { label: n.label, done: n.done, felt: n.felt, ball: n.ball }; };

  return (
    <div className="bz">
      <div className="bz-hero">
        <header className="bz-top">
          <div className="bz-corner">
            <span className="bz-brand"><Mark /> baize</span>
            <h1 className="bz-title">A hold-to-confirm button that sinks a pool shot</h1>
            <p className="bz-credit">after <a href={POST} target="_blank" rel="noreferrer">ozzy&apos;s &ldquo;hold to confirm, but pool&rdquo;</a> · free, MIT · <a href="/">All pieces</a></p>
          </div>

          <div className="bz-panel">
            <div className="bz-dock">
              <button className="bz-chip" aria-expanded={open} aria-controls="bz-tune" onClick={() => setOpen((v) => !v)}>
                {open ? "Close" : "Make it yours"}
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d={open ? "M3 7.5l3-3 3 3" : "M3 4.5l3 3 3-3"} /></svg>
              </button>
              <button className="bz-chip" onClick={() => put(htmlSnippet(s), "Copied the HTML with your buttons")}>Copy HTML</button>
              <button className="bz-chip" onClick={() => put(reactFile(s), "Copied HoldButton.tsx")}>Copy React</button>
              <button className="bz-chip bz-primary" onClick={copyFile}>Copy baize.js</button>
            </div>
            <p className="bz-note" role="status">{note}</p>
            {open && (
              <div className="bz-body" id="bz-tune">
                <section className="bz-sec">
                  <h2><i>1</i>Your buttons</h2>
                  <div className="bz-seg" role="radiogroup" aria-label="How many buttons">
                    {[1, 2, 3].map((n) => (
                      <button key={n} role="radio" aria-checked={s.count === n} className={s.count === n ? "bz-on" : ""} onClick={() => set("count", n)}>{n === 1 ? "One" : n === 2 ? "Two" : "Three"}</button>
                    ))}
                  </div>
                  {s.buttons.slice(0, s.count).map((b, i) => (
                    <fieldset className="bz-btn" key={i}>
                      <legend><span className="bz-swatch" style={{ background: FELTS[b.felt as keyof typeof FELTS] ?? b.felt }} />Button {i + 1}</legend>
                      <div className="bz-two">
                        <label className="bz-field">Says<input value={b.label} maxLength={40} onChange={(e) => setB(i, "label", e.target.value)} onBlur={() => setB(i, "label", clean(b).label)} /></label>
                        <label className="bz-field">When done<input value={b.done} maxLength={40} onChange={(e) => setB(i, "done", e.target.value)} onBlur={() => setB(i, "done", clean(b).done)} /></label>
                      </div>
                      <div className="bz-felts" role="radiogroup" aria-label={`Felt for button ${i + 1}`}>
                        {FELT_NAMES.map((f) => (
                          <button key={f} role="radio" aria-checked={b.felt === f} aria-label={f} title={f} className={b.felt === f ? "bz-on" : ""} style={{ background: FELTS[f] }} onClick={() => setB(i, "felt", f)} />
                        ))}
                        <label className={`bz-own${b.felt.startsWith("#") ? " bz-on" : ""}`} title="Your colour">
                          <input type="color" aria-label={`Your felt colour for button ${i + 1}`} value={b.felt.startsWith("#") ? b.felt : FELTS[b.felt as keyof typeof FELTS] ?? "#33a05e"} onChange={(e) => setB(i, "felt", e.target.value)} />
                        </label>
                        <label className="bz-ball">Ball
                          <select value={b.ball} onChange={(e) => setB(i, "ball", Number(e.target.value))} style={{ "--bc": ballColor(b.ball) } as React.CSSProperties}>
                            {Array.from({ length: 15 }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}{n > 8 ? " stripe" : ""}</option>)}
                          </select>
                        </label>
                      </div>
                    </fieldset>
                  ))}
                </section>
                <section className="bz-sec">
                  <h2><i>2</i>How it feels</h2>
                  <Range label="Hold for" v={s.hold} a={400} b={3000} step={50} show={`${(s.hold / 1000).toFixed(2)} s`} on={(v) => set("hold", v)} style={pct(s.hold, 400, 3000)} />
                  <Range label="Height" v={s.size} a={48} b={160} step={2} show={`${s.size} px`} on={(v) => set("size", v)} style={pct(s.size, 48, 160)} />
                  <Range label="Racks again after" v={s.reset} a={0} b={5000} step={100} show={s.reset === 0 ? "stays done" : `${(s.reset / 1000).toFixed(1)} s`} on={(v) => set("reset", v)} style={pct(s.reset, 0, 5000)} />
                  <label className="bz-toggle"><input type="checkbox" checked={s.sound} onChange={(e) => set("sound", e.target.checked)} /><span aria-hidden="true" />Sound (the cue, the clack, the drop)</label>
                  <button className="bz-reset" onClick={() => setS(DEFAULTS)}>Start over</button>
                </section>
              </div>
            )}
          </div>
        </header>

        <div className="bz-stage" ref={stage}>
          <div className="bz-stack" style={{ gap: `${Math.round(fit * 0.55)}px` }}>
            {s.buttons.slice(0, s.count).map((b, i) => (
              <Hold key={i} cfg={b} size={fit} hold={s.hold} reset={s.reset} sound={s.sound} onConfirm={(d) => setHeard(`confirm → "${d.done}"`)} />
            ))}
          </div>
          <p className="bz-heard" aria-hidden="true">{heard ?? "Press and hold. Let go early and the shot rolls back."}</p>
        </div>
      </div>

      <section className="bz-howto" aria-labelledby="bz-howto-h">
        <h2 id="bz-howto-h">Put it on your site</h2>
        <ol>
          <li><b>Set your buttons</b> under &ldquo;Make it yours&rdquo;: what each one says, what it says when done, the felt and the ball. The tables above change as you type.</li>
          <li><b>Any site:</b> &ldquo;Copy HTML&rdquo; and paste it into your page. One <code>&lt;script type=&quot;module&quot; src=&quot;{CDN}&quot;&gt;</code>, then a <code>&lt;baize-hold label=&quot;Hold to send&quot; done=&quot;Sent&quot; felt=&quot;blue&quot; ball=&quot;9&quot;&gt;</code> wherever you want one. It fires <code>confirm</code> when the ball drops.</li>
          <li><b>React:</b> &ldquo;Copy React&rdquo; gives <code>HoldButton.tsx</code>. Save <code>baize.js</code> next to it and use <code>&lt;HoldButton label=&quot;Hold to delete&quot; onConfirm=&#123;remove&#125; /&gt;</code>.</li>
          <li><b>Your own copy:</b> &ldquo;Copy baize.js&rdquo; and host the one file yourself. No dependencies, nothing loaded from anywhere.</li>
        </ol>
        <h2>How it works</h2>
        <p>Each button is a real <code>&lt;button&gt;</code> in a shadow root, drawn in CSS: a maple rail with diamonds, a felt bed, a pocket, two balls and a cue. Pressing (mouse, touch, Space or Enter) brings the cue in; while you hold, it draws back and the words fill white. At full power it strikes: the cue ball rolls to the object ball, the object ball rolls on into the pocket and drops, and the words change. Let go early and it plays a soft shot that rolls back, so nothing happens by accident. Everything moves with <code>transform</code> and <code>opacity</code>; with reduced motion the balls stay put and only the words and the check change. Sound is off unless you turn it on, and it&apos;s made in code with Web Audio.</p>
      </section>

      {fallback && (
        <div className="bz-card" role="dialog" aria-label="Copy this">
          <p>Your browser blocked the clipboard. Select all and copy:</p>
          <textarea readOnly value={fallback} onFocus={(e) => e.currentTarget.select()} />
          <button onClick={() => setFallback(null)}>Done</button>
        </div>
      )}
    </div>
  );
}

function Hold({ cfg, size, hold, reset, sound, onConfirm }: { cfg: ButtonCfg; size: number; hold: number; reset: number; sound: boolean; onConfirm: (d: { label: string; done: string }) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const ctl = useRef<Baize | null>(null);
  const cb = useRef(onConfirm);
  cb.current = onConfirm;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    ctl.current = mount(el, { onConfirm: (d) => cb.current(d) });
    return () => { ctl.current?.destroy(); ctl.current = null; };
  }, []);
  useEffect(() => { ctl.current?.set({ ...cfg, size, hold, reset, sound }); }, [cfg, size, hold, reset, sound]);
  return <div ref={ref} className="bz-hold" />;
}

function Range({ label, v, a, b, step, show, on, style }: { label: string; v: number; a: number; b: number; step: number; show: string; on: (v: number) => void; style: React.CSSProperties }) {
  return (
    <div className="bz-range" style={style}>
      <label>{label}<output>{show}</output>
        <input type="range" min={a} max={b} step={step} value={v} onChange={(e) => on(Number(e.target.value))} />
      </label>
    </div>
  );
}

function Mark() {
  return (
    <svg className="bz-mark" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="4" width="14" height="8" rx="4" fill="currentColor" opacity=".3" />
      <circle cx="5" cy="8" r="2" fill="currentColor" />
      <circle cx="11.5" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
