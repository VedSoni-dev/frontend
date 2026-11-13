// /flowers has its own root layout (a route group), so seedbed's CSS loads on this page only and moving between
// pieces is a full page load: no piece's global styles ever meet another's.
import { pieceMetadata, pieceViewport } from "@/lib/meta";
import "@/pieces/flowers/styles.css";

export const metadata = pieceMetadata("flowers");
export const viewport = pieceViewport("flowers");

export default function FlowersLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400..700&family=JetBrains+Mono:wght@400..500&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
