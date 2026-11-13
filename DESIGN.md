# fork this frontend: design

- **Two looks on purpose.** The index at `/` is the site's own (below). Every piece keeps its own look from its repo
  (seedbed's paper and greens, detent's white sheet and orange, grainfoot's warm neutrals, Midstance's halftone blues),
  each in its own root layout so nothing leaks between them. The gate in front of a piece is drawn in that piece's colours
  and type through its `--publik-*` variables.
- **Index (taste skill, plan in `.taste-skill/plan.md`):** kind software; hero triptych (headline, a collage of each
  piece's real screens that changes set every 2.8 s, one big button); nav-mega; close-word; footer-statement on the sky
  lit ground; rhythm space; tonal buttons; ring mark; radius sharp.
- **Type:** Instrument Sans (display 500, tight tracking) + DM Mono for paths and code.
- **Colour:** near-black ground `#0f0f0f`, white ink, ONE accent, pale lime `#dafa9c`, for the main button, the focus
  ring and the active state only. The pieces bring the rest of the colour.
- **The hero moment:** the collage cycling through the four pieces' real screens with each piece's name and path.
- **Motion:** the hero's entrance, the collage's set change, piece cards that play their real preview loop while the
  pointer rests on them, and one dealt moment: pinned chapters in "Free with one publik sign-in" (open a piece, sign in
  once, pick what runs the AI). Hover and press on every link and button. Reduced motion: everything rests.
- **Every state designed (the gate):** loading (a spinner in the button's place), signed out (preview + "Free. Sign in
  with publik to use it."), waiting for sign-in (a spinner and a line), the plan step (publik's own words), publik
  unreachable (Retry), signed in (the tool itself).
- **Reel shots:** 1) the index collage cycling; 2) a piece's gate, one click, the tool opens; 3) crossing to another
  piece already signed in.
