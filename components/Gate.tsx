"use client";
// <Gate piece="flowers">: Sign in with publik in front of every piece. Adapted from the builds hub's and the clones'
// PublikGate.tsx, wired to the studio kit's routes instead of a module of its own:
//   GET  /api/gate                       the kit's gateStatus for this browser (lib/gate.ts; never "pending": no open mode)
//   POST /api/studio/publik/provision    this browser's publik install, made when the person clicks Sign in with publik
//   POST /api/studio/publik/choice       the plan screen's answer: "publik" (connect the plan) or "own_key"
// Signed out, it shows the piece's real preview and "Free. Sign in with publik to use it." Nothing of the tool renders
// until publik says this browser is signed in. Then the tool renders inside the kit's <StudioProvider>, which counts
// usage: app_opened once per browser session and active_session every 30 minutes, to the builds hub (beacon) and to
// publik (telemetry), through POST /api/studio/ping. One sign-in covers every piece: the kit's cookies are site-wide.
// Pieces that call AI keep the kit's plan step (publik plan or your own key); a piece without AI (gait) opens as soon
// as the person is signed in.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { StudioProvider } from "@/kit/react/studio";
import type { GateAction, GateScreen, GateStatus } from "@/kit/ai/publik"; // types only: no server code reaches the browser
import { PUBLIK_CHEAPER } from "@/kit/ai/types";
import { piece as findPiece } from "@/pieces";
import "./gate.css";

type Shown = Extract<GateStatus, { screen: GateScreen }>;
type NoteKey = keyof Shown["notes"];
type Poll = { until: number; done: (s: GateStatus) => boolean; timeout: NoteKey };

const NOTES: Shown["notes"] = {
  signInWaiting: "Waiting for you to sign in in your browser.",
  signInTimeout: "No sign-in after 10 minutes. Click Sign in with publik to try again.",
  planWaiting: "Waiting for your plan. Finish in your browser.",
  planTimeout: "No plan after 10 minutes. Click Get a plan to try again.",
};
// Only when this site's own server does not answer (the words of the kit's gateScreen("unreachable")).
const SERVER_DOWN: Shown = {
  state: "unreachable", claimUrl: null, topUpUrl: null, notes: NOTES, pollMs: 3_000, pollLimitMs: 600_000,
  screen: { id: "unreachable", title: "Sign in with publik", body: "publik is not reachable. Check your connection.", note: null, buttons: [{ action: "retry", label: "Retry" }] },
};

async function readStatus(res: Response): Promise<GateStatus> {
  const s = (await res.json()) as GateStatus;
  if (!s || typeof s.state !== "string") throw new Error("bad gate status");
  if (s.state === "pending") return { ...SERVER_DOWN, screen: { ...SERVER_DOWN.screen, body: "Sign-in is not set up on this copy of the site." } };
  return s;
}
let loading: Promise<GateStatus> | null = null; // one read at a time
const loadStatus = () => (loading ??= fetch("/api/gate", { cache: "no-store" }).then(readStatus).finally(() => { loading = null; }));
const post = (path: string, body: unknown) =>
  fetch(`/api/studio/${path}`, { method: "POST", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const signedIn = (s: GateStatus) => s.state === "choose" || s.state === "ready";
const signInPoll = (limitMs: number): Poll => ({ until: Date.now() + limitMs, done: signedIn, timeout: "signInTimeout" });
const planPoll = (limitMs: number): Poll => ({
  until: Date.now() + limitMs,
  done: (s) => s.state === "ready" || (s.state === "choose" && s.screen.buttons.some((b) => b.action === "connect")),
  timeout: "planTimeout",
});

export function Gate({ piece: path, children }: { piece: string; children: ReactNode }) {
  const p = findPiece(path);
  const [status, setStatus] = useState<GateStatus | null>(null);
  const [down, setDown] = useState(false);
  const [busy, setBusy] = useState(true);
  const [note, setNote] = useState<NoteKey | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);
  const last = useRef<Shown | null>(null); // the server's poll timing, read in effects and handlers

  const accept = useCallback((s: GateStatus) => {
    if ("screen" in s) last.current = s;
    setDown(false);
    setStatus(s);
  }, []);
  const refresh = useCallback(async () => {
    setBusy(true);
    try { accept(await loadStatus()); } catch { setDown(true); } finally { setBusy(false); }
  }, [accept]);
  useEffect(() => {
    loadStatus().then(accept, () => setDown(true)).finally(() => setBusy(false));
  }, [accept]);

  // The preview loops like a GIF; with reduced motion it rests on its first frame (the poster).
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (v && matchMedia("(prefers-reduced-motion: reduce)").matches) { v.removeAttribute("autoplay"); v.pause(); }
  }, [status]);

  const limitMs = () => last.current?.pollLimitMs ?? 600_000;
  // A piece with no AI has no plan to choose: signed in is enough.
  const open = !!status && !down && (status.state === "ready" || (status.state === "choose" && !p.usesAi));

  // Like the reference gate: while Sign in with publik shows, check every 3 s for at most 10 minutes.
  const state = down ? "down" : status?.state;
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setNote(null);
    setPoll(state === "sign_in" ? signInPoll(last.current?.pollLimitMs ?? 600_000) : null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state]);

  useEffect(() => {
    if (!poll) return;
    let alive = true, inflight = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const every = last.current?.pollMs ?? 3_000;
    const tick = async () => {
      if (!alive || inflight) return;
      if (Date.now() >= poll.until) { setNote(poll.timeout); setPoll(null); return; }
      inflight = true;
      const s = await loadStatus().catch(() => null);
      inflight = false;
      if (!alive) return;
      if (s && poll.done(s)) { setPoll(null); setNote(null); accept(s); return; }
      timer = setTimeout(tick, every);
    };
    const now = () => { clearTimeout(timer); void tick(); }; // back from the sign-in tab: check at once
    timer = setTimeout(tick, every);
    window.addEventListener("focus", now);
    return () => { alive = false; clearTimeout(timer); window.removeEventListener("focus", now); };
  }, [poll, accept]);

  // Signed in some other way (another tab, another piece) or came back after a timeout: one check when the tab shows.
  const title = status && "screen" in status ? status.screen.title : null;
  useEffect(() => {
    if (open || poll || (state !== "sign_in" && state !== "choose" && state !== "needs_install")) return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      void loadStatus().then((s) => {
        if (s.state === state && (!("screen" in s) || s.screen.title === title)) return;
        setNote(null);
        accept(s);
      }, () => {});
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => { window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); };
  }, [open, poll, state, title, accept]);

  /** First sign-in on this browser: make its publik install now (inside the click, so the new tab isn't blocked). */
  async function provision() {
    const w = window.open("about:blank", "_blank");
    if (w) w.opener = null;
    setBusy(true);
    try {
      const s = await readStatus(await post("publik/provision", {}));
      if (s.state === "sign_in" && s.claimUrl && w) { w.location.href = s.claimUrl; accept(s); setNote("signInWaiting"); return; }
      w?.close();
      accept(s); // a blocked tab: the screen now shows Sign in with publik as a link to the claim page
    } catch {
      w?.close();
      setDown(true);
    } finally {
      setBusy(false);
    }
  }

  async function act(a: GateAction) {
    if (a === "retry") return void refresh();
    if (a === "sign_in") {
      if (status?.state !== "sign_in" || !status.claimUrl) return void refresh();
      setNote("signInWaiting"); // the link itself opened claim_url in a new tab
      setPoll(signInPoll(limitMs()));
      return;
    }
    if (a === "get_plan") { setNote("planWaiting"); setPoll(planPoll(limitMs())); return; }
    setPoll(null);
    setNote(null);
    setBusy(true);
    try { await post("publik/choice", { choice: a === "connect" ? "publik" : "own_key" }); } catch { /* the next status shows the plan screen again */ }
    await refresh();
  }

  if (open) return <StudioProvider>{children}</StudioProvider>;

  const shown: Shown | null = down ? SERVER_DOWN : status && "screen" in status ? status : null;
  const needsInstall = !down && status?.state === "needs_install";
  const signingIn = needsInstall || shown?.screen.id === "sign_in";
  const noteText = note ? NOTES[note] : shown?.screen.note ?? null;
  const loadingFirst = !status && !down;

  return (
    <main className="fg-gate" aria-busy={busy}>
      <div className="fg-wrap">
        <header className="fg-top">
          <a className="fg-home" href="/">fork this <span>frontend</span></a>
          <a className="fg-all" href="/#pieces">All pieces</a>
        </header>
        <div className="fg-grid">
          <div className="fg-media">
            <video ref={video} src={p.media.video} poster={p.media.poster} autoPlay muted loop playsInline preload="metadata" aria-label={`${p.name}: ${p.what.toLowerCase()}, in use`} />
          </div>
          <div className="fg-card" role="group" aria-labelledby="fg-title">
            <p className="fg-app"><img src={`/${p.path}/icon.svg`} alt="" width={20} height={20} />{p.name} <span>/{p.path}</span></p>
            {signingIn || loadingFirst ? (
              <>
                <h1 id="fg-title" className="fg-title">Free. Sign in with publik to use it.</h1>
                <p className="fg-body">{p.line}</p>
              </>
            ) : (
              <>
                <h1 id="fg-title" className="fg-title">{shown?.screen.title ?? "Sign in with publik"}</h1>
                {shown && <p className="fg-body">{shown.screen.body}</p>}
                {shown?.screen.id === "choose" && <p className="fg-body fg-quiet">{p.name} itself is free. Only its AI feature needs your publik plan or your own key.</p>}
              </>
            )}
            {noteText && (
              <p className="fg-note" role="status">
                {poll && (note === "signInWaiting" || note === "planWaiting") && <span className="fg-spin" aria-hidden />}
                {noteText}
              </p>
            )}
            <div className="fg-buttons">
              {loadingFirst && <span className="fg-btn fg-primary fg-wait" aria-label="Loading"><span className="fg-spin" aria-hidden /></span>}
              {needsInstall && <button type="button" className="fg-btn fg-primary" disabled={busy} onClick={() => void provision()}><SignInLabel /></button>}
              {shown && shown.screen.buttons.map((b, i) => {
                const cls = `fg-btn ${i === 0 ? "fg-primary" : "fg-secondary"}`;
                const href = b.action === "sign_in" ? shown.claimUrl : b.action === "get_plan" ? shown.topUpUrl : null;
                return href ? (
                  <a key={b.action} href={href} target="_blank" rel="noopener noreferrer" className={cls}
                    onClick={() => void act(b.action)} onAuxClick={(e) => { if (e.button === 1) void act(b.action); }}>
                    {b.action === "sign_in" ? <SignInLabel /> : b.label}
                  </a>
                ) : (
                  <button key={b.action} type="button" className={cls} disabled={busy} onClick={() => void act(b.action)}>{b.action === "sign_in" ? <SignInLabel /> : b.label}</button>
                );
              })}
            </div>
            {signingIn && <p className="fg-small">The first time, publik opens in a new tab. Come back here when you are signed in. One sign-in opens every piece on this site.</p>}
            <noscript><p className="fg-note">Turn on JavaScript to sign in with publik.</p></noscript>
            <div className="fg-facts">
              <p>
                {p.name} is free on <a href="https://publikhq.com" target="_blank" rel="noopener noreferrer">publik</a>, a free software marketplace.
                Signing in through publik is how it stays free and credits its builder.
              </p>
              <p>
                Rebuilt from {p.credit.work} by <a href={p.credit.url} target="_blank" rel="noopener noreferrer">{p.credit.name}</a>.
                Open source, MIT: <a href={p.repo} target="_blank" rel="noopener noreferrer">{p.repo.replace("https://github.com/", "github.com/")}</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/** "Sign in with publik (20x cheaper than OpenAI and Anthropic)": the kit's line, lighter than the label. */
function SignInLabel() {
  return <span className="fg-btn-label">Sign in with publik <span className="fg-btn-aside">({PUBLIK_CHEAPER})</span></span>;
}
