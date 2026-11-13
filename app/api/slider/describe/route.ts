// /slider, "Describe it": one sentence about where the slider goes ("spice level for a taco app") → slider settings
// (label, range, step, where it clicks, unit, colour, cap). The prompt is detent's own (github.com/VedSoni-dev/detent,
// app/api/describe). The AI runs through the studio kit in whatever mode this browser picked; whatever the model says
// goes through normalize(), so it can't break the slider.
import { answerJSON } from "@/lib/gate";
import { normalize } from "@/pieces/slider/detent.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `You set up a tactile slider control for an app. The slider clicks (haptic detent) every "detentEvery" units.
Given a short description of what the slider is for, reply with JSON only, no prose:
{"name": string (2-3 words, what it is), "label": string (the short question or name shown above it, max 28 chars),
 "min": number, "max": number, "step": number (the smallest move), "detentEvery": number (where it clicks; between 3 and 20 clicks across the whole range),
 "value": number (a sensible starting value), "suffix": string (a unit like "%", "°", "x", " km", or ""),
 "accent": "#rrggbb" (a colour that fits the app; readable on white and on near-black), "cap": "ridge" | "dot"}`;

function parse(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[0]);
    if (!raw || typeof raw !== "object") return null;
    return { name: String(raw.name || raw.label || "Slider").slice(0, 40), o: normalize({ ...raw, haptics: true, sound: false }) };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { about?: unknown } | null;
  if (!b) return Response.json({ error: "Bad request." }, { status: 400 });
  const about = String(b.about ?? "").trim().slice(0, 300);
  if (!about) return Response.json({ error: "Say what the slider is for first, like “spice level for a taco app”." }, { status: 400 });
  return answerJSON(req, { system: SYSTEM, messages: [{ role: "user", content: about }], tier: "fast", json: true }, parse,
    "The answer wasn't a usable slider. Try a few more words.");
}
