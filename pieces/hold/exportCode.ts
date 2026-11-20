// baize: turn the buttons on the page into code people paste into their own site.
import { DEFAULTS } from "./baize.js";

export const CDN = "https://frontend.vedantsoni.com/hold/baize.js";

export interface ButtonCfg { label: string; done: string; felt: string; ball: number }
export interface Settings { v: 1; buttons: ButtonCfg[]; count: number; hold: number; size: number; reset: number; sound: boolean }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The attributes of one <baize-hold>: the button's own, then the shared feel (defaults left out). */
export function attrs(b: ButtonCfg, s: Settings) {
  const a = [`label="${esc(b.label)}"`, `done="${esc(b.done)}"`, `felt="${esc(b.felt)}"`, `ball="${b.ball}"`];
  if (s.hold !== DEFAULTS.hold) a.push(`hold="${s.hold}"`);
  if (s.size !== DEFAULTS.size) a.push(`size="${s.size}"`);
  if (s.reset !== DEFAULTS.reset) a.push(`reset="${s.reset}"`);
  if (s.sound) a.push("sound");
  return a.join(" ");
}
const shown = (s: Settings) => s.buttons.slice(0, s.count);

export function htmlSnippet(s: Settings) {
  const tags = shown(s).map((b) => `<baize-hold ${attrs(b, s)}></baize-hold>`).join("\n");
  return `<!-- baize: hold-to-confirm buttons that sink a pool shot. MIT. https://frontend.vedantsoni.com/hold
     One script tag, then a <baize-hold> wherever you want a button. Self-host: save ${CDN} and point src at your copy. -->
<script type="module" src="${CDN}"></script>

${tags}

<script>
  // Runs when the ball drops. e.detail.label is the button's words, e.detail.done what it says now.
  document.querySelectorAll("baize-hold").forEach((button) =>
    button.addEventListener("confirm", (e) => {
      console.log("done:", e.detail.done);
    })
  );
</script>
`;
}

export function reactFile(s: Settings) {
  const first = shown(s)[0];
  const props = (b: ButtonCfg) =>
    [`label=${JSON.stringify(b.label)}`, `done=${JSON.stringify(b.done)}`, `felt=${JSON.stringify(b.felt)}`, `ball={${b.ball}}`].join(" ");
  const examples = shown(s).map((b) => `//   <HoldButton ${props(b)} onConfirm={() => …} />`).join("\n");
  return `// HoldButton.tsx (baize): a hold-to-confirm button that sinks a pool shot. MIT. https://frontend.vedantsoni.com/hold
// 1. Save ${CDN} as baize.js next to this file.
// 2. Use it:
${examples}
"use client";
import { useEffect, useRef } from "react";
import "./baize.js"; // defines <baize-hold>

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "baize-hold": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, string | number | boolean | undefined>;
    }
  }
}

type Props = { label?: string; done?: string; felt?: string; ball?: number; hold?: number; size?: number; reset?: number; sound?: boolean; disabled?: boolean; onConfirm?: (d: { label: string; done: string }) => void };

export default function HoldButton({ onConfirm, sound, disabled, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  const cb = useRef(onConfirm);
  cb.current = onConfirm;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = (e: Event) => cb.current?.((e as CustomEvent).detail);
    el.addEventListener("confirm", on);
    return () => el.removeEventListener("confirm", on);
  }, []);
  return (
    <baize-hold
      ref={ref}
      hold={${s.hold}}
      size={${s.size}}
      reset={${s.reset}}
      {...rest}
      sound={sound ?? ${s.sound} ? "" : undefined}
      disabled={disabled ? "" : undefined}
    />
  );
}
// Your first button: <HoldButton ${props(first)} />
`;
}

export function fileWithUsage(src: string, s: Settings) {
  const tags = shown(s).map((b) => `//   <baize-hold ${attrs(b, s)}></baize-hold>`).join("\n");
  return `// baize.js: save it in your site, load it once with <script type="module" src="/baize.js"></script>, then:\n${tags}\n// and listen for "confirm" on each one.\n${src}`;
}
