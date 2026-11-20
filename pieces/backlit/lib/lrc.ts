// Synced lyrics: parse LRC text into timed lines and find the line playing at a moment.
// Pure functions, no DOM, so they run in the browser, on the server and under `node --test`.

export type Word = { t: number; text: string };
/** A lyric line. `words` (when known) say when each word is sung; `end` is when the line stops. */
export type Line = { t: number; text: string; end?: number; words?: Word[] };

const STAMP = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g;

/** "[01:02.50]words" → [{ t: 62.5, text: "words" }], sorted by time. Lines with several stamps repeat.
 *  Empty lyric lines are kept (text "") because they mark an instrumental gap: the stage clears there.
 *  Honors an [offset:+/-ms] tag the way players do (positive = lyrics come earlier). */
export function parseLrc(src: string): Line[] {
  const out: Line[] = [];
  let offset = 0;
  for (const raw of src.replace(/\r/g, "").split("\n")) {
    const off = raw.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/i);
    if (off) { offset = Number(off[1]) / 1000; continue; }
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    STAMP.lastIndex = 0;
    let end = 0;
    while ((m = STAMP.exec(raw))) {
      if (m.index !== end && raw.slice(end, m.index).trim()) break; // stamps only at the start
      stamps.push(Number(m[1]) * 60 + Number(m[2].replace(":", ".")));
      end = STAMP.lastIndex;
    }
    if (!stamps.length) continue;
    // word-level <00:01.23> tags (enhanced LRC) are dropped: we animate whole lines
    const text = raw.slice(end).replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, "").replace(/\s+/g, " ").trim();
    for (const t of stamps) out.push({ t: Math.max(0, t - offset), text });
  }
  out.sort((a, b) => a.t - b.t);
  // collapse runs of empty lines into one gap marker
  return out.filter((l, i) => l.text || !(i > 0 && !out[i - 1].text));
}

/** Plain (unsynced) lyrics → evenly spread lines over the song, so they still flow. Marked as estimated by the caller. */
export function spreadPlain(src: string, duration: number): Line[] {
  const lines = src.replace(/\r/g, "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return [];
  const start = Math.min(12, duration * 0.08), span = Math.max(1, duration - start - Math.min(10, duration * 0.06));
  return lines.map((text, i) => ({ t: start + (span * i) / lines.length, text }));
}

/** Index of the line playing at time `t` (seconds), or -1 before the first line. Binary search. */
export function lineAt(lines: Line[], t: number): number {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/** "62.5" → "1:02". */
export function clock(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Best guess at "Artist - Title" from a file name, for files without tags. */
export function guessFromFilename(name: string): { title: string; artist: string } {
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/_/g, " ").replace(/^\d{1,3}[\s.\-]+/, "").trim();
  const parts = base.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  return { artist: "", title: base };
}

/** A lyrics record or search summary from LRCLIB (the v2 search returns has* flags, records carry the lyrics). */
export type Hit = {
  id: number; trackName: string; artistName: string; albumName?: string; duration: number; instrumental?: boolean;
  hasWordSync?: boolean; hasSyncedLyrics?: boolean; hasPlainLyrics?: boolean; syncedLyrics?: string | null; plainLyrics?: string | null;
};
export const hitKind = (h: Hit): "words" | "lines" | "plain" | "none" =>
  h.hasWordSync ? "words" : h.hasSyncedLyrics || h.syncedLyrics ? "lines" : h.hasPlainLyrics || h.plainLyrics ? "plain" : "none";

export const normTitle = (s = "") => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\(.*?\)|\[.*?\]|\s(feat|ft)\..*$/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Pick the best record for a song we know: word timing first, then line timing, then the closest length and title. */
export function pickHit(hits: Hit[], want: { title?: string; artist?: string; duration?: number }): Hit | null {
  if (!hits.length) return null;
  const wt = normTitle(want.title), wa = normTitle(want.artist).split(" ")[0] ?? "";
  const score = (h: Hit) => {
    const k = hitKind(h);
    let s = k === "words" ? 120 : k === "lines" ? 100 : k === "plain" ? 30 : 0;
    if (h.instrumental) s -= 50;
    const ht = normTitle(h.trackName);
    if (wt && ht === wt) s += 40; else if (wt && (ht.includes(wt) || wt.includes(ht))) s += 20;
    if (wa && normTitle(h.artistName).includes(wa)) s += 25;
    if (want.duration && h.duration) { const d = Math.abs(h.duration - want.duration); s -= d <= 2 ? d : Math.min(90, d * 4); }
    return s;
  };
  return [...hits].sort((a, b) => score(b) - score(a))[0];
}

/** LRCLIB's lyricsfile (already parsed from YAML) → lines with word timings. Returns [] when it has no usable lines. */
export function fromLyricsfile(doc: unknown): Line[] {
  const d = doc as { lines?: { text?: unknown; start_ms?: unknown; end_ms?: unknown; words?: { text?: unknown; start_ms?: unknown }[] }[] } | null;
  if (!d || !Array.isArray(d.lines)) return [];
  const out: Line[] = [];
  for (const l of d.lines) {
    const t = Number(l.start_ms) / 1000;
    if (!Number.isFinite(t)) continue;
    const text = String(l.text ?? "").replace(/\s+/g, " ").trim();
    const end = Number(l.end_ms) / 1000;
    const words = Array.isArray(l.words)
      ? l.words.map((w) => ({ t: Number(w.start_ms) / 1000, text: String(w.text ?? "") })).filter((w) => Number.isFinite(w.t) && w.text.trim())
      : [];
    out.push({ t, text, ...(Number.isFinite(end) ? { end } : {}), ...(words.length ? { words } : {}) });
  }
  out.sort((a, b) => a.t - b.t);
  // a gap marker after a line that ends well before the next one, so the stage can breathe in instrumentals
  const withGaps: Line[] = [];
  out.forEach((l, i) => {
    withGaps.push(l);
    const next = out[i + 1];
    if (l.end && next && next.t - l.end > 6) withGaps.push({ t: l.end + 0.8, text: "" });
  });
  return withGaps;
}

/** Lines without word timing get it estimated: words spread over the line, longer words take longer,
 *  at a believable singing pace (never stretched across a long instrumental gap). */
export function withWords(lines: Line[]): Line[] {
  return lines.map((l, i) => {
    if (l.words?.length || !l.text) return l;
    const parts = l.text.split(/(?<=\s)/).filter((p) => p.trim());
    if (!parts.length) return l;
    const next = lines[i + 1]?.t ?? l.t + 6;
    const pace = Math.max(1.1, parts.length * 0.38);
    const span = Math.max(0.4, Math.min((l.end ?? next) - l.t, pace) * 0.92);
    const weight = parts.map((p) => 1 + p.trim().length * 0.18);
    const total = weight.reduce((a, b) => a + b, 0);
    let acc = 0;
    const words = parts.map((p, j) => { const w = { t: l.t + (span * acc) / total, text: p.endsWith(" ") ? p : p + " " }; acc += weight[j]; return w; });
    return { ...l, words };
  });
}

/** How many of a line's words have been sung by time `t`. */
export function wordsAt(line: Line | undefined, t: number): number {
  if (!line?.words?.length) return line?.text ? Infinity : 0;
  let n = 0;
  for (const w of line.words) { if (w.t <= t) n++; else break; }
  return n;
}
