// GET /api/video?title=&artist=&duration= → the song's best YouTube uploads, best first, for YouTube's own embedded
// player to play on the page. Reads YouTube's public search page (no API key, no account); the answer is cached at the
// edge for a week, so a song people play a lot is looked up once.
import { parseResults, rankVideos, type Video } from "@/pieces/backlit/lib/ytsearch";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: "SOCS=CAI; CONSENT=YES+",
};

async function search(q: string): Promise<Video[]> {
  const r = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D&hl=en&gl=US`, { headers: HEADERS, signal: AbortSignal.timeout(7000), cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return parseResults(await r.text());
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const title = (u.searchParams.get("title") ?? "").slice(0, 160).trim();
  const artist = (u.searchParams.get("artist") ?? "").slice(0, 120).trim();
  const duration = Math.max(0, Math.min(7200, Number(u.searchParams.get("duration")) || 0));
  if (!title) return Response.json({ videos: [], error: "title" }, { status: 400 });
  const want = { title, artist, duration };
  try {
    let found = await search(`${artist} ${title}`.trim());
    // nothing the same length? the audio upload usually is
    const close = (v: Video) => !duration || Math.abs(v.duration - duration) <= 6;
    if (duration && !found.some(close)) found = found.concat(await search(`${artist} ${title} audio`.trim()).catch(() => []));
    const videos = rankVideos(found, want).slice(0, 6);
    return Response.json({ videos }, { headers: { "Cache-Control": videos.length ? "public, s-maxage=604800, stale-while-revalidate=86400" : "public, s-maxage=300" } });
  } catch {
    return Response.json({ videos: [], error: "youtube" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
