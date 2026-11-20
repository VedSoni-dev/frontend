"use client";
// YouTube's own embedded player (the IFrame Player API), loaded once, and the lookup of a song's video.
import type { Video } from "./ytsearch";

export type YTPlayer = {
  playVideo(): void; pauseVideo(): void; stopVideo(): void; seekTo(s: number, allowSeekAhead: boolean): void;
  loadVideoById(id: string): void; getCurrentTime(): number; getDuration(): number; getPlayerState(): number;
  getVideoData?(): { title?: string; author?: string; video_id?: string };
};
type YTApi = { Player: new (el: HTMLElement, o: Record<string, unknown>) => YTPlayer };
export const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

let api: Promise<YTApi> | null = null;
export function loadYT(): Promise<YTApi> {
  if (api) return api;
  api = new Promise<YTApi>((resolve, reject) => {
    const w = window as unknown as { YT?: YTApi & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
    if (w.YT?.Player && w.YT.loaded) { resolve(w.YT); return; }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { prev?.(); resolve(w.YT!); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api"; s.async = true;
    s.onerror = () => { api = null; reject(new Error("youtube")); };
    document.head.appendChild(s);
    window.setTimeout(() => { if (!w.YT?.Player) { api = null; reject(new Error("youtube")); } }, 12000);
  });
  return api;
}

const found = new Map<string, Promise<Video[]>>();
/** The song's YouTube uploads, best first (through our /api/video, cached at the edge). */
export function findVideos(t: { title: string; artist: string; duration: number }): Promise<Video[]> {
  const qs = new URLSearchParams({ title: t.title, artist: t.artist, duration: String(Math.round(t.duration || 0)) }).toString();
  const hit = found.get(qs); if (hit) return hit;
  const p = fetch(`/api/backlit/video?${qs}`).then(async (r) => ((await r.json()) as { videos?: Video[] }).videos ?? []);
  found.set(qs, p); p.catch(() => found.delete(qs));
  return p;
}
