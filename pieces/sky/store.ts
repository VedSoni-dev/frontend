// cirrus: one config object is the source of truth. Kept in localStorage (versioned key) and mirrored into the URL hash,
// so a tuned sky is a link. Every read goes through normalize(), so junk never reaches the engine.
import { normalize, type SkyConfig } from "./cirrus.js";

const KEY = "cirrus:v1";

export function loadConfig(): SkyConfig {
  try {
    const h = typeof location !== "undefined" ? decodeURIComponent(location.hash.slice(1)) : "";
    if (h.startsWith("{")) return normalize(JSON.parse(h));
  } catch { /* a broken link falls back to storage */ }
  try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch { /* storage blocked */ }
  return normalize(null);
}

export function saveConfig(c: SkyConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode: still works for this visit */ }
  try { history.replaceState(null, "", "#" + encodeURIComponent(JSON.stringify(c))); } catch { /* fine */ }
}
