"use client";
// Light around the edges of the screen: three layers of the same moving gradient (a wide bloom, the glow, a crisp
// bright edge). `--lvl` (0..1, set every frame by the player) makes it breathe with the music.
import type { CSSProperties } from "react";

export function Glow({ colors, size, power }: { colors: string[]; size: number; power: number }) {
  const c = colors.length ? colors : ["#ff2fb3", "#8f3dff", "#ff5a7a"];
  const stops = [...c, c[0]].join(", ");
  const style = { "--th": `${size}px`, "--pow": power, "--grad": `conic-gradient(from var(--spin), ${stops})` } as CSSProperties;
  return (
    <div className="glow" style={style} aria-hidden="true">
      <div className="glow-layer bloom"><div className="ring" /></div>
      <div className="glow-layer soft"><div className="ring" /></div>
      <div className="glow-layer edge"><div className="ring" /></div>
    </div>
  );
}
