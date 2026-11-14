// /effects has its own root layout (a route group), so tincture's CSS loads on this page only and moving between
// pieces is a full page load: no piece's global styles ever meet another's.
import { Inter, Instrument_Serif, Geist_Mono } from "next/font/google";
import { pieceMetadata, pieceViewport } from "@/lib/meta";
import "@/pieces/effects/styles.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serif", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = pieceMetadata("effects");
export const viewport = pieceViewport("effects");

export default function EffectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
