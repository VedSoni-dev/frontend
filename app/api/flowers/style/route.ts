// /flowers, "Grow a style from words": one sentence about a mood or a site → a seedbed style (card, dots, stems,
// petals, head shapes). The prompt is seedbed's own (github.com/VedSoni-dev/seedbed, app/api/style). The AI runs through
// the studio kit in whatever mode this browser picked (publik plan, or the person's own Claude or OpenAI key); whatever
// the model says goes through normalizeStyle(), so a bad colour can never reach the garden.
import { answerJSON } from "@/lib/gate";
import { normalizeStyle } from "@/pieces/flowers/seedbed.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `You design colour styles for a hover garden: a dot grid on a card where small flowers grow out of the dots.
Given a short description (a mood, a season, a brand, a site), reply with JSON only, no prose:
{"label": string (1-2 words), "card": "#rrggbb" (the card background), "dot": "#rrggbb" (the resting dots, low contrast against the card),
 "stem": "#rrggbb", "leaf": "#rrggbb", "petals": ["#rrggbb", ... 3 to 6 colours], "center": "#rrggbb",
 "heads": [1 to 4 of "cosmos" | "daisy" | "tulip" | "spike"], "line": boolean (true only for monochrome line-art looks), "glow": number 0-10 (0 unless it is a night or neon look)}
Petals must read clearly against the card. Stems and leaves are plant greens unless the description asks otherwise.`;

function parse(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[0]);
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.petals)) return null;
    return { style: normalizeStyle(raw) };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { about?: unknown } | null;
  if (!b) return Response.json({ error: "Bad request." }, { status: 400 });
  const about = String(b.about ?? "").trim().slice(0, 300);
  if (!about) return Response.json({ error: "Describe a mood first, like “autumn maple, rust and gold”." }, { status: 400 });
  return answerJSON(req, { system: SYSTEM, messages: [{ role: "user", content: about }], tier: "fast", json: true }, parse,
    "The model's answer wasn't a usable style. Try a few more words.");
}
