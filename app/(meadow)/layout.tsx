// /meadow has its own root layout (a route group), so loam's CSS loads on this page only.
import { Inter, Geist_Mono } from "next/font/google";
import { pieceMetadata, pieceViewport } from "@/lib/meta";
import "@/pieces/meadow/styles.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = pieceMetadata("meadow");
export const viewport = pieceViewport("meadow");

export default function MeadowLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
