"use client";
// The client half of a piece's AI call: POST to its route (app/api/<path>/<name>), which answers through the kit's
// modes. When no mode is ready (401) it opens the kit's mode picker with the reason, like useAI() does.
import { useCallback } from "react";
import { useStudio, type StudioIssue } from "@/kit/react/studio";

export type AIResult<T> = { ok: true; data: T } | { ok: false; issue: StudioIssue };

export function useAIRoute<T>(endpoint: string) {
  const studio = useStudio();
  return useCallback(async (body: unknown): Promise<AIResult<T>> => {
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await res.json().catch(() => ({}))) as { error?: string; action?: StudioIssue["action"] };
      if (!res.ok) {
        const issue: StudioIssue = { message: j.error ?? `Something went wrong (${res.status}). Try again.`, action: j.action };
        if (res.status === 401 || res.status === 409) studio.openPicker(issue);
        return { ok: false, issue };
      }
      return { ok: true, data: j as T };
    } catch {
      return { ok: false, issue: { message: "Couldn't reach the server. Check your connection and try again." } };
    }
  }, [endpoint, studio]);
}
