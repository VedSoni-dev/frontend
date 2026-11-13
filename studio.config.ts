// One file says what this build is and which AI modes it offers. The kit reads it everywhere.
import type { StudioConfig } from "@/kit/ai/types";

const config: StudioConfig = {
  app: {
    name: "fork this frontend",
    slug: "frontend",
    version: "0.1.0",
    tagline: "Free, open-source front-end pieces you can use here and copy into your own site",
    repo: "https://github.com/VedSoni-dev/frontend",
    url: "https://frontend.vedantsoni.com",
    
  },
  // Pick the modes that make sense for this build (docs/auth.md). Order = order in the picker. The hosted picker hides ChatGPT plan (local runs only).
  modes: ["publik","claude","openai"],
  defaultMode: "publik",
};

export default config;
