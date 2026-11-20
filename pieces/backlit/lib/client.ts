"use client";
// Browser-only helpers: read a file's tags, turn art into glow colours, measure how loud the bass is.
import { paletteFrom, hex } from "./palette";
import { fromLyricsfile, guessFromFilename, hitKind, normTitle, parseLrc, pickHit, spreadPlain, withWords, type Hit, type Line } from "./lrc";

export type Track = { title: string; artist: string; album: string; duration: number; art: string | null; store?: string | null };
/** A song we can show: from a search, a file's tags or a followed player. Lyrics are fetched when it's picked. */
export type Song = { id: number; title: string; artist: string; album: string; duration: number; art: string | null; store: string | null; kind: "words" | "lines" | "plain" | "none" };
export type Lyrics = { lines: Line[]; kind: "words" | "lines" | "estimated" | "none" };

/** Title, artist, album, length and embedded cover from an audio file, read in the browser (nothing uploaded). */
export async function readTags(file: File): Promise<Track> {
  const guess = guessFromFilename(file.name);
  try {
    const { parseBlob } = await import("music-metadata");
    const m = await parseBlob(file, { duration: true, skipPostHeaders: true });
    const pic = m.common.picture?.[0];
    const art = pic ? URL.createObjectURL(new Blob([new Uint8Array(pic.data)], { type: pic.format || "image/jpeg" })) : null;
    return {
      title: m.common.title?.trim() || guess.title,
      artist: m.common.artist?.trim() || m.common.albumartist?.trim() || guess.artist,
      album: m.common.album?.trim() || "",
      duration: m.format.duration ?? 0,
      art,
    };
  } catch {
    return { title: guess.title, artist: guess.artist, album: "", duration: 0, art: null };
  }
}

/** The glow's colours from a cover image (blob: or any CORS-friendly URL). */
export function colorsFromArt(src: string): Promise<string[] | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = 28; c.height = 28;
        const g = c.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(img, 0, 0, 28, 28);
        resolve(paletteFrom(g.getImageData(0, 0, 28, 28).data, 4).map(hex));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Bass loudness, 0..1, self-levelling so quiet and loud songs both move the light. */
export class Meter {
  private buf: Uint8Array<ArrayBuffer>;
  private floor = 0.15; private peak = 0.5; private v = 0;
  constructor(private an: AnalyserNode) { an.fftSize = 1024; an.smoothingTimeConstant = 0.6; this.buf = new Uint8Array(an.frequencyBinCount); }
  read(): number {
    this.an.getByteFrequencyData(this.buf);
    let s = 0; for (let i = 1; i <= 6; i++) s += this.buf[i]; // ~40–260 Hz: kick and bass
    const x = s / 6 / 255;
    this.floor = Math.min(this.floor * 0.995 + x * 0.005, x + 0.02);
    this.peak = Math.max(this.peak * 0.997, x, this.floor + 0.08);
    const n = Math.max(0, Math.min(1, (x - this.floor) / (this.peak - this.floor)));
    this.v += (n - this.v) * (n > this.v ? 0.55 : 0.09);
    return this.v;
  }
}

export const fmtDur = (s: number) => (s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "");

// ---------- lookups, straight from this browser (each person's own rate limit; nothing goes through our server) ----------
// Lyrics: LRCLIB (lrclib.net), free and open. Cover art: Apple's public iTunes Search API, shown with a link back to Apple Music.
const LRCLIB = "https://lrclib.net/api";
const ID = { "Lrclib-Client": "backlit v0.1.0 (https://github.com/VedSoni-dev/backlit)" };
const memo = new Map<string, Promise<unknown>>();
function getJson<T>(url: string, opts: { headers?: Record<string, string>; signal?: AbortSignal } = {}): Promise<T> {
  const hit = memo.get(url);
  if (hit) return hit as Promise<T>;
  const p = fetch(url, { headers: opts.headers, signal: opts.signal }).then(async (r) => {
    if (r.status === 429) throw new Error("busy");
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<T>;
  });
  memo.set(url, p);
  p.catch(() => memo.delete(url));
  return p;
}

type ItunesHit = { trackName: string; artistName: string; collectionName: string; artworkUrl100?: string; trackTimeMillis?: number; trackViewUrl?: string };
async function itunes(term: string, signal?: AbortSignal): Promise<ItunesHit[]> {
  try { return (await getJson<{ results: ItunesHit[] }>(`https://itunes.apple.com/search?media=music&entity=song&limit=25&term=${encodeURIComponent(term)}`, { signal })).results ?? []; }
  catch { return []; }
}
function coverFor(list: ItunesHit[], title: string, artist: string): { art: string | null; store: string | null } {
  const t = normTitle(title), a = normTitle(artist).split(" ")[0] ?? "";
  const ok = (x: ItunesHit) => !a || normTitle(x.artistName).includes(a);
  const hit = list.find((x) => normTitle(x.trackName) === t && ok(x)) ?? list.find((x) => normTitle(x.trackName).startsWith(t) && ok(x));
  return { art: hit?.artworkUrl100 ? hit.artworkUrl100.replace(/\/\d+x\d+bb\./, "/600x600bb.") : null, store: hit?.trackViewUrl ?? null };
}
const toSong = (h: Hit, c: { art: string | null; store: string | null }): Song =>
  ({ id: h.id, title: h.trackName, artist: h.artistName, album: h.albumName ?? "", duration: h.duration, art: c.art, store: c.store, kind: hitKind(h) });

const RANK = { words: 3, lines: 2, plain: 1, none: 0 };

/** The search box: songs with their art and how good their lyrics are. */
export async function findSongs(q: string, signal?: AbortSignal): Promise<{ songs: Song[]; error?: string }> {
  try {
    const [hits, covers] = await Promise.all([getJson<Hit[]>(`${LRCLIB}/v2/search?q=${encodeURIComponent(q)}`, { headers: ID, signal }), itunes(q, signal)]);
    const best = new Map<string, Hit>();
    for (const h of hits) {
      if (h.instrumental) continue;
      const key = `${normTitle(h.trackName)}|${normTitle(h.artistName)}|${Math.round(h.duration / 4)}`;
      const prev = best.get(key);
      if (!prev || RANK[hitKind(h)] > RANK[hitKind(prev)]) best.set(key, h);
    }
    const songs = [...best.values()].slice(0, 10).map((h) => toSong(h, coverFor(covers, h.trackName, h.artistName)));
    return { songs };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return { songs: [], error: (e as Error).message === "busy" ? "The lyrics library says slow down. Wait a few seconds and try again." : "Couldn't reach the lyrics library. Check your connection and try again." };
  }
}

/** A song we already know (a file's tags, a followed player): the best lyrics record and its art. */
export async function matchSong(t: { title: string; artist: string; duration: number }, signal?: AbortSignal): Promise<Song | null> {
  const fields = new URLSearchParams({ track_name: t.title, ...(t.artist ? { artist_name: t.artist } : {}) });
  const [byFields, covers] = await Promise.all([
    getJson<Hit[]>(`${LRCLIB}/v2/search?${fields}`, { headers: ID, signal }).catch(() => [] as Hit[]),
    itunes(`${t.title} ${t.artist}`.trim(), signal),
  ]);
  let hits = byFields;
  if (!hits.some((h) => hitKind(h) === "words" || hitKind(h) === "lines")) hits = hits.concat(await getJson<Hit[]>(`${LRCLIB}/v2/search?q=${encodeURIComponent(`${t.title} ${t.artist}`.trim())}`, { headers: ID, signal }).catch(() => [] as Hit[]));
  const best = pickHit(hits, t);
  const cover = coverFor(covers, t.title, t.artist);
  if (!best) return { id: 0, title: t.title, artist: t.artist, album: "", duration: t.duration, art: cover.art, store: cover.store, kind: "none" };
  return toSong(best, cover);
}

/** The lines of a song, with word timing when LRCLIB has it (estimated from line timing when it doesn't). */
export async function lyricsFor(song: Pick<Song, "id" | "duration">, signal?: AbortSignal): Promise<Lyrics> {
  if (!song.id) return { lines: [], kind: "none" };
  const r = await getJson<Hit & { lyricsfile?: string | null }>(`${LRCLIB}/get/${song.id}`, { headers: ID, signal });
  if (r.lyricsfile && r.hasWordSync) {
    try {
      const { load } = await import("js-yaml");
      const lines = fromLyricsfile(load(r.lyricsfile));
      if (lines.some((l) => l.words?.length)) return { lines: withWords(lines), kind: "words" };
    } catch { /* fall through to line timing */ }
  }
  if (r.syncedLyrics) return { lines: withWords(parseLrc(r.syncedLyrics)), kind: "lines" };
  if (r.plainLyrics) return { lines: withWords(spreadPlain(r.plainLyrics, song.duration || r.duration || 200)), kind: "estimated" };
  return { lines: [], kind: "none" };
}
