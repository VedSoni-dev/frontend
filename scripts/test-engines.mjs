// The pieces' own engine tests, kept from their clones: seedbed (flowers) and detent (slider). No browser, no network.
import { execFileSync } from "node:child_process";
for (const t of ["pieces/flowers/test-engine.mjs", "pieces/slider/test-engine.mjs"]) {
  execFileSync(process.execPath, ["--no-warnings", t], { stdio: "inherit" });
}
