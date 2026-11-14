"use client";
// vellum: the page. Scroll down and your footer rises; "Make it yours" changes the word, photo, links and glass;
// "Copy" gives Glass.tsx (React) or one HTML file with your settings. No AI, nothing uploaded: a photo you pick stays in this tab.
import { useEffect, useRef, useState } from "react";
import Glass, { GLASS_DEFAULTS } from "./Glass";
import { htmlFile, reactFile, type GlassSettings } from "./exportCode";

const POST = "https://x.com/sonia_axion/status/2121301089458987125";
const KEY = "vellum:v1";
const PHOTOS = [
  { id: "ember", label: "Ember" },
  { id: "dusk", label: "Dusk" },
  { id: "petal", label: "Petal" },
];
const photoUrl = (id: string) => `/glass/${id}.jpg`;
const DEFAULTS: GlassSettings = { ...GLASS_DEFAULTS, photo: photoUrl("ember") };

const linksToText = (l: GlassSettings["links"]) => l.map((x) => (x.href && x.href !== "#" ? `${x.label} = ${x.href}` : x.label)).join("\n");
const textToLinks = (t: string) =>
  t.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10).map((s) => {
    const [label, href] = s.split("=").map((y) => y.trim());
    return { label, href: href || "#" };
  });

export default function Studio() {
  const [o, setO] = useState<GlassSettings>(DEFAULTS);
  const [linksText, setLinksText] = useState(linksToText(DEFAULTS.links));
  const [open, setOpen] = useState(false);
  const [howto, setHowto] = useState(false);
  const [note, setNote] = useState("");
  const [fallback, setFallback] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const loaded = useRef(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<GlassSettings>) };
        if (s.photo.startsWith("blob:")) s.photo = DEFAULTS.photo; // an upload doesn't survive a reload
        setO(s); setLinksText(linksToText(s.links));
      }
    } catch { /* storage blocked: start from the defaults */ }
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* fine */ } }, [o]);
  useEffect(() => { if (!note) return; const id = setTimeout(() => setNote(""), 2600); return () => clearTimeout(id); }, [note]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [open]);

  const set = <K extends keyof GlassSettings>(k: K, v: GlassSettings[K]) => setO((p) => ({ ...p, [k]: v }));

  function pickFile(f: File | undefined) {
    if (!f || !f.type.startsWith("image/")) return;
    set("photo", URL.createObjectURL(f));
    setNote("Your photo is in. It stays on this computer.");
  }
  async function put(text: string, done: string) {
    try { await navigator.clipboard.writeText(text); setNote(done); } catch { setFallback(text); }
  }
  async function copyReact() {
    try { await put(reactFile(await (await fetch("/glass/Glass.tsx")).text(), o), "Copied Glass.tsx with your settings"); }
    catch { setNote("Couldn't fetch the file. Open /glass/Glass.tsx instead."); }
  }
  async function copyHtml() {
    try { await put(htmlFile(await (await fetch("/glass/glass.js")).text(), o), "Copied the HTML + CSS with your settings"); }
    catch { setNote("Couldn't fetch the engine. Open /glass/glass.js instead."); }
  }
  const pct = (v: number, a: number, b: number) => ({ "--v": `${((v - a) / (b - a)) * 100}%` }) as React.CSSProperties;

  return (
    <div className="gl">
      <header className="gl-top">
        <div className="gl-corner">
          <span className="gl-brand"><Mark /> vellum</span>
          <h1 className="gl-title">A frosted-glass footer with your word cut into it</h1>
          <p className="gl-credit">after <a href={POST} target="_blank" rel="noreferrer">Sonia Tkachuk&apos;s footer (Axion)</a> · free, MIT · <a href="/">All pieces</a></p>
        </div>

        <div className="gl-panel">
          <div className="gl-dock">
            <button className="gl-chip" aria-expanded={open} aria-controls="gl-tune" onClick={() => setOpen((v) => !v)}>
              {open ? "Close" : "Make it yours"}
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d={open ? "M3 7.5l3-3 3 3" : "M3 4.5l3 3 3-3"} /></svg>
            </button>
            <button className="gl-chip" onClick={() => setReplay((n) => n + 1)}>Replay</button>
          </div>
          <p className="gl-note" role="status">{note}</p>
          {open && (
            <div className="gl-body" id="gl-tune">
              <section className="gl-sec">
                <h2><i>1</i>Your word</h2>
                <label className="gl-field"><span className="gl-sr">Your word</span>
                  <input className="gl-big" value={o.word} maxLength={14} onChange={(e) => set("word", e.target.value)} placeholder={DEFAULTS.word} spellCheck={false} />
                </label>
                <p className="gl-sub">Short words look best: 4 to 8 letters.</p>
              </section>
              <section className="gl-sec">
                <h2><i>2</i>Your photo</h2>
                <div className="gl-photos" role="radiogroup" aria-label="Photo">
                  {PHOTOS.map((p) => (
                    <button key={p.id} role="radio" aria-checked={o.photo === photoUrl(p.id)} className={o.photo === photoUrl(p.id) ? "gl-on" : ""} onClick={() => set("photo", photoUrl(p.id))}>
                      <img src={`/glass/${p.id}-thumb.jpg`} alt="" /><span>{p.label}</span>
                    </button>
                  ))}
                  <button className={o.photo.startsWith("blob:") ? "gl-on gl-up" : "gl-up"} onClick={() => file.current?.click()}>
                    <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 9V3M3.5 5.5 6 3l2.5 2.5" /></svg><span>Yours</span>
                  </button>
                  <input ref={file} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
                </div>
                <p className="gl-sub">Busy, colourful photos with sharp detail show the clear letters best. Nothing is uploaded.</p>
              </section>
              <section className="gl-sec">
                <h2><i>3</i>The glass</h2>
                <Range label="Frost" v={o.blur} a={4} b={40} unit="px" on={(v) => set("blur", v)} style={pct(o.blur, 4, 40)} />
                <Range label="Photo softness" v={o.soft} a={0} b={20} unit="px" on={(v) => set("soft", v)} style={pct(o.soft, 0, 20)} />
                <Range label="Panel height" v={Math.round(o.panel * 100)} a={30} b={70} unit="%" on={(v) => set("panel", v / 100)} style={pct(o.panel * 100, 30, 70)} />
                <label className="gl-color">Mark colour <input type="color" value={o.accent} onChange={(e) => set("accent", e.target.value)} /><code>{o.accent}</code></label>
              </section>
              <section className="gl-sec">
                <h2><i>4</i>Words and links</h2>
                <label className="gl-field">Headline<input value={o.headline} maxLength={70} onChange={(e) => set("headline", e.target.value)} /></label>
                <label className="gl-field">Line under it<input value={o.sub} maxLength={110} onChange={(e) => set("sub", e.target.value)} /></label>
                <label className="gl-field">Button<input value={o.cta} maxLength={24} onChange={(e) => set("cta", e.target.value)} /></label>
                <label className="gl-field">Links, one per line: <code>Label</code> or <code>Label = /path</code>
                  <textarea rows={6} value={linksText} onChange={(e) => { setLinksText(e.target.value); set("links", textToLinks(e.target.value)); }} spellCheck={false} />
                </label>
                <button className="gl-reset" onClick={() => { setO(DEFAULTS); setLinksText(linksToText(DEFAULTS.links)); }}>Start over</button>
              </section>
            </div>
          )}
        </div>
      </header>

      <section className="gl-copy" aria-label="Copy it">
        <div className="gl-copyrow">
          <button className="gl-chip gl-primary" onClick={copyReact}>Copy React (Glass.tsx)</button>
          <button className="gl-chip" onClick={copyHtml}>Copy HTML + CSS</button>
          <button className="gl-link" aria-expanded={howto} onClick={() => setHowto((v) => !v)}>
            How to use it and how it works <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>
          </button>
        </div>
        {howto && (
          <div className="gl-howto">
            <ol>
              <li><b>Pick your word and photo</b> under &ldquo;Make it yours&rdquo;. Everything you change shows below, live.</li>
              <li><b>React:</b> &ldquo;Copy React&rdquo;, save it as <code>Glass.tsx</code> in your app, then put <code>&lt;Glass word=&quot;…&quot; photo=&quot;/your-photo.jpg&quot; /&gt;</code> at the bottom of your page. The copied file starts with your exact settings.</li>
              <li><b>Any site:</b> &ldquo;Copy HTML + CSS&rdquo; and paste it before <code>&lt;/body&gt;</code>. One style block, the footer, one short script.</li>
              <li><b>Your own photo:</b> it never leaves this computer. Put the file in your site&apos;s public folder and point <code>photo</code> (or <code>--photo</code>) at it.</li>
              <li><b>How it works:</b> the card shows your photo, softly blurred. The panel is a <code>backdrop-filter</code> frost over it. Each letter&apos;s background is the same photo, sharp and a touch brighter, lined up with the card and cut to the letter with <code>background-clip: text</code>, so you see straight through the frost. The entrance only moves <code>transform</code> and <code>opacity</code>; with reduced motion it just shows.</li>
            </ol>
          </div>
        )}
      </section>

      <div className="gl-cue" aria-hidden="true"><span>scroll</span><i /></div>

      <div className="gl-stage">
        <Glass {...o} replay={replay} />
      </div>

      {fallback && (
        <div className="gl-card" role="dialog" aria-label="Copy this">
          <p>Your browser blocked the clipboard. Select all and copy:</p>
          <textarea readOnly value={fallback} onFocus={(e) => e.currentTarget.select()} />
          <button onClick={() => setFallback(null)}>Done</button>
        </div>
      )}
    </div>
  );
}

function Range({ label, v, a, b, unit, on, style }: { label: string; v: number; a: number; b: number; unit: string; on: (v: number) => void; style: React.CSSProperties }) {
  return (
    <div className="gl-range" style={style}>
      <label>{label}<output>{v}{unit}</output>
        <input type="range" min={a} max={b} step={1} value={v} onChange={(e) => on(Number(e.target.value))} />
      </label>
    </div>
  );
}

function Mark() {
  return (
    <svg className="gl-mark" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="5" cy="5" r="3.2" fill="currentColor" />
      <rect x="2" y="10" width="12" height="3.4" rx="1.7" fill="currentColor" />
    </svg>
  );
}
