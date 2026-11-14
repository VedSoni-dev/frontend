// /bubble has its own root layout (a route group), so suds' CSS loads on this page only.
import { Inter, Geist_Mono } from "next/font/google";
import { pieceMetadata, pieceViewport } from "@/lib/meta";
import "@/pieces/bubble/styles.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = pieceMetadata("bubble");
export const viewport = pieceViewport("bubble");

export default function BubbleLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
