// /hold has its own root layout (a route group), so baize's CSS loads on this page only.
import { Inter, Geist_Mono, Nunito } from "next/font/google";
import { pieceMetadata, pieceViewport } from "@/lib/meta";
import "@/pieces/hold/styles.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// the buttons' words: a rounded face, the same on every computer
const round = Nunito({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-round", display: "swap" });

export const metadata = pieceMetadata("hold");
export const viewport = pieceViewport("hold");

export default function HoldLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${round.variable}`}>
      <body>{children}</body>
    </html>
  );
}
