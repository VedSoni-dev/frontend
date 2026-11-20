"use client";
// Follow Spotify / Apple Music (or anything in Windows' media controls) automatically.
// A tiny helper the person runs on their own computer answers http://localhost:47817/now with what's playing;
// this tab asks it every second. Nothing goes to our server: the song name only leaves the tab to look up lyrics.
import { useEffect, useRef, useState } from "react";

export type NowPlaying = { player: string; title: string; artist: string; album: string; duration: number; position: number; playing: boolean; at: number };
type Raw = { ok?: boolean; player?: string | null; title?: string; artist?: string; album?: string; duration?: number; position?: number; playing?: boolean; at?: number };

const URL_NOW = "http://localhost:47817/now";

export function Follow({ active, onStart, onStop, onNow }: { active: boolean; onStart(): void; onStop(): void; onNow(np: NowPlaying | null): void }) {
  const [open, setOpen] = useState(false);
  const [os, setOs] = useState<"mac" | "windows">("mac");
  const [state, setState] = useState<"waiting" | "connected" | "idle">("idle");
  const [player, setPlayer] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const onNowRef = useRef(onNow); onNowRef.current = onNow;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const cmd = os === "mac" ? `curl -fsSL ${origin}/backlit/link/mac.sh | bash` : `irm ${origin}/backlit/link/windows.ps1 | iex`;

  useEffect(() => { if (/Win/i.test(navigator.platform || navigator.userAgent)) setOs("windows"); }, []);

  useEffect(() => {
    if (!active) { setState("idle"); return; }
    let stop = false, timer = 0;
    setState("waiting");
    const poll = async () => {
      try {
        const r = await fetch(URL_NOW, { cache: "no-store", signal: AbortSignal.timeout(1500) });
        const j = (await r.json()) as Raw;
        if (stop) return;
        setState("connected");
        if (j.player && j.title) {
          setPlayer(prettyPlayer(j.player));
          // the helper stamps when it read the player; catch up to now on our side (same computer, same clock)
          const late = j.at ? Math.max(0, Math.min(3, (Date.now() - j.at) / 1000)) : 0;
          const position = (j.position ?? 0) + (j.playing ? late : 0);
          onNowRef.current({ player: prettyPlayer(j.player), title: j.title, artist: j.artist ?? "", album: j.album ?? "", duration: j.duration ?? 0, position, playing: !!j.playing, at: performance.now() });
        } else setPlayer(null);
      } catch { if (!stop) setState((s) => (s === "connected" ? "waiting" : s)); }
      if (!stop) timer = window.setTimeout(poll, 1000);
    };
    void poll();
    return () => { stop = true; window.clearTimeout(timer); };
  }, [active]);

  const copy = async () => { try { await navigator.clipboard.writeText(cmd); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* the text is selectable */ } };

  return (
    <div className={`follow${open || active ? " open" : ""}`}>
      <button className="follow-head" onClick={() => setOpen((o) => !o)} aria-expanded={open || active}>
        <IconLink />
        <span><b>Follow Spotify or Apple Music automatically</b><br /><span className="muted">The lyrics and the light keep up with your player, song after song. One command on your computer.</span></span>
        <span className="chev" aria-hidden="true">{open || active ? "–" : "+"}</span>
      </button>
      {(open || active) && (
        <div className="follow-body">
          <div className="seg small">
            <button className={os === "mac" ? "on" : ""} onClick={() => setOs("mac")}>Mac</button>
            <button className={os === "windows" ? "on" : ""} onClick={() => setOs("windows")}>Windows</button>
          </div>
          <p className="muted">{os === "mac" ? <>Open <b>Terminal</b>, paste this, press Return. Allow it to see Spotify or Music when your Mac asks.</> : <>Open <b>Windows PowerShell</b>, paste this, press Enter. It reads Windows&apos; media controls, so Spotify, Apple Music and most players work.</>}</p>
          <div className="cmd"><code>{cmd}</code><button className="btn small" onClick={copy}>{copied ? "Copied" : "Copy"}</button></div>
          <p className="tiny">It only answers this browser on your own computer, and only with the song name and position. <a href={os === "mac" ? "/backlit/link/mac.sh" : "/backlit/link/windows.ps1"} target="_blank" rel="noreferrer">Read the script</a> first if you like. Close the window to stop it.</p>
          {!active ? <button className="btn primary" onClick={onStart}>Connect</button> : (
            <div className="row">
              <span className={`pill ${state === "connected" ? "live" : "wait"}`}>{state === "connected" ? (player ? `Following ${player}` : "Connected. Press play in your player.") : "Looking for the helper on this computer…"}</span>
              <button className="btn small ghost" onClick={onStop}>Stop</button>
            </div>
          )}
          {active && state === "waiting" && <p className="tiny">Chrome may ask to let this site reach apps on this device. Allow it, that&apos;s the helper. Safari doesn&apos;t allow it: use Chrome, Edge or Firefox for this one.</p>}
        </div>
      )}
    </div>
  );
}

function prettyPlayer(p: string) {
  const s = p.toLowerCase();
  if (s.includes("spotify")) return "Spotify";
  if (s === "music" || s.includes("applemusic") || s.includes("apple music") || s.includes("itunes")) return "Apple Music";
  if (s.includes("chrome")) return "Chrome";
  if (s.includes("msedge") || s.includes("edge")) return "Edge";
  if (s.includes("firefox")) return "Firefox";
  if (s.includes("zune") || s.includes("media")) return "Media Player";
  return p.split(/[.!_]/)[0] || p;
}

function IconLink() { return <svg width="26" height="26" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9" /><path d="M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9" /></svg>; }
