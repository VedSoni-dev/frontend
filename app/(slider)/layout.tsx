// /slider has its own root layout (a route group), so detent's CSS loads on this page only and moving between
// pieces is a full page load: no piece's global styles ever meet another's.
import { pieceMetadata, pieceViewport } from "@/lib/meta";
import "@/pieces/slider/styles.css";

export const metadata = pieceMetadata("slider");
export const viewport = pieceViewport("slider");

export default function SliderLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=DM+Mono:wght@400;500&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
