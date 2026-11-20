// Find a song on YouTube so it can play right here, in YouTube's own player.
// Pure functions (no DOM, no fetch): read the video list out of a YouTube search page, rank the uploads by how
// likely each one is the record itself (same length, same title, the artist's own channel, not live/slowed/a cover),
// and the small helpers for pasted links and video titles. The server route and the page both use them.

export type Video = { id: string; title: string; channel: string; duration: number; official: boolean };

/** "3:58" → 238, "1:02:03" → 3723. */
export const secs = (t = "") => t.split(":").reduce((a, x) => a * 60 + (Number(x) || 0), 0);

const norm = (s = "") => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)|\[.*?\]|\s(feat|ft)\.?\s.*$/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const loose = (s = "") => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

type Run = { text?: string };
type Renderer = { videoId?: string; title?: { runs?: Run[]; simpleText?: string }; ownerText?: { runs?: Run[] }; longBylineText?: { runs?: Run[] }; lengthText?: { simpleText?: string }; ownerBadges?: { metadataBadgeRenderer?: { style?: string } }[] };

/** Every video on a YouTube results page (HTML), in page order. Live streams and Shorts have no length and are left out. */
export function parseResults(html: string): Video[] {
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s) ?? html.match(/ytInitialData"\]\s*=\s*(\{.*?\});<\/script>/s);
  if (!m) return [];
  let data: unknown;
  try { data = JSON.parse(m[1]); } catch { return []; }
  const out: Video[] = [], seen = new Set<string>();
  const walk = (o: unknown, depth: number) => {
    if (!o || typeof o !== "object" || depth > 40) return;
    const v = (o as { videoRenderer?: Renderer }).videoRenderer;
    if (v?.videoId && v.lengthText?.simpleText && !seen.has(v.videoId)) {
      seen.add(v.videoId);
      out.push({
        id: v.videoId,
        title: (v.title?.runs?.map((r) => r.text ?? "").join("") ?? v.title?.simpleText ?? "").trim(),
        channel: (v.ownerText?.runs?.[0]?.text ?? v.longBylineText?.runs?.[0]?.text ?? "").trim(),
        duration: secs(v.lengthText.simpleText),
        official: !!v.ownerBadges?.some((b) => /VERIFIED/.test(b.metadataBadgeRenderer?.style ?? "")),
      });
    }
    for (const k in o as Record<string, unknown>) walk((o as Record<string, unknown>)[k], depth + 1);
  };
  walk(data, 0);
  return out;
}

// versions that aren't the record: penalised unless the person searched for exactly that
const NOT_THE_RECORD = ["live", "cover", "remix", "slowed", "sped up", "speed up", "reverb", "8d", "nightcore", "karaoke", "instrumental", "reaction", "tutorial", "hour", "hours", "loop", "bass boosted", "extended", "mashup", "acapella", "a cappella", "piano", "guitar", "lesson", "alternate", "director s cut", "concert", "behind the scenes", "teaser", "trailer", "snippet", "unreleased", "leak", "clean", "dance", "choreography", "edit", "demo", "type beat"];

/** Best first. Prefers the record itself: the length matches the song's (so the lyrics line up), the title matches,
 *  the artist's own or "- Topic" channel, "audio" over a music video (videos often add an intro). */
export function rankVideos(list: Video[], want: { title: string; artist?: string; duration?: number }): Video[] {
  const wt = norm(want.title), wq = loose(`${want.title} ${want.artist ?? ""}`);
  const wa = norm(want.artist).split(" ").filter((w) => w.length > 1).slice(0, 2).join(" ");
  const d = want.duration ?? 0;
  const score = (v: Video) => {
    const vt = loose(v.title), vc = loose(v.channel);
    let s = 0;
    if (wt && ` ${vt} `.includes(` ${wt} `)) s += 30;
    else if (wt) { const words = wt.split(" "); const got = words.filter((w) => vt.includes(w)).length; s += got / words.length >= 0.7 ? 8 : -40; }
    if (wa && vc.includes(wa)) s += 24; else if (wa && vt.includes(wa)) s += 8;
    if (/ topic$/.test(vc)) s += 25;
    if (v.official) s += 15;
    if (/vevo/.test(vc)) s += 8;
    if (/\b(official )?audio\b/.test(vt)) s += 10;
    if (/\blyrics?\b/.test(vt)) s += 4;
    let other = false;
    for (const w of NOT_THE_RECORD) {
      const inVideo = ` ${vt} `.includes(` ${w} `), asked = ` ${wq} `.includes(` ${w} `);
      if (asked) s += inVideo ? 30 : -30; // they want that version ("… (Live)")
      else if (inVideo) other = true;
    }
    if (other) s -= 45;
    if (d > 0) {
      const off = Math.abs(v.duration - d);
      s += off <= 2.5 ? 45 : off <= 6 ? 25 : off <= 15 ? 0 : -40 - Math.min(40, off / 5);
    }
    return s;
  };
  return list.map((v) => ({ v, s: score(v) })).sort((a, b) => b.s - a.s).map((x) => x.v);
}

/** The video id in a pasted YouTube or YouTube Music link, or a bare 11-character id. */
export function videoIdFrom(text: string): string | null {
  const t = text.trim();
  const m = t.match(/(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** "Kanye West - Flashing Lights ft. Dwele (Official Video)" by "KanyeWestVEVO" → title + artist to look the lyrics up with. */
export function splitVideoTitle(title: string, channel = ""): { title: string; artist: string } {
  const clean = title
    .replace(/[([【][^)\]】]*(official|video|audio|lyrics?|visuali[sz]er|hd|4k|hq|remaster(ed)?|mv|m\/v|explicit|clean)[^)\]】]*[)\]】]/gi, "")
    .replace(/\s+(official\s+)?(music\s+)?(video|audio|lyrics?)$/i, "")
    .replace(/\s{2,}/g, " ").trim();
  const by = channel.replace(/\s*-\s*topic$/i, "").replace(/vevo$/i, "").replace(/\s*official$/i, "").trim();
  const dash = clean.split(/\s+[-–—|]\s+/);
  if (dash.length >= 2) return { artist: dash[0].trim(), title: dash.slice(1).join(" - ").replace(/\s(feat|ft)\.?\s.*$/i, "").trim() };
  return { title: clean.replace(/\s(feat|ft)\.?\s.*$/i, "").trim(), artist: by };
}
