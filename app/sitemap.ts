import type { MetadataRoute } from "next";
import { PIECES, SITE } from "@/pieces";

// The index and every piece, from pieces/index.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    ...PIECES.map((p) => ({ url: `${SITE}/${p.path}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
