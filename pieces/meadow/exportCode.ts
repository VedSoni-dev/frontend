// loam: the take-home code. Each output carries the settings on screen. The HTML and React files inline the engine
// (public/meadow/loam.js, fetched by the page) so they are one file with no dependencies and no network calls; the CDN
// tag links the same public file instead.
import type { MeadowConfig } from "./loam.js";

export const CDN = "https://frontend.vedantsoni.com/meadow/loam.js";
const r2 = (n: number) => Math.round(n * 100) / 100;
const strip = (engine: string) => engine.replace(/^export \{[^}]*\};?\s*$/gm, "").replace(/^export (const|function|let) /gm, "$1 ");

export function attrs(c: MeadowConfig) {
  return [`planter="${c.planter}"`, `mix="${c.mix.join(",")}"`, `density="${r2(c.density)}"`, `wind="${r2(c.wind)}"`, `sun="${c.sun}"`,
    `ground="${c.ground}"`, `seed="${c.seed}"`, `bugs="${c.bugs}"`, `grow="${c.grow}"`].join(" ");
}
export function plain(c: MeadowConfig) {
  return `{ planter: "${c.planter}", mix: ${JSON.stringify(c.mix)}, density: ${r2(c.density)}, wind: ${r2(c.wind)}, sun: ${c.sun}, ground: "${c.ground}", seed: ${c.seed}, bugs: ${c.bugs}, grow: ${c.grow} }`;
}

/** Paste into any HTML page: the element plus the engine as one inline module. */
export function htmlSnippet(engine: string, c: MeadowConfig) {
  return `<!-- loam meadow · MIT · https://frontend.vedantsoni.com/meadow · set the height you want -->
<loam-meadow ${attrs(c)} style="display:block;height:70vh"></loam-meadow>
<script type="module">
${strip(engine).trim()}
</script>`;
}

/** Two lines that load the public engine file. */
export function cdnTag(c: MeadowConfig) {
  return `<script type="module" src="${CDN}"></script>
<loam-meadow ${attrs(c)} style="display:block;height:70vh"></loam-meadow>`;
}

/** Meadow.tsx: a React component with the same engine inlined; mounts in an effect, cleans up on unmount. */
export function reactFile(engine: string, c: MeadowConfig) {
  return `"use client";
// Meadow.tsx: a living flower meadow in a planter, drawn in WebGL. Move through it; hold or press L for a lens. MIT.
// From https://frontend.vedantsoni.com/meadow (loam). Use: <Meadow style={{ height: "70vh" }} /> (it fills its box).
// Your settings: ${plain(c)}
// @ts-nocheck
import { useEffect, useRef } from "react";

// ---- engine ----
${strip(engine).trim()}
// ---- React ----

const SETTINGS = ${plain(c)};

export default function Meadow({ className, style, ...settings }: { className?: string; style?: React.CSSProperties } & Record<string, unknown>) {
  const el = useRef<HTMLDivElement>(null);
  const meadow = useRef<ReturnType<typeof mount> | null>(null);
  useEffect(() => {
    meadow.current = mount(el.current, { ...SETTINGS, ...settings });
    return () => { meadow.current?.destroy(); meadow.current = null; };
  }, []);
  useEffect(() => { meadow.current?.set({ ...SETTINGS, ...settings }); });
  return <div ref={el} className={className} role="img" aria-label="A flower meadow in a planter" style={{ position: "relative", overflow: "hidden", height: 480, ...style }} />;
}
`;
}
