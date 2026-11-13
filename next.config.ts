import type { NextConfig } from "next";

// Files people embed in their own sites (scripts/copy-sources.mjs): public, never gated, loadable from any origin
// (a cross-origin <script type="module"> needs CORS).
const EMBEDS = ["/flowers/seedbed.js", "/slider/detent.js", "/footer/GrainFooter.tsx"];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  turbopack: { root: process.cwd() },
  // Several root layouts (one per piece, so their CSS never meets): one 404 page for every unmatched URL.
  experimental: { globalNotFound: true },
  // publik's public app token is read at run time from the repo root; ship it with the server routes.
  outputFileTracingIncludes: { "/api/**": ["./publik-app-token.txt", "./kit/publik-app-token.txt"] },
  async headers() {
    return EMBEDS.map((source) => ({
      source,
      headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
        ...(source.endsWith(".tsx") ? [{ key: "Content-Type", value: "text/plain; charset=utf-8" }] : []),
      ],
    }));
  },
};

export default nextConfig;
