// /footer has its own root layout (a route group), so grainfoot's CSS loads on this page only and moving between
// pieces is a full page load: no piece's global styles ever meet another's.
import "@fontsource-variable/inter";
import { pieceMetadata, pieceViewport } from "@/lib/meta";
import "@/pieces/footer/styles.css";

export const metadata = pieceMetadata("footer");
export const viewport = pieceViewport("footer");

export default function FooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
