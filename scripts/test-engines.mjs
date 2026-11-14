// The pieces' own engine tests, kept from their clones: seedbed (flowers), detent (slider) backdrop (dither) and tincture (effects). No browser, no network.
import { execFileSync } from "node:child_process";
for (const t of ["pieces/flowers/test-engine.mjs", "pieces/slider/test-engine.mjs", "pieces/dither/test-engine.mjs", "pieces/effects/test-looks.mjs", "pieces/bubble/test-engine.mjs", "pieces/sky/test-engine.mjs"]) {
  execFileSync(process.execPath, ["--no-warnings", t], { stdio: "inherit" });
}
