// Head tags for a piece's page, from pieces/index.ts: title, description, share card (the piece's cover), icon, canonical.
import type { Metadata, Viewport } from "next";
import { piece, SITE } from "@/pieces";

export function pieceMetadata(path: string): Metadata {
  const p = piece(path);
  const title = `${p.name}: ${p.what.toLowerCase()}, free and open source`;
  const description = `${p.line} Free with a publik account, MIT licensed. Rebuilt from ${p.credit.work} by ${p.credit.name}.`;
  const url = `${SITE}/${p.path}`;
  const image = { url: p.media.cover, width: 1200, height: 630, alt: `${p.name}: ${p.what.toLowerCase()}` };
  return {
    metadataBase: new URL(SITE),
    title,
    description,
    alternates: { canonical: url },
    icons: { icon: `/${p.path}/icon.svg` },
    openGraph: { title, description, url, type: "website", siteName: "fork this frontend", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export function pieceViewport(path: string): Viewport {
  const { theme } = piece(path);
  return {
    width: "device-width", initialScale: 1, viewportFit: "cover",
    themeColor: [{ media: "(prefers-color-scheme: light)", color: theme.light }, { media: "(prefers-color-scheme: dark)", color: theme.dark }],
  };
}
