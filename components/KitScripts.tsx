"use client";
// The index's taste-kit scripts (public/assets: system, motion, layout). They rework static markup (the hero's entrance,
// the collage's sets, the pinned steps), so they load after React has hydrated the page, never before it, and the
// index holds no React state, so React never redraws what they changed.
// Also the piece cards' previews: a still poster that plays its loop while the pointer rests on the card (fine pointers
// only, never under reduced motion), and starts over each time.
import { useEffect } from "react";

const KIT_JS = ["/assets/system.js", "/assets/motion/motion.js", "/assets/layout/layout.js"];
// The live garden and slider in #embed are the same public files people embed (they add their own children).
const EMBEDS: { src: string; module: boolean }[] = [{ src: "/flowers/seedbed.js", module: true }, { src: "/slider/detent.js", module: false }];

export function KitScripts() {
  useEffect(() => {
    for (const src of KIT_JS) {
      if (document.querySelector(`script[src="${src}"]`)) continue;
      const s = document.createElement("script");
      s.type = "module";
      s.src = src;
      document.body.append(s);
    }
    for (const e of EMBEDS) {
      if (document.querySelector(`script[src="${e.src}"]`)) continue;
      const s = document.createElement("script");
      if (e.module) s.type = "module";
      s.src = e.src;
      document.body.append(s);
    }
    const hover = matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hover) return;
    const offs: (() => void)[] = [];
    document.querySelectorAll<HTMLElement>("[data-hover-play]").forEach((card) => {
      const v = card.querySelector("video");
      if (!v) return;
      const play = () => { v.currentTime = 0; void v.play().catch(() => {}); };
      const stop = () => { v.pause(); v.currentTime = 0; };
      card.addEventListener("pointerenter", play);
      card.addEventListener("pointerleave", stop);
      card.addEventListener("focusin", play);
      card.addEventListener("focusout", stop);
      offs.push(() => { card.removeEventListener("pointerenter", play); card.removeEventListener("pointerleave", stop); card.removeEventListener("focusin", play); card.removeEventListener("focusout", stop); });
    });
    return () => offs.forEach((f) => f());
  }, []);
  return null;
}
