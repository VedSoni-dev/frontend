// The site's one gate, on the server. Every piece (/flowers, /slider, /footer, /gait, and any added later) is behind
// Sign in with publik through the builds hub's listing (the kit's publik module, kit/ai/publik.ts). One cookie for the
// whole site: the kit names it after studio.config's slug ("frontend") with path "/", so one sign-in covers every piece.
// There is no open or pending mode here: nobody reaches a piece, or a piece's AI route, without signing in.
import { cookies } from "next/headers";
import { generateText, studioStatus, errorResponse, StudioError, type AIRequest } from "@/kit/ai";
import { gateScreen, gateStatus, GATE_NOTES, type GateStatus } from "@/kit/ai/publik";

type Jar = Awaited<ReturnType<typeof cookies>>;

/** The kit's gateStatus, with its "pending" (open, no sign-in) state turned into a closed screen. */
export async function siteGate(jar: Jar, req: Request, provision = false): Promise<GateStatus> {
  const g = await gateStatus(jar, req, { provision });
  if (g.state !== "pending") return g;
  return {
    state: "unreachable",
    screen: gateScreen("unreachable", null, null, "Sign-in is not set up on this copy of the site (no publik app token)."),
    claimUrl: null, topUpUrl: null, notes: GATE_NOTES, pollMs: 3_000, pollLimitMs: 600_000,
  };
}

/** Signed in = publik says this browser's install is claimed (the gate is past sign-in: "choose" or "ready"). */
export const isSignedIn = (g: GateStatus | undefined) => g?.state === "ready" || g?.state === "choose";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });

/**
 * One AI call for a piece: checks the gate, checks that a mode is ready (publik plan or the person's own key, chosen in
 * the kit's picker), asks the kit for the whole answer, and shapes it. Errors come back as { error, action? } with the
 * status the client needs: 403 sign in, 401 pick a mode (the client opens the picker), 402 top up, 502 bad answer.
 */
export async function answerJSON<T>(req: Request, ai: AIRequest, shape: (text: string) => T | null, unusable: string): Promise<Response> {
  try {
    const jar = await cookies();
    const s = await studioStatus(req, jar);
    const gate = s.modes.find((m) => m.id === "publik")?.extra?.gate as GateStatus | undefined;
    if (!gate || gate.state === "unreachable") throw new StudioError(503, "publik is not reachable right now. Try again in a moment.");
    if (!isSignedIn(gate)) throw new StudioError(403, "Sign in with publik to use this. It's free.");
    if (!s.active) throw new StudioError(401, "Choose what powers the AI: your publik plan, or your own Claude or OpenAI key.");
    const out = shape(await generateText(req, ai, jar));
    return out ? json(out) : json({ error: unusable }, 502);
  } catch (e) {
    return errorResponse(e);
  }
}
