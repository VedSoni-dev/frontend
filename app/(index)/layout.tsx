// The public index at "/" (no sign-in): its own root layout, so the taste kit (public/assets, loaded only here) and the
// pieces' own CSS never meet. Built with the design-taste-frontend skill; the plan is .taste-skill/plan.md.
// type: software (site-kind software)
// deal: hero triptych, nav nav-mega, close close-word, footer footer-statement, rhythm space, buttons tonal, mark ring,
//       lit ground sky, radius sharp, palette soot-pale-lime, type instrument (Instrument Sans + DM Mono)
// moments: pinned-chapters in #how
import type { Metadata, Viewport } from "next";
import { PIECES, SITE } from "@/pieces";

const TITLE = "fork this frontend: free front-end pieces for websites";
const DESCRIPTION =
  "A hover-flower garden, a haptic slider, a grain-photo footer, a gait dashboard, a dithered-wallpaper maker, a photo-melting card maker, a 3D shoal of pixel sharks, a footer with a glass bubble over its wordmark, a live sky drawn in tiny characters and a frosted-glass footer with your word cut into it, rebuilt in code from designs posted on X. Free with a publik account, MIT licensed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE },
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
  openGraph: { title: TITLE, description: `${PIECES.length} interactive pieces, free to use with a publik account and free to copy under MIT.`, url: SITE, type: "website", siteName: "fork this frontend", images: [{ url: "/og.png", width: 1200, height: 630, alt: "fork this frontend" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: `${PIECES.length} interactive pieces, free to use with a publik account and free to copy under MIT.`, images: ["/og.png"] },
  other: { "page-type": "software", "site-kind": "software" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f0f0f" };

const KIT_CSS = ["system.css", "ui/cards.css", "motion/motion.css", "layout/layout.css"];
const PALETTE = `:root {
  --p-bg: #0f0f0f; --p-surface: #1a1a1a; --p-ink: #ffffff; --p-muted: #8f8f8f;
  --p-accent: #dafa9c; --p-accent-ink: #0f0f0f; --p-action: #dafa9c; --p-action-ink: #0f0f0f;
  --p-inv-bg: #ffffff; --p-inv-surface: #ececec; --p-inv-ink: #0f0f0f; --p-inv-muted: #5f5f5f;
  --p-inv-accent: #0f0f0f; --p-inv-accent-ink: #ffffff; --p-inv-action: #0f0f0f; --p-inv-action-ink: #ffffff;
  --font-display: "Instrument Sans", system-ui, sans-serif;
  --font-text: "Instrument Sans", system-ui, sans-serif;
  --font-mono: "DM Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --display-weight: 500;
  --display-tracking: -0.028em;
  --display-tracking-xl: -0.036em;
  --display-stretch: 96%;
  --ly-scale: 1.04;
}`;

export default function IndexLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-type="software" data-radius="sharp" data-ground="sky" data-buttons="tonal" data-motion="" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=DM+Mono:wght@400;500&display=swap" />
        {KIT_CSS.map((f) => <link key={f} rel="stylesheet" href={`/assets/${f}`} />)}
        <style dangerouslySetInnerHTML={{ __html: PALETTE }} />
        <link rel="stylesheet" href="/site/index.css" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('m-enter','mo-js');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700);setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500)" }} />
        <link rel="modulepreload" href="/assets/moments/moments.js" />
        <link rel="modulepreload" href="/assets/moments/lib.js" />
        <link rel="modulepreload" href="/assets/moments/pinned-chapters/moment.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
