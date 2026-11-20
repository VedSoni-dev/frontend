// /backlit has its own root layout (a route group), so its CSS and its lyric styles' fonts load on this page only.
import { Anton, DM_Mono, Geist, Inter_Tight, Instrument_Serif, Permanent_Marker, Rubik, Tilt_Neon, Unbounded } from "next/font/google";
import { pieceMetadata, pieceViewport } from "@/lib/meta";
import "@/pieces/backlit/styles.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const tight = Inter_Tight({ subsets: ["latin"], variable: "--f-tight", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono", display: "swap" });
// the lyric styles' faces: each only downloads when a style that uses it is on screen
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--f-anton", display: "swap", preload: false });
const wide = Unbounded({ subsets: ["latin"], variable: "--f-wide", display: "swap", preload: false });
const neon = Tilt_Neon({ subsets: ["latin"], variable: "--f-neon", display: "swap", preload: false });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--f-serif", display: "swap", preload: false });
const round = Rubik({ subsets: ["latin"], variable: "--f-round", display: "swap", preload: false });
const marker = Permanent_Marker({ subsets: ["latin"], weight: "400", variable: "--f-marker", display: "swap", preload: false });

export const metadata = pieceMetadata("backlit");
export const viewport = pieceViewport("backlit");

export default function BacklitLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={[sans, tight, mono, anton, wide, neon, serif, round, marker].map((f) => f.variable).join(" ")}>
      <body>{children}</body>
    </html>
  );
}
