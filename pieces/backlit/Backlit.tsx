"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { Glow } from "./Glow";
import { Lyrics, STYLES, Swatch, hashStr, isStyle, type StyleId } from "./Lyrics";
import { lineAt, parseLrc, withWords, wordsAt, type Line } from "./lib/lrc";
import { PRESETS } from "./lib/palette";
import { Meter, colorsFromArt, findSongs, fmtDur, lyricsFor, matchSong, readTags, type Lyrics as LyricsData, type Song, type Track } from "./lib/client";
import { Follow, type NowPlaying } from "./Follow";
import { findVideos, loadYT, YT_STATE, type YTPlayer } from "./lib/youtube";
import { splitVideoTitle, videoIdFrom, type Video } from "./lib/ytsearch";

type Mode = "none" | "file" | "manual" | "follow" | "video";
type LyrState = "idle" | "loading" | "words" | "lines" | "estimated" | "none";
type Panel = "pick" | "settings" | "lines" | "styles" | null;
type Prefs = { size: number; power: number; palette: string; style: StyleId | "off"; align: "left" | "center"; hideIdle: boolean; source: "here" | "elsewhere"; text: number; mix: boolean; backdrop: "auto" | "dark" | "haze" };
type Vid = { list: Video[]; i: number; state: "finding" | "loading" | "ok" | "press" | "failed" };

const DEFAULTS: Prefs = { size: 18, power: 1, palette: "from the art", style: "thread", align: "center", hideIdle: true, source: "here", text: 1, mix: false, backdrop: "auto" };
const OLD_STYLES: Record<string, StyleId> = { bubbles: "thread", big: "sing" };
const LEAD = 0.12; // show a line a hair early: the bubble takes a moment to land
const AUDIO_EXT = /\.(mp3|m4a|aac|flac|wav|ogg|oga|opus|webm|aiff?)$/i;

const ls = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? { ...d, ...JSON.parse(v) } : d; } catch { return d; } },
  list<T>(k: string): T[] { try { const v = JSON.parse(localStorage.getItem(k) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: fine */ } },
};

// The optional example: our own words, clearly labelled, on the tap-along clock (no audio).
const EXAMPLE_LRC = `[00:01.00]lights down, volume up
[00:04.20]the room goes quiet but the edges don't
[00:08.00]every line lands right on time
[00:11.60]like it heard the song before you did
[00:15.20]
[00:18.00]no app to buy, no trial to end
[00:21.60]just a tab, a track and the glow
[00:25.40]put it full screen
[00:28.60]turn the big light off
[00:32.00]and let the song paint the walls
[00:36.50]`;

function exampleArt(): string {
  const c = document.createElement("canvas"); c.width = c.height = 300;
  const g = c.getContext("2d")!;
  g.fillStyle = "#12051a"; g.fillRect(0, 0, 300, 300);
  const blob = (x: number, y: number, r: number, col: string) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "transparent"); g.fillStyle = gr; g.fillRect(0, 0, 300, 300); };
  blob(90, 210, 190, "#ff2f9e"); blob(230, 80, 170, "#7b3dff"); blob(240, 250, 120, "#ff7a3d");
  return c.toDataURL("image/png");
}

export default function Backlit() {
  const [mode, setMode] = useState<Mode>("none");
  const [track, setTrack] = useState<Track | null>(null);
  const [example, setExample] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [lyr, setLyr] = useState<LyrState>("idle");
  const [idx, setIdx] = useState(-1);
  const [sung, setSung] = useState(0); // words of the current line sung so far
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false); // tap-along: waiting for the person to hit Start
  const [artColors, setArtColors] = useState<string[] | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [panel, setPanel] = useState<Panel>("pick");
  const [pip, setPip] = useState<Window | null>(null);
  const [offset, setOffset] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [recents, setRecents] = useState<Song[]>([]);
  const [micOn, setMicOn] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Song[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [full, setFull] = useState(false);
  const [vid, setVid] = useState<Vid>({ list: [], i: 0, state: "finding" }); // the song's YouTube uploads, best first
  const [pasted, setPasted] = useState<string | null>(null); // a YouTube link typed into the search box

  const rootRef = useRef<HTMLDivElement>(null);
  const pipRootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const clock = useRef<{ base: number; anchor: number | null }>({ base: 0, anchor: null });
  const modeRef = useRef<Mode>("none"); modeRef.current = mode;
  const linesRef = useRef<Line[]>([]); linesRef.current = lines;
  const offsetRef = useRef(0); offsetRef.current = offset;
  const durRef = useRef(0); durRef.current = track?.duration ?? 0;
  const playingRef = useRef(false); playingRef.current = playing;
  const panelRef = useRef<Panel>(panel); panelRef.current = panel;
  const prefsRef = useRef(prefs); prefsRef.current = prefs;
  const idxRef = useRef(-1);
  const sungRef = useRef(0);
  const pulse = useRef(0);
  const lastMove = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const fileMeter = useRef<Meter | null>(null);
  const micMeter = useRef<Meter | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const followRef = useRef<NowPlaying | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const loadToken = useRef(0);
  const objectUrls = useRef<string[]>([]);
  const wake = useRef<{ release(): Promise<void> } | null>(null);
  const ytHost = useRef<HTMLDivElement>(null);
  const yt = useRef<YTPlayer | null>(null);
  const ytMaking = useRef<Promise<YTPlayer> | null>(null);
  const ytClock = useRef({ t: 0, at: 0 });
  const ytEvents = useRef<{ state(s: number): void; error(code: number): void }>({ state() {}, error() {} });
  const vidRef = useRef(vid); vidRef.current = vid;
  const identify = useRef(false); // a pasted link: work the song out from the video's title once it plays

  // ---------- saved preferences and recent songs (this browser only) ----------
  useEffect(() => {
    const p = ls.get("backlit:prefs", DEFAULTS);
    if (p.style !== "off" && !isStyle(p.style)) p.style = OLD_STYLES[p.style as string] ?? DEFAULTS.style;
    setPrefs(p); setRecents(ls.list<Song>("backlit:recent"));
  }, []);
  const setPref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => { const n = { ...p, [k]: v }; ls.set("backlit:prefs", n); return n; });
  const remember = (s: Song) => setRecents((r) => { const n = [s, ...r.filter((x) => x.id !== s.id)].slice(0, 8); ls.set("backlit:recent", n); return n; });

  const say = useCallback((m: string) => { setToast(m); window.clearTimeout((say as unknown as { t?: number }).t); (say as unknown as { t?: number }).t = window.setTimeout(() => setToast(null), 2600); }, []);

  // ---------- the clock: the song's position in seconds, whichever way we know it ----------
  const cur = useCallback((): number => {
    const m = modeRef.current;
    if (m === "file") return audioRef.current?.currentTime ?? 0;
    if (m === "video") {
      // YouTube reports its position a few times a second; glide between reports so words land smoothly
      const p = yt.current; if (!p?.getCurrentTime) return 0;
      const t = p.getCurrentTime() || 0, now = performance.now(), c = ytClock.current;
      if (t !== c.t || p.getPlayerState() !== YT_STATE.PLAYING) { c.t = t; c.at = now; return t; }
      return c.t + Math.min(1, (now - c.at) / 1000);
    }
    if (m === "follow" && followRef.current) { const f = followRef.current; return f.playing ? f.position + (performance.now() - f.at) / 1000 : f.position; }
    const c = clock.current; return c.anchor == null ? c.base : c.base + (performance.now() - c.anchor) / 1000;
  }, []);

  const play = useCallback(() => {
    setReady(false);
    if (modeRef.current === "file") { void ctxRef.current?.resume(); void audioRef.current?.play().catch(() => say("Press play again: the browser wants a click first.")); return; }
    if (modeRef.current === "video") { yt.current?.playVideo(); return; }
    if (modeRef.current === "manual" && clock.current.anchor == null) { clock.current.anchor = performance.now(); setPlaying(true); }
  }, [say]);
  const pause = useCallback(() => {
    if (modeRef.current === "file") { audioRef.current?.pause(); return; }
    if (modeRef.current === "video") { yt.current?.pauseVideo(); return; }
    if (modeRef.current === "manual" && clock.current.anchor != null) { clock.current = { base: cur(), anchor: null }; setPlaying(false); }
  }, [cur]);
  const toggle = useCallback(() => (playingRef.current ? pause() : play()), [play, pause]);
  const seekTo = useCallback((t: number, andPlay = false) => {
    t = Math.max(0, t);
    if (modeRef.current === "file" && audioRef.current) { audioRef.current.currentTime = t; if (andPlay) play(); return; }
    if (modeRef.current === "video" && yt.current) { yt.current.seekTo(t, true); ytClock.current = { t, at: performance.now() }; if (andPlay) yt.current.playVideo(); return; }
    if (modeRef.current === "manual") { clock.current = { base: t, anchor: clock.current.anchor != null || andPlay ? performance.now() : null }; if (andPlay) { setPlaying(true); setReady(false); } }
  }, [play]);
  const nudge = useCallback((d: number) => setOffset((o) => { const n = Math.round((o + d) * 10) / 10; say(n === 0 ? "Lyrics timing reset" : `Lyrics ${n > 0 ? "+" : ""}${n.toFixed(1)} s ${n > 0 ? "(sooner)" : "(later)"}`); return n; }), [say]);

  // ---------- the frame loop: which line, how bright, progress, idle ----------
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const t = cur();
      const i = lineAt(linesRef.current, t + offsetRef.current + LEAD);
      if (i !== idxRef.current) { if (i > idxRef.current && i >= 0) pulse.current = 1; idxRef.current = i; setIdx(i); }
      const n = i >= 0 ? Math.min(999, wordsAt(linesRef.current[i], t + offsetRef.current + LEAD)) : 0;
      if (n !== sungRef.current) { if (n > sungRef.current) pulse.current = Math.max(pulse.current, 0.55); sungRef.current = n; setSung(n); }
      // how far through the word being sung: the styles fill each word with light as it goes
      let wp = 1;
      const ln = i >= 0 ? linesRef.current[i] : undefined;
      if (ln?.words?.length && n > 0 && n <= ln.words.length) {
        const w = ln.words[n - 1], end = ln.words[n]?.t ?? ln.end ?? linesRef.current[i + 1]?.t ?? w.t + 1;
        wp = Math.max(0, Math.min(1, (t + offsetRef.current + LEAD - w.t) / Math.max(0.15, Math.min(end, w.t + 1.6) - w.t)));
      }
      const WP = wp.toFixed(3);
      rootRef.current?.style.setProperty("--wp", WP);
      pipRootRef.current?.style.setProperty("--wp", WP);
      let lvl: number;
      const m = modeRef.current;
      if (m === "file" && fileMeter.current && audioRef.current && !audioRef.current.paused) lvl = fileMeter.current.read();
      else if (micMeter.current) lvl = micMeter.current.read();
      else lvl = playingRef.current ? 0.36 + 0.14 * Math.sin(now / 760) : 0.3 + 0.08 * Math.sin(now / 1400);
      pulse.current *= 0.93;
      const L = Math.min(1, lvl * 0.82 + pulse.current * 0.32).toFixed(3);
      rootRef.current?.style.setProperty("--lvl", L);
      pipRootRef.current?.style.setProperty("--lvl", L);
      const d = durRef.current;
      if (barRef.current) barRef.current.style.transform = `scaleX(${d ? Math.min(1, t / d) : 0})`;
      if (timeRef.current) timeRef.current.textContent = d ? `${fmtDur(Math.min(t, d)) || "0:00"} / ${fmtDur(d)}` : fmtDur(t) || "0:00";
      if (m === "manual" && d && t > d + 2 && clock.current.anchor != null) { clock.current = { base: d, anchor: null }; setPlaying(false); }
      const idle = prefsRef.current.hideIdle && playingRef.current && !panelRef.current && now - lastMove.current > 3200;
      rootRef.current?.classList.toggle("idle", idle);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cur]);

  // keep the screen awake while a song plays
  useEffect(() => {
    if (!playing) { void wake.current?.release().catch(() => {}); wake.current = null; return; }
    const nav = navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } };
    nav.wakeLock?.request("screen").then((w) => { wake.current = w; }).catch(() => {});
  }, [playing]);

  // the line list keeps the current line in view
  useEffect(() => { if (panel === "lines") document.querySelector(".lines li.on")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [idx, panel]);

  // tab title
  useEffect(() => { document.title = track ? `♪ ${track.title}${track.artist ? ` · ${track.artist}` : ""} · backlit` : "backlit"; }, [track]);

  // ---------- colours ----------
  const glowColors = prefs.palette === "from the art" ? artColors ?? PRESETS.magenta : PRESETS[prefs.palette] ?? PRESETS.magenta;
  const paint = useCallback(async (art: string | null) => { if (!art) { setArtColors(null); return; } const c = await colorsFromArt(art); setArtColors(c); }, []);

  // ---------- lyrics ----------
  const applyLyrics = useCallback((l: LyricsData) => {
    setLines(l.lines); setLyr(l.kind);
    idxRef.current = -1; setIdx(-1); sungRef.current = 0; setSung(0);
  }, []);
  const loadingLyrics = useCallback(() => { setLines([]); setLyr("loading"); idxRef.current = -1; setIdx(-1); sungRef.current = 0; setSung(0); }, []);

  // the timing nudge is remembered per song (Bluetooth speakers lag; some recordings differ)
  const songKey = track ? `backlit:sync:${track.title}|${track.artist}`.toLowerCase() : "";
  useEffect(() => { if (!songKey) return; try { setOffset(Number(localStorage.getItem(songKey)) || 0); } catch { setOffset(0); } }, [songKey]);
  useEffect(() => { if (!songKey) return; try { if (offset) localStorage.setItem(songKey, String(offset)); else localStorage.removeItem(songKey); } catch { /* fine */ } }, [offset, songKey]);

  const audioGraph = useCallback(() => {
    const a = audioRef.current; if (!a) return;
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
    }
    const ctx = ctxRef.current;
    if (!fileMeter.current) { const src = ctx.createMediaElementSource(a); const an = ctx.createAnalyser(); src.connect(an); an.connect(ctx.destination); fileMeter.current = new Meter(an); }
    void ctx.resume();
  }, []);

  const stopEverything = useCallback(() => {
    loadToken.current++;
    const a = audioRef.current; if (a) { a.pause(); a.removeAttribute("src"); a.load(); }
    clock.current = { base: 0, anchor: null };
    try { yt.current?.stopVideo(); } catch { /* not ready yet */ }
    identify.current = false;
    setVid({ list: [], i: 0, state: "finding" });
    objectUrls.current.forEach((u) => URL.revokeObjectURL(u)); objectUrls.current = [];
    setPlaying(false); setReady(false); setExample(false);
  }, []);

  // ---------- source 0: play the song right here, in YouTube's own player; the lyrics follow its clock ----------
  const ensurePlayer = useCallback((id: string): Promise<YTPlayer> => {
    if (ytMaking.current) return ytMaking.current.then((p) => { p.loadVideoById(id); return p; });
    const made = loadYT().then((YT) => new Promise<YTPlayer>((resolve) => {
      const el = document.createElement("div");
      ytHost.current!.replaceChildren(el);
      const p = new YT.Player(el, {
        videoId: id, width: "100%", height: "100%",
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => { yt.current = p; resolve(p); if (modeRef.current === "video") p.playVideo(); },
          onStateChange: (e: { data: number }) => ytEvents.current.state(e.data),
          onError: (e: { data: number }) => ytEvents.current.error(e.data),
        },
      });
    }));
    ytMaking.current = made;
    made.catch(() => { ytMaking.current = null; });
    return made;
  }, []);

  // couldn't play it here: fall back to the tap-along clock with the lyrics we already have
  const tapAlongInstead = useCallback((msg: string) => {
    try { yt.current?.stopVideo(); } catch { /* fine */ }
    setMode("manual"); modeRef.current = "manual";
    clock.current = { base: 0, anchor: null };
    setPlaying(false); setReady(true); setVid((v) => ({ ...v, state: "failed" }));
    say(msg);
  }, [say]);

  // browsers that won't start sound without a tap on the video itself: say so
  const pressHint = useCallback((token: number) => {
    window.setTimeout(() => { if (token === loadToken.current && modeRef.current === "video" && !playingRef.current) setVid((v) => (v.state === "loading" ? { ...v, state: "press" } : v)); }, 3500);
  }, []);

  const playHere = useCallback(async (s: Song) => {
    stopEverything(); stopFollow();
    const token = ++loadToken.current;
    setMode("video"); modeRef.current = "video";
    setTrack({ title: s.title, artist: s.artist, album: s.album, duration: s.duration, art: s.art, store: s.store });
    void paint(s.art);
    setPanel(null); remember(s);
    loadingLyrics();
    lyricsFor(s).then((l) => { if (token === loadToken.current) applyLyrics(l); }).catch(() => { if (token === loadToken.current) { setLines([]); setLyr("none"); } });
    let list: Video[] = [];
    try { list = await findVideos(s); } catch { list = []; }
    if (token !== loadToken.current) return;
    if (!list.length) { tapAlongInstead("Couldn't find it on YouTube. Play it anywhere and hit Start."); return; }
    setVid({ list, i: 0, state: "loading" });
    try { await ensurePlayer(list[0].id); } catch { if (token === loadToken.current) tapAlongInstead("YouTube didn't load. Play the song anywhere and hit Start."); return; }
    pressHint(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopEverything, applyLyrics, loadingLyrics, paint, ensurePlayer, tapAlongInstead, pressHint]);

  // a pasted YouTube link: play it, then find the lyrics from the video's title
  const playLink = useCallback(async (id: string) => {
    stopEverything(); stopFollow();
    const token = ++loadToken.current;
    setMode("video"); modeRef.current = "video";
    setTrack({ title: "YouTube video", artist: "", album: "", duration: 0, art: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` });
    setArtColors(null); setPanel(null); setQ(""); setPasted(null);
    setVid({ list: [{ id, title: "", channel: "", duration: 0, official: false }], i: 0, state: "loading" });
    loadingLyrics(); identify.current = true;
    try { await ensurePlayer(id); } catch { if (token === loadToken.current) { say("YouTube didn't load. Check your connection."); setLyr("none"); } return; }
    pressHint(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopEverything, loadingLyrics, ensurePlayer, pressHint, say]);

  const identifyVideo = useCallback(async () => {
    const p = yt.current; if (!p) return;
    const token = loadToken.current;
    const d = p.getVideoData?.() ?? {}, duration = p.getDuration() || 0;
    const g = splitVideoTitle(d.title ?? "", d.author ?? "");
    if (!g.title) { setLyr("none"); return; }
    setTrack((t) => (t ? { ...t, title: g.title, artist: g.artist, duration } : t));
    try {
      const s = await matchSong({ title: g.title, artist: g.artist, duration });
      if (token !== loadToken.current) return;
      if (s && s.kind !== "none") setTrack((t) => (t ? { ...t, title: s.title, artist: s.artist, album: s.album, art: s.art ?? t.art, store: s.store } : t));
      void paint(s?.art ?? null);
      const l = s ? await lyricsFor({ id: s.id, duration }) : { lines: [], kind: "none" as const };
      if (token === loadToken.current) applyLyrics(l);
    } catch { if (token === loadToken.current) setLyr("none"); }
  }, [applyLyrics, paint]);

  ytEvents.current = {
    state(st) {
      if (modeRef.current !== "video") return;
      const p = yt.current;
      ytClock.current = { t: p?.getCurrentTime?.() ?? 0, at: performance.now() };
      if (st === YT_STATE.PLAYING) {
        setPlaying(true); setVid((v) => ({ ...v, state: "ok" }));
        const d = p?.getDuration() ?? 0;
        if (d && !durRef.current) setTrack((t) => (t ? { ...t, duration: d } : t));
        if (identify.current) { identify.current = false; void identifyVideo(); }
      } else if (st === YT_STATE.PAUSED || st === YT_STATE.ENDED) setPlaying(false);
    },
    error() {
      // this upload won't play on other sites (or is gone): try the next one, then fall back to tap-along
      if (modeRef.current !== "video") return;
      const v = vidRef.current;
      if (v.i + 1 < v.list.length) { const i = v.i + 1; setVid({ ...v, i, state: "loading" }); yt.current?.loadVideoById(v.list[i].id); pressHint(loadToken.current); return; }
      if (identify.current || v.list.length === 1 && !v.list[0].title) { identify.current = false; say("That video won't play on other sites. Try another link."); setVid({ ...v, state: "failed" }); setLyr("none"); return; }
      tapAlongInstead("YouTube won't play this one here. Play it anywhere and hit Start.");
    },
  };

  const otherVideo = useCallback(() => {
    const v = vidRef.current; if (v.list.length < 2) return;
    const i = (v.i + 1) % v.list.length;
    setVid({ ...v, i, state: "loading" }); yt.current?.loadVideoById(v.list[i].id);
    say(`Another upload of this song (${i + 1} of ${v.list.length})`);
  }, [say]);

  // ---------- source 1: a song playing somewhere else (tap-along clock) ----------
  const chooseSong = useCallback(async (s: Song, opts: { example?: boolean } = {}) => {
    stopEverything(); stopFollow();
    const token = ++loadToken.current;
    setMode("manual"); modeRef.current = "manual";
    setTrack({ title: s.title, artist: s.artist, album: s.album, duration: s.duration, art: s.art, store: s.store });
    void paint(s.art);
    setExample(!!opts.example);
    setPanel(null); setReady(true);
    if (opts.example) { applyLyrics({ lines: withWords(parseLrc(EXAMPLE_LRC)), kind: "lines" }); return; }
    remember(s);
    loadingLyrics();
    try { const l = await lyricsFor(s); if (token === loadToken.current) applyLyrics(l); }
    catch { if (token === loadToken.current) { setLines([]); setLyr("none"); say("Couldn't get the lyrics right now. Try again in a moment."); } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopEverything, applyLyrics, loadingLyrics, paint, say]);

  const runSearch = useCallback(async (text: string) => {
    const t = text.trim();
    const link = videoIdFrom(t); setPasted(link);
    if (link || t.length < 2) { setResults(null); return; }
    searchAbort.current?.abort(); const ac = new AbortController(); searchAbort.current = ac;
    setSearching(true); setSearchErr(null);
    try { const r = await findSongs(t, ac.signal); setResults(r.songs ?? []); if (r.error) setSearchErr(r.error); }
    catch (e) { if ((e as Error).name !== "AbortError") setSearchErr("Couldn't reach the lyrics library. Check your connection and try again."); }
    finally { if (searchAbort.current === ac) setSearching(false); }
  }, []);
  useEffect(() => { const h = window.setTimeout(() => void runSearch(q), 320); return () => window.clearTimeout(h); }, [q, runSearch]);

  // ---------- source 2: a song file from this computer (exact timing, light follows the bass) ----------
  const playFiles = useCallback(async (list: File[]) => {
    const audioFile = list.find((f) => f.type.startsWith("audio/") || AUDIO_EXT.test(f.name));
    const lrcFile = list.find((f) => /\.lrc$/i.test(f.name));
    if (!audioFile) {
      if (lrcFile && track) { applyLyrics({ lines: withWords(parseLrc(await lrcFile.text())), kind: "lines" }); say("Using your .lrc file"); return; }
      say("That isn't a song file. Try an MP3, M4A, FLAC, WAV or OGG."); return;
    }
    stopEverything(); stopFollow();
    const token = ++loadToken.current;
    const a = audioRef.current!;
    const url = URL.createObjectURL(audioFile); objectUrls.current.push(url);
    setMode("file"); modeRef.current = "file";
    a.src = url;
    audioGraph();
    void a.play().catch(() => {});
    setPanel(null); loadingLyrics();
    setTrack({ title: audioFile.name.replace(/\.[^.]+$/, ""), artist: "", album: "", duration: 0, art: null });
    const tags = await readTags(audioFile);
    if (token !== loadToken.current) return;
    if (tags.art) objectUrls.current.push(tags.art);
    const duration = tags.duration || a.duration || 0;
    setTrack({ ...tags, duration }); void paint(tags.art);
    if (lrcFile) { applyLyrics({ lines: withWords(parseLrc(await lrcFile.text())), kind: "lines" }); return; }
    try {
      const s = await matchSong({ title: tags.title, artist: tags.artist, duration });
      if (token !== loadToken.current) return;
      if (s && !tags.art && s.art) { setTrack((t) => (t ? { ...t, art: s.art, store: s.store } : t)); void paint(s.art); }
      const l = s ? await lyricsFor({ id: s.id, duration }) : { lines: [], kind: "none" as const };
      if (token === loadToken.current) applyLyrics(l);
    } catch { if (token === loadToken.current) { setLines([]); setLyr("none"); } }
  }, [applyLyrics, audioGraph, loadingLyrics, paint, say, stopEverything, track]);

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; if (f.length) void playFiles(f); };

  // audio element → playing state
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const on = () => { if (modeRef.current === "file") { setPlaying(true); setReady(false); } };
    const off = () => { if (modeRef.current === "file") setPlaying(false); };
    const meta = () => { if (modeRef.current === "file" && a.duration && Number.isFinite(a.duration)) setTrack((t) => (t && !t.duration ? { ...t, duration: a.duration } : t)); };
    a.addEventListener("play", on); a.addEventListener("pause", off); a.addEventListener("ended", off); a.addEventListener("loadedmetadata", meta);
    return () => { a.removeEventListener("play", on); a.removeEventListener("pause", off); a.removeEventListener("ended", off); a.removeEventListener("loadedmetadata", meta); };
  }, []);

  // ---------- source 3: follow Spotify / Apple Music on this computer through the helper ----------
  const followKey = useRef("");
  const onFollow = useCallback(async (np: NowPlaying | null) => {
    followRef.current = np;
    if (!np) return;
    if (modeRef.current !== "follow") { stopEverything(); setMode("follow"); modeRef.current = "follow"; setPanel(null); }
    setPlaying(np.playing);
    const key = `${np.title}|${np.artist}`;
    if (key === followKey.current) return;
    followKey.current = key;
    const token = ++loadToken.current;
    setTrack({ title: np.title, artist: np.artist, album: np.album, duration: np.duration, art: null });
    loadingLyrics();
    try {
      const s = await matchSong({ title: np.title, artist: np.artist, duration: np.duration });
      if (token !== loadToken.current) return;
      if (s) { setTrack((t) => (t ? { ...t, art: s.art, store: s.store } : t)); void paint(s.art); }
      const l = s ? await lyricsFor({ id: s.id, duration: np.duration }) : { lines: [], kind: "none" as const };
      if (token === loadToken.current) applyLyrics(l);
    } catch { if (token === loadToken.current) setLyr("none"); }
  }, [applyLyrics, loadingLyrics, paint, stopEverything]);
  const [following, setFollowing] = useState(false);
  function stopFollow() { setFollowing(false); followRef.current = null; followKey.current = ""; }

  // ---------- the microphone: let the light hear a song playing elsewhere ----------
  const toggleMic = useCallback(async () => {
    if (micOn) { micStream.current?.getTracks().forEach((t) => t.stop()); micStream.current = null; micMeter.current = null; setMicOn(false); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (!ctxRef.current) { const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; ctxRef.current = new AC(); }
      void ctxRef.current.resume();
      const an = ctxRef.current.createAnalyser(); ctxRef.current.createMediaStreamSource(s).connect(an);
      micStream.current = s; micMeter.current = new Meter(an); setMicOn(true); say("The light is listening (nothing is recorded or sent)");
    } catch { say("No microphone access. The light keeps its own slow pulse."); }
  }, [micOn, say]);

  // ---------- full screen and the floating lyrics window ----------
  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => say("Full screen isn't allowed here. Try F11."));
  }, [say]);
  useEffect(() => { const f = () => setFull(!!document.fullscreenElement); document.addEventListener("fullscreenchange", f); return () => document.removeEventListener("fullscreenchange", f); }, []);

  const popOut = useCallback(async () => {
    if (pip) { pip.close(); return; }
    const dp = (window as unknown as { documentPictureInPicture?: { requestWindow(o: { width: number; height: number }): Promise<Window> } }).documentPictureInPicture;
    if (!dp) { say("Floating lyrics need Chrome or Edge on a computer."); return; }
    try {
      const w = await dp.requestWindow({ width: 440, height: 300 });
      for (const ss of [...document.styleSheets]) {
        try { const st = w.document.createElement("style"); st.textContent = [...ss.cssRules].map((r) => r.cssText).join("\n"); w.document.head.appendChild(st); }
        catch { if (ss.href) { const l = w.document.createElement("link"); l.rel = "stylesheet"; l.href = ss.href; w.document.head.appendChild(l); } }
      }
      w.document.title = "backlit lyrics";
      w.document.body.className = "pip-body";
      w.addEventListener("pagehide", () => { pipRootRef.current = null; setPip(null); });
      setPip(w);
    } catch { say("The browser didn't open the floating window."); }
  }, [pip, say]);

  // ---------- lyric styles ----------
  const pickStyle = useCallback((id: StyleId) => {
    setPrefs((p) => { const n = { ...p, style: id, mix: false }; ls.set("backlit:prefs", n); return n; });
    say(`${STYLES.find((x) => x.id === id)?.name}: ${STYLES.find((x) => x.id === id)?.line}`);
  }, [say]);
  const stepStyle = useCallback((d: number) => {
    const cur = prefsRef.current.style;
    const k = STYLES.findIndex((x) => x.id === cur);
    pickStyle(STYLES[(Math.max(0, k) + d + STYLES.length) % STYLES.length].id);
  }, [pickStyle]);

  // ---------- keyboard and pointer ----------
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) { if (e.key === "Escape") (el as HTMLInputElement).blur(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") { if (modeRef.current === "file" || modeRef.current === "manual" || modeRef.current === "video") { e.preventDefault(); toggle(); } }
      else if (e.key === "f" || e.key === "F") toggleFull();
      else if (e.key === "ArrowRight") { e.preventDefault(); nudge(0.5); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-0.5); }
      else if (e.key === "Escape") setPanel((p) => (p && modeRef.current !== "none" ? null : p));
      else if (e.key === "l" || e.key === "L") setPanel((p) => (p === "lines" ? null : "lines"));
      else if (e.key === "s" || e.key === "S") stepStyle(e.shiftKey ? -1 : 1);
      else if (/^[0-9]$/.test(e.key) && modeRef.current !== "none") { const k = (Number(e.key) + 9) % 10; pickStyle(STYLES[k].id); }
      lastMove.current = performance.now();
    };
    const move = () => { lastMove.current = performance.now(); };
    window.addEventListener("keydown", key); window.addEventListener("pointermove", move); window.addEventListener("pointerdown", move);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("pointermove", move); window.removeEventListener("pointerdown", move); };
  }, [nudge, toggle, toggleFull, stepStyle, pickStyle]);

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); const f = [...e.dataTransfer.files]; if (f.length) void playFiles(f); };

  const lyrNote = { idle: "", loading: "Finding the lyrics…", words: "Word-by-word lyrics", lines: "Synced lyrics", estimated: "Words only, timing estimated", none: "No lyrics found for this one" }[lyr];
  const tapAlong = mode === "manual";
  const hasSong = mode !== "none";
  const pick = (s: Song) => void (prefs.source === "elsewhere" ? chooseSong(s) : playHere(s));
  // Mix: a different style every eight lines, in an order of its own for each song
  const mixOrder = useMemo(() => { const r = hashStr(track?.title ?? "backlit"); return [...STYLES].sort((a, b) => (hashStr(a.id + r) % 997) - (hashStr(b.id + r) % 997)).map((x) => x.id); }, [track?.title]);
  const style: StyleId | "off" = prefs.style === "off" ? "off" : prefs.mix ? mixOrder[Math.floor(Math.max(0, idx) / 8) % mixOrder.length] : prefs.style;
  const styleInfo = STYLES.find((x) => x.id === style);
  const hazeOn = prefs.backdrop === "haze" || (prefs.backdrop === "auto" && styleInfo?.backdrop === "haze");
  const lyricProps = { lines, index: idx, sung, colors: glowColors, art: track?.art ?? null, title: track?.title ?? "", artist: track?.artist ?? "", playing, align: prefs.align, now: cur, onSeek: mode === "follow" ? undefined : (i: number) => seekTo(Math.max(0, lines[i].t - offset - LEAD + 0.05), true) };
  const rootVars = { "--tint": glowColors[1] ?? glowColors[0], "--c0": glowColors[0], "--c1": glowColors[1] ?? glowColors[0], "--c2": glowColors[2] ?? glowColors[0], "--c3": glowColors[3] ?? glowColors[1] ?? glowColors[0], "--on-c0": inkOn(glowColors[0]), "--ls": prefs.text } as CSSProperties;

  return (
    <div ref={rootRef} style={rootVars} className={`bl${full ? " is-full" : ""}${dragging ? " dragging" : ""}${mode === "video" ? " has-video" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }} onDrop={onDrop}>
      <div className={`haze${hazeOn && hasSong ? " on" : ""}`} aria-hidden="true"><i style={track?.art ? { backgroundImage: `url("${track.art}")` } : { background: `linear-gradient(120deg, ${glowColors.join(", ")})` }} /></div>
      <Glow colors={glowColors} size={prefs.size} power={prefs.power} />
      <audio ref={audioRef} preload="auto" />

      {/* YouTube's own player, always in view while it plays (nothing is drawn over it) */}
      <div className={`yt${mode === "video" ? "" : " off"}`}>
        <div className={`yt-frame${vid.state === "finding" ? " finding" : ""}`}><div ref={ytHost} className="yt-host" /></div>
        {mode === "video" && vid.state === "finding" && <p className="yt-note"><span className="spin" aria-hidden="true" /> Finding the song on YouTube…</p>}
        {mode === "video" && vid.state === "press" && <p className="yt-note hot">Press play on the video to start</p>}
      </div>

      <main className="scene">
        {hasSong && !ready && style !== "off" && <Lyrics {...lyricProps} style={style} />}
        {hasSong && !ready && lyr === "loading" && <p className="scene-note">Finding the lyrics…</p>}
        {hasSong && !ready && lyr === "none" && <p className="scene-note">No lyrics for this one yet. The light still plays.</p>}

        {ready && track && (
          <section className="ready" aria-label="Start the song">
            {track.art ? <img className="ready-art" src={track.art} alt="" crossOrigin="anonymous" /> : <div className="ready-art blank" />}
            <h2>{track.title}</h2>
            <p className="muted">{track.artist}{track.duration ? ` · ${fmtDur(track.duration)}` : ""}{example ? " · example" : ""}</p>
            <p className="ready-how">{example ? "This is an example with our own words, no music. Hit Start and watch it land." : <>Press play on the song in Spotify, Apple Music or YouTube, and hit <b>Start</b> here at the same moment.</>}</p>
            <div className="row">
              <button className="btn primary" onClick={play} autoFocus>Start <kbd>space</kbd></button>
              {lines.length > 0 && !example && <button className="btn ghost" onClick={() => setPanel("lines")}>Already playing? Tap the line you hear</button>}
            </div>
            <p className="tiny">{lyrNote}</p>
          </section>
        )}
      </main>

      {/* ---------- the dock ---------- */}
      {hasSong && (
        <footer className="dock" aria-label="Player">
          <div className="dock-track">
            {track?.art ? <img src={track.art} alt="" crossOrigin="anonymous" /> : <div className="art-blank" />}
            <div className="dock-words">
              <b title={track?.title}>{track?.title}{example && <em className="tag">example</em>}</b>
              <span>{track?.artist || (mode === "file" ? "From your computer" : "")}{track?.store && <> · <a href={track.store} target="_blank" rel="noreferrer">Apple Music</a></>}</span>
            </div>
          </div>
          <div className="dock-mid">
            <div className="row tight">
              {(mode === "file" || tapAlong || mode === "video") && <button className="icon big" onClick={toggle} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause (space)" : "Play (space)"}>{playing ? <IconPause /> : <IconPlay />}</button>}
              {mode === "follow" && <span className="pill live">{playing ? "Following your player" : "Paused in your player"}</span>}
              <span ref={timeRef} className="time">0:00</span>
              <span className="lyr-note">{lyrNote}{offset ? ` · ${offset > 0 ? "+" : ""}${offset.toFixed(1)} s` : ""}</span>
              {mode === "video" && vid.list.length > 1 && <button className="link small" onClick={otherVideo} title="Play a different upload of this song">Wrong version?</button>}
            </div>
            <div className="bar" onClick={(e) => { if (mode === "follow" || !track?.duration) return; const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * track.duration); }} role="presentation">
              <div ref={barRef} className="bar-fill" />
            </div>
          </div>
          <div className="dock-tools">
            <div className="sync" title="Lyrics too early or too late? Shift them (← →)">
              <button className="icon" onClick={() => nudge(-0.5)} aria-label="Lyrics later">−</button>
              <span>sync</span>
              <button className="icon" onClick={() => nudge(0.5)} aria-label="Lyrics sooner">+</button>
            </div>
            <button className={`btn small style-btn${panel === "styles" ? " on" : ""}`} onClick={() => setPanel(panel === "styles" ? null : "styles")} title="Lyric styles (S, or 1–0)"><i />{prefs.mix ? "Mix" : styleInfo?.name ?? "Off"}</button>
            <button className={`icon${panel === "lines" ? " on" : ""}`} onClick={() => setPanel(panel === "lines" ? null : "lines")} title="All lines (L): tap one to jump there" aria-label="All lines"><IconLines /></button>
            {mode !== "file" && <button className={`icon${micOn ? " on" : ""}`} onClick={toggleMic} title="Let the light hear the music (microphone)" aria-label="Listen with the microphone"><IconMic /></button>}
            <button className={`icon${pip ? " on" : ""}`} onClick={popOut} title="Float the lyrics over your other apps" aria-label="Floating lyrics"><IconFloat /></button>
            <button className={`icon${full ? " on" : ""}`} onClick={toggleFull} title="Full screen (F)" aria-label="Full screen"><IconFull /></button>
            <button className={`icon${panel === "settings" ? " on" : ""}`} onClick={() => setPanel(panel === "settings" ? null : "settings")} title="Light and lyrics settings" aria-label="Settings"><IconDial /></button>
            <button className="btn small" onClick={() => setPanel("pick")}>Change song</button>
          </div>
        </footer>
      )}

      {/* ---------- what's playing? ---------- */}
      {panel === "pick" && (
        <div className="veil" onClick={(e) => { if (e.target === e.currentTarget && hasSong) setPanel(null); }}>
          <section className="picker" aria-label="Pick what's playing">
            <header className="picker-head">
              <div className="brand"><LogoMark /> backlit</div>
              {hasSong && <button className="icon" onClick={() => setPanel(null)} aria-label="Close"><IconX /></button>}
            </header>
            <h1>{prefs.source === "here" ? "What do you want to hear?" : "What's playing?"}</h1>
            <div className="src-row">
              <div className="seg small src" role="group" aria-label="Where the song plays">
                <button className={prefs.source === "here" ? "on" : ""} onClick={() => setPref("source", "here")} aria-pressed={prefs.source === "here"}>Play it here</button>
                <button className={prefs.source === "elsewhere" ? "on" : ""} onClick={() => setPref("source", "elsewhere")} aria-pressed={prefs.source === "elsewhere"}>It&apos;s playing somewhere else</button>
              </div>
              <span className="tiny">{prefs.source === "here" ? "Plays on this page through YouTube. The lyrics follow it exactly." : "Spotify, Apple Music, a record: you hit Start as it starts."}</span>
            </div>
            <div className="search">
              <IconSearch />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter") return; e.preventDefault(); if (pasted) void playLink(pasted); else if (results?.[0]) pick(results[0]); }} placeholder="Song and artist, or paste a YouTube link" autoFocus spellCheck={false} aria-label="Search for a song or paste a YouTube link" />
              {searching && <span className="spin" aria-hidden="true" />}
            </div>
            {searchErr && <p className="err">{searchErr}</p>}
            {pasted && (
              <ul className="results">
                <li><button onClick={() => void playLink(pasted)}><img src={`https://i.ytimg.com/vi/${pasted}/mqdefault.jpg`} alt="" className="wide" /><span className="r-words"><b>Play this YouTube video</b><span>The lyrics are looked up from its title</span></span><span className="r-tag words">YouTube</span></button></li>
              </ul>
            )}
            {results && (
              <ul className="results">
                {results.length === 0 && !searching && <li className="empty">Nothing found. Try the song name with fewer words, or the artist&apos;s name.</li>}
                {results.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => pick(s)}>
                      {s.art ? <img src={s.art.replace("600x600", "120x120")} alt="" /> : <span className="art-blank" />}
                      <span className="r-words"><b>{s.title}</b><span>{s.artist}{s.album ? ` · ${s.album}` : ""}</span></span>
                      <span className={`r-tag ${s.kind}`}>{{ words: "word by word", lines: "synced", plain: "words only", none: "no lyrics" }[s.kind]}</span>
                      <span className="r-dur">{fmtDur(s.duration)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!results && recents.length > 0 && (
              <div className="recents">
                <p className="label">Played here before</p>
                <ul className="results">
                  {recents.map((s) => (
                    <li key={s.id}><button onClick={() => pick(s)}>{s.art ? <img src={s.art.replace("600x600", "120x120")} alt="" /> : <span className="art-blank" />}<span className="r-words"><b>{s.title}</b><span>{s.artist}</span></span><span className="r-dur">{fmtDur(s.duration)}</span></button></li>
                  ))}
                </ul>
              </div>
            )}

            <div className="or"><span>or</span></div>
            <label className={`drop${dragging ? " hot" : ""}`}>
              <input type="file" accept="audio/*,.lrc,.mp3,.m4a,.flac,.wav,.ogg,.opus" multiple onChange={onPickFiles} hidden />
              <IconFile />
              <span><b>Play a song file from this computer</b><br /><span className="muted">MP3, M4A, FLAC, WAV or OGG. Exact timing, and the light moves with the bass. Drop its .lrc too if you have one. Nothing is uploaded.</span></span>
            </label>
            <Follow active={following} onStart={() => setFollowing(true)} onStop={() => { stopFollow(); if (modeRef.current === "follow") { setMode("none"); setTrack(null); setLines([]); } }} onNow={onFollow} />

            <ol className="how" aria-label="How it works">
              <li><b>1</b>{prefs.source === "here" ? "Pick a song. It plays right here." : "Pick the song, or play a file."}</li>
              <li><b>2</b>{prefs.source === "here" ? "The lyrics land with it, word by word." : "Hit Start as the song starts, or tap the line you hear."}</li>
              <li><b>3</b>Press S for a new lyric style, F for full screen, and turn the lights off.</li>
            </ol>
            <button className="link" onClick={() => void chooseSong({ id: -1, title: "Night drive", artist: "backlit", album: "", duration: 40, art: exampleArt(), store: null, kind: "lines" }, { example: true })}>See an example first</button>
          </section>
        </div>
      )}

      {/* ---------- every line: tap to jump ---------- */}
      {panel === "lines" && (
        <aside className="sheet" aria-label="All lines">
          <header><b>{tapAlong ? "Tap the line you're hearing" : "Tap a line to jump there"}</b><button className="icon" onClick={() => setPanel(null)} aria-label="Close"><IconX /></button></header>
          {mode === "follow" ? <p className="muted pad">Your player sets the timing. Use sync (− +) if the words run early or late.</p> : null}
          {lines.length === 0 ? <p className="muted pad">{lyrNote || "No lyrics yet."}</p> : (
            <ol className="lines">
              {lines.map((l, i) => l.text ? (
                <li key={i} className={i === idx ? "on" : ""}><button disabled={mode === "follow"} onClick={() => { seekTo(Math.max(0, l.t - offset - LEAD + 0.05), true); if (tapAlong) setPanel(null); }}><span>{fmtDur(l.t) || "0:00"}</span>{l.text}</button></li>
              ) : null)}
            </ol>
          )}
        </aside>
      )}

      {/* ---------- lyric styles ---------- */}
      {panel === "styles" && (
        <aside className="shelf" aria-label="Lyric styles">
          <div className="shelf-head">
            <b>Lyric styles</b>
            <label className="check"><input type="checkbox" checked={prefs.mix} onChange={(e) => setPref("mix", e.target.checked)} /> Mix: a new style every few lines</label>
            <div className="seg small" role="group" aria-label="Behind the words">{(["auto", "dark", "haze"] as const).map((v) => <button key={v} className={prefs.backdrop === v ? "on" : ""} onClick={() => setPref("backdrop", v)}>{v === "haze" ? "cover haze" : v}</button>)}</div>
            <label className="size">Size <input type="range" min={0.7} max={1.5} step={0.05} value={prefs.text} onChange={(e) => setPref("text", Number(e.target.value))} aria-label="Lyrics size" /></label>
            <div className="seg small" role="group" aria-label="Line up">{(["left", "center"] as const).map((v) => <button key={v} className={prefs.align === v ? "on" : ""} onClick={() => setPref("align", v)}>{v}</button>)}</div>
            <button className="icon" onClick={() => setPanel(null)} aria-label="Close"><IconX /></button>
          </div>
          <div className="shelf-row">
            {STYLES.map((x, k) => (
              <button key={x.id} className={`card-st${!prefs.mix && prefs.style === x.id ? " on" : ""}`} onClick={() => pickStyle(x.id)} aria-pressed={!prefs.mix && prefs.style === x.id}>
                <span className="art"><Swatch id={x.id} /></span>
                <b>{x.name}</b><small>{x.line}</small><kbd>{(k + 1) % 10}</kbd>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* ---------- settings ---------- */}
      {panel === "settings" && (
        <aside className="sheet" aria-label="Settings">
          <header><b>Light and lyrics</b><button className="icon" onClick={() => setPanel(null)} aria-label="Close"><IconX /></button></header>
          <div className="set">
            <p className="label">Colours</p>
            <div className="swatches">
              {Object.entries(PRESETS).map(([name, cols]) => {
                const c = name === "from the art" ? artColors ?? [] : cols;
                return <button key={name} className={prefs.palette === name ? "on" : ""} onClick={() => setPref("palette", name)}><i style={{ background: c.length ? `linear-gradient(135deg, ${c.join(", ")})` : "conic-gradient(#ff2fb3, #8f3dff, #2fa8ff, #b6ff3b, #ff2fb3)" }} />{name === "from the art" ? "Album art" : name}</button>;
              })}
            </div>
            <p className="label">Glow size</p>
            <div className="seg">{[["thin", 10], ["medium", 18], ["thick", 30]].map(([n, v]) => <button key={n} className={prefs.size === v ? "on" : ""} onClick={() => setPref("size", v as number)}>{n}</button>)}</div>
            <p className="label">Brightness</p>
            <input type="range" min={0.3} max={1.3} step={0.05} value={prefs.power} onChange={(e) => setPref("power", Number(e.target.value))} aria-label="Brightness" />
            <p className="label">Lyrics</p>
            <button className="btn small" onClick={() => setPanel("styles")}>Styles: {prefs.mix ? "Mix" : styleInfo?.name ?? "Off"}</button>{" "}
            <button className={`btn small ghost${prefs.style === "off" ? " on" : ""}`} onClick={() => setPref("style", prefs.style === "off" ? "thread" : "off")}>{prefs.style === "off" ? "Show lyrics" : "Hide lyrics, light only"}</button>
            <div className="seg">{(["left", "center"] as const).map((v) => <button key={v} className={prefs.align === v ? "on" : ""} onClick={() => setPref("align", v)}>{v}</button>)}</div>
            <label className="check"><input type="checkbox" checked={prefs.hideIdle} onChange={(e) => setPref("hideIdle", e.target.checked)} /> Hide the controls while a song plays</label>
            <p className="tiny">Saved in this browser only.</p>
          </div>
        </aside>
      )}

      {dragging && <div className="drop-hint">Drop the song to play it</div>}
      {toast && <div className="toast" role="status">{toast}</div>}

      {pip && createPortal(
        <div className="pip" ref={(el) => { pipRootRef.current = el; }}>
          <Glow colors={glowColors} size={Math.max(8, Math.round(prefs.size * 0.6))} power={prefs.power} />
          <Lyrics {...lyricProps} style={style === "off" || style === "film" || style === "scroll" || style === "vinyl" ? "sing" : style} align="center" />
          {!lines.length && <p className="scene-note">{lyrNote || "Pick a song in the backlit tab."}</p>}
        </div>,
        pip.document.body,
      )}
    </div>
  );
}

// ---------- icons (drawn here, 20px, currentColor) ----------
const sv = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
function IconPlay() { return <svg {...sv} fill="currentColor" stroke="none"><path d="M6 4.2v11.6c0 .6.7 1 1.2.6l9-5.8a.7.7 0 0 0 0-1.2l-9-5.8C6.7 3.2 6 3.6 6 4.2Z" /></svg>; }
function IconPause() { return <svg {...sv} fill="currentColor" stroke="none"><rect x="5" y="4" width="3.4" height="12" rx="1" /><rect x="11.6" y="4" width="3.4" height="12" rx="1" /></svg>; }
function IconLines() { return <svg {...sv}><path d="M4 5.5h12M4 10h12M4 14.5h7" /></svg>; }
function IconMic() { return <svg {...sv}><rect x="7.5" y="3" width="5" height="9" rx="2.5" /><path d="M5 10a5 5 0 0 0 10 0M10 15v2.5" /></svg>; }
function IconFloat() { return <svg {...sv}><rect x="2.5" y="4" width="15" height="12" rx="2" /><rect x="10" y="9.5" width="5.5" height="4.5" rx="1" fill="currentColor" stroke="none" /></svg>; }
function IconFull() { return <svg {...sv}><path d="M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4" /></svg>; }
function IconDial() { return <svg {...sv}><path d="M4 6h6M14 6h2M4 14h2M10 14h6" /><circle cx="12" cy="6" r="2" /><circle cx="8" cy="14" r="2" /></svg>; }
function IconX() { return <svg {...sv}><path d="m5 5 10 10M15 5 5 15" /></svg>; }
function IconSearch() { return <svg {...sv}><circle cx="9" cy="9" r="5.5" /><path d="m13.2 13.2 3.3 3.3" /></svg>; }
function IconFile() { return <svg {...sv} width={26} height={26}><path d="M8 15.5V4.8l8-1.8v10.6" /><circle cx="6" cy="15.5" r="2" /><circle cx="14" cy="13.6" r="2" /></svg>; }
export function LogoMark() { return <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="15" rx="4" fill="none" stroke="url(#lm)" strokeWidth="2.4" /><defs><linearGradient id="lm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff3fae" /><stop offset=".55" stopColor="#9a4dff" /><stop offset="1" stopColor="#ff8a3d" /></linearGradient></defs></svg>; }

/** Dark or light words on a colour, whichever reads. */
function inkOn(hex = "#ff3fae") {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? "#0b0a0c" : "#ffffff";
}
