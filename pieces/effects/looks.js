// tincture's one serializable state: which layout, which preset, the five dials, the editable words.
// Pure (no DOM), so it runs in node for test-looks.mjs. Params only: the photo never goes in here.
export const VERSION = 1;
export const PRESET_IDS = ["liquid", "marble", "torn", "glow", "gradient", "posterize"];
export const LAYOUTS = [
  { id: "split", label: "Split card" },
  { id: "poster", label: "Poster" },
  { id: "chips", label: "Chip row" },
  { id: "ticket", label: "Ticket" },
];
export const DIALS = [
  { id: "warp", label: "Warp" },
  { id: "scale", label: "Scale" },
  { id: "grain", label: "Grain" },
  { id: "edge", label: "Edge" },
  { id: "tint", label: "Tint" },
];
export const TEXTS = {
  split: { head: "A field guide to slow mornings", cta: "Open the guide", note: "Seven short walks, one every day, printed on paper you can fold." },
  poster: { head: "Small rooms, long light", label1: "Issue 04", label2: "Spring", label3: "Free" },
  chips: { head: "Seven days in a row. Keep going." },
  ticket: { head: "Night garden", sub: "Admit one · Gate C", date: "Sat 14 Mar · 21:00", code: "TNC-0414" },
};
export const DEFAULT_LOOK = { v: VERSION, layout: "split", preset: "liquid", dials: null, texts: {} };

const clamp01 = (x) => (typeof x === "number" && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : null);

/** Any stored or hand-edited value back to a valid look. Unknown fields are dropped, numbers clamped. */
export function normalize(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const layout = LAYOUTS.some((l) => l.id === o.layout) ? o.layout : DEFAULT_LOOK.layout;
  const preset = PRESET_IDS.includes(o.preset) ? o.preset : DEFAULT_LOOK.preset;
  let dials = null;
  if (o.dials && typeof o.dials === "object") {
    dials = {};
    for (const d of DIALS) { const v = clamp01(o.dials[d.id]); if (v !== null) dials[d.id] = Math.round(v * 100) / 100; }
    if (!Object.keys(dials).length) dials = null;
  }
  const texts = {};
  if (o.texts && typeof o.texts === "object") {
    for (const [k, def] of Object.entries(TEXTS)) {
      const t = o.texts[k];
      if (!t || typeof t !== "object") continue;
      for (const f of Object.keys(def)) if (typeof t[f] === "string") (texts[k] ??= {})[f] = t[f].slice(0, 140);
    }
  }
  return { v: VERSION, layout, preset, dials, texts };
}

/** The look as a URL hash (#look=...), short enough to paste in a post. Texts stay out of it. */
export function encodeHash(look) {
  const l = normalize(look);
  const d = l.dials ? DIALS.map((x) => (l.dials[x.id] ?? "")).join(",") : "";
  return `look=${l.layout}.${l.preset}${d ? "." + d : ""}`;
}
export function decodeHash(hash) {
  const m = /look=([a-z]+)\.([a-z]+)(?:\.([0-9.,]*))?/.exec(String(hash || ""));
  if (!m) return null;
  const dials = {};
  if (m[3]) m[3].split(",").forEach((s, i) => { if (s !== "" && DIALS[i]) dials[DIALS[i].id] = Number(s); });
  return normalize({ layout: m[1], preset: m[2], dials });
}
