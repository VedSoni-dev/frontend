// cirrus: the take-home code. Every output inlines the engine (public/sky/cirrus.js, fetched by the page) with the
// settings on screen baked in, so it is one file with no dependencies and no network calls.
import type { SkyConfig } from "./cirrus.js";

const KEYS = ["seed", "time", "cover", "wind", "speed", "cell", "glyphs"] as const;
const r2 = (n: number) => Math.round(n * 100) / 100;
const strip = (engine: string) => engine.replace(/^export \{[^}]*\};?\s*$/gm, "").replace(/^export (const|function|let) /gm, "$1 ");

export function attrs(c: SkyConfig) {
  const a = KEYS.map((k) => `${k}="${typeof c[k] === "number" ? r2(c[k] as number) : c[k]}"`);
  for (const k of ["trail", "gust", "fade"] as const) a.push(`${k}="${c[k]}"`);
  return a.join(" ");
}
export function plain(c: SkyConfig) {
  return `{ seed: ${c.seed}, time: "${c.time}", cover: ${r2(c.cover)}, wind: ${r2(c.wind)}, speed: ${r2(c.speed)}, cell: ${c.cell}, glyphs: "${c.glyphs}", trail: ${c.trail}, gust: ${c.gust}, fade: ${c.fade} }`;
}

/** Paste into any HTML page where the sky goes: the element plus the engine as one inline module. */
export function htmlSnippet(engine: string, c: SkyConfig) {
  return `<!-- cirrus sky · MIT · https://frontend.vedantsoni.com/sky · set the height you want -->
<cirrus-sky ${attrs(c)} style="display:block;height:45vh"></cirrus-sky>
<script type="module">
${strip(engine).trim()}
</script>`;
}

/** Sky.tsx: a React component with the same engine inlined; mounts in an effect, cleans up on unmount. */
export function reactFile(engine: string, c: SkyConfig) {
  return `"use client";
// Sky.tsx: a live sky of tiny characters; the wind writes //// where the pointer moves. MIT.
// From https://frontend.vedantsoni.com/sky (cirrus). Use: <Sky style={{ height: "45vh" }} /> (it fills its box).
// Your settings: ${plain(c)}
// @ts-nocheck
import { useEffect, useRef } from "react";

// ---- engine ----
${strip(engine).trim()}
// ---- React ----

const SETTINGS = ${plain(c)};

export default function Sky({ className, style, ...settings }: { className?: string; style?: React.CSSProperties } & Record<string, unknown>) {
  const el = useRef<HTMLDivElement>(null);
  const sky = useRef<ReturnType<typeof mount> | null>(null);
  useEffect(() => {
    sky.current = mount(el.current, { ...SETTINGS, ...settings });
    return () => { sky.current?.destroy(); sky.current = null; };
  }, []);
  useEffect(() => { sky.current?.set({ ...SETTINGS, ...settings }); });
  return <div ref={el} className={className} aria-hidden="true" style={{ position: "relative", overflow: "hidden", height: 360, ...style }} />;
}
`;
}

/** A whole page that opens from your disk: the sky with a line of text under it. */
export function htmlPage(engine: string, c: SkyConfig, page: string, ink: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sky</title>
<style>html,body{margin:0;background:${page};color:${ink};font:16px/1.6 system-ui,sans-serif}main{max-width:620px;margin:-6vh auto 0;padding:0 16px 64px;position:relative}</style>
</head><body>
${htmlSnippet(engine, c)}
<main><h1>Your Name</h1><p>Replace this with your page. Move through the sky above.</p></main>
</body></html>
`;
}
