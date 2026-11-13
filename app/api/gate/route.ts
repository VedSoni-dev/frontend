// GET /api/gate: this browser's place in the site's Sign in with publik gate (read only; the kit's gateStatus).
// A browser with no publik install yet gets { state: "needs_install" }; components/Gate.tsx then provisions one through
// the kit's POST /api/studio/publik/provision when the person clicks Sign in with publik.
import { cookies } from "next/headers";
import { siteGate } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return Response.json(await siteGate(await cookies(), req), { headers: { "cache-control": "no-store" } });
}
