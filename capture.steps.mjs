// Drives the real site for tools/capture.mjs (README media): the index, a piece's gate, one sign-in (against the publik
// mock: run the built app with PUBLIK_ORIGIN=http://localhost:3124 PUBLIK_APP_TOKEN=pat_localtest), then each piece.
//   node tools/capture.mjs http://localhost:3131 --steps apps/frontend/capture.steps.mjs --out apps/frontend/docs/media --video
// Fresh browser each run, so it starts signed out with empty pieces.
export default async function ({ page, go, click, type, wait, shot }) {
  const move = async (sel, path) => {
    const b = await page.locator(sel).first().boundingBox();
    for (const [fx, fy] of path) { await page.mouse.move(b.x + b.width * fx, b.y + b.height * fy, { steps: 6 }); await page.waitForTimeout(16); }
  };

  // the index: the collage of the four pieces, then the cards
  await go("/");
  await wait(1200);
  await shot("cover", { cover: true });
  await shot("screen-1");
  await page.evaluate(() => document.querySelector("#pieces")?.scrollIntoView());
  await wait(900);
  await shot("screen-2");

  // a piece, signed out: its preview and Sign in with publik
  await go("/flowers");
  await wait(1200);
  await shot("screen-3");
  await click("button.fg-primary");
  await wait(2500);
  const claim = await page.locator('a.fg-btn[href*="/claim"]').first().getAttribute("href").catch(() => null);
  if (claim) await page.request.get(claim); // the mock's sign-in page
  for (const p of page.context().pages()) if (p !== page) await p.close();
  await page.locator("text=Choose how to pay for AI").waitFor({ timeout: 20000 });
  await wait(600);
  await click("button.fg-secondary"); // Use my own key: the tools open; the AI pill offers the kit's picker
  await page.locator(".onboard-card").waitFor({ timeout: 20000 });

  // flowers: plant a garden, move across the dots
  await type('.onboard-card input[placeholder="My portfolio"]', "Hazel Pottery");
  await click(".onboard-card button[type=submit]");
  await wait(700);
  await move(".bed", Array.from({ length: 34 }, (_, i) => [0.08 + i * 0.026, 0.5 + 0.22 * Math.sin(i / 4)]));
  await wait(400);
  await shot("screen-4");

  // slider: one sign-in already covers it; drag the cap through the numbers
  await go("/slider");
  await page.locator(".onb .btn.primary").waitFor({ timeout: 20000 });
  await click(".onb .btn.primary");
  await wait(700);
  const cap = await page.locator(".dt-cap").first().boundingBox();
  await page.mouse.move(cap.x + cap.width / 2, cap.y + cap.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 40; i++) { await page.mouse.move(cap.x + cap.width / 2 - i * 7, cap.y + cap.height / 2, { steps: 2 }); await page.waitForTimeout(20); }
  await page.mouse.up();
  await wait(600);
  await shot("screen-5");

  // footer: the sample photo, then heavier grain
  await go("/footer");
  await page.locator(".onb-card input.input").first().waitFor({ timeout: 20000 });
  await type(".onb-card input.input", "Hollis Ceramics");
  await click(".onb-card form button.btn-primary");
  await click(".onb-card button.linkish");
  await wait(900);
  await click('.guide button.linkish:has-text("Try heavy grain")');
  await wait(900);
  await shot("screen-6");

  // gait: start from a preset; the map and the runner move on their own
  await go("/gait");
  await wait(1200);
  if (await page.locator(".ob-preset").count()) await click(".ob-preset >> nth=1");
  await wait(2500);
  await shot("screen-7");
}
