import type { Metadata } from "next";
import { PIECES } from "@/pieces";

export const metadata: Metadata = { title: "Not found · fork this frontend", description: "That page isn't here. The pieces are." };

// Every URL that matches no route (the site has one root layout per piece, so this page brings its own html and style).
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f0f0f", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ width: "min(100% - 48px, 560px)", padding: "48px 0" }}>
          <p style={{ margin: "0 0 8px", color: "#8f8f8f", fontSize: 14 }}>404</p>
          <h1 style={{ margin: "0 0 16px", fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em" }}>No piece at this address.</h1>
          <p style={{ margin: "0 0 24px", lineHeight: 1.6, color: "#cfcfcf" }}>These are the pieces on fork this frontend:</p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {PIECES.map((p) => (
              <li key={p.path}><a href={`/${p.path}`} style={{ color: "#dafa9c", minHeight: 44, display: "inline-flex", alignItems: "center" }}>/{p.path} · {p.what}</a></li>
            ))}
            <li><a href="/" style={{ color: "#fff", minHeight: 44, display: "inline-flex", alignItems: "center" }}>All pieces</a></li>
          </ul>
        </main>
      </body>
    </html>
  );
}
