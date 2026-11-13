// /footer, "Write my footer": one sentence about the person's site → a tagline and three link columns. The prompt is
// grainfoot's own (github.com/VedSoni-dev/grainfoot, app/api/write). The AI runs through the studio kit in whatever mode
// this browser picked (publik plan, or the person's own Claude or OpenAI key).
import { answerJSON } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `You write website footers. Given a one-line description of a site, reply with JSON only, no prose:
{"tagline": string (max 70 chars, plain, no emoji), "columns": [{"title": string, "links": [{"label": string, "href": string}]}]}
Exactly 3 columns, 3 to 5 links each, short labels (1-3 words), hrefs as relative paths like "/pricing". Fit the links to that kind of site.`;

type Out = { tagline: string; columns: { title: string; links: { label: string; href: string }[] }[] };

function parse(text: string): Out | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]) as Out;
    if (typeof o.tagline !== "string" || !Array.isArray(o.columns)) return null;
    return {
      tagline: o.tagline.slice(0, 120),
      columns: o.columns.slice(0, 4).map((c) => ({
        title: String(c?.title ?? "").slice(0, 40),
        links: (Array.isArray(c?.links) ? c.links : []).slice(0, 6).map((l) => ({ label: String(l?.label ?? "").slice(0, 40), href: String(l?.href ?? "#").slice(0, 200) })),
      })),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { about?: unknown; name?: unknown } | null;
  if (!b) return Response.json({ error: "Bad request." }, { status: 400 });
  const about = String(b.about ?? "").trim();
  if (!about) return Response.json({ error: "Describe your site in a sentence first." }, { status: 400 });
  const prompt = `Site name: ${String(b.name ?? "").slice(0, 60)}\nAbout: ${about.slice(0, 400)}`;
  return answerJSON(req, { system: SYSTEM, messages: [{ role: "user", content: prompt }], tier: "fast", json: true }, parse,
    "The model's answer wasn't usable. Try again with a bit more detail.");
}
