// /sky has its own root layout (a route group), so cirrus' CSS loads on this page only.
import { Inter, Geist_Mono } from "next/font/google";
import { pieceMetadata, pieceViewport } from "@/lib/meta";
import "@/pieces/sky/styles.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = pieceMetadata("sky");
export const viewport = pieceViewport("sky");

export default function SkyLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
