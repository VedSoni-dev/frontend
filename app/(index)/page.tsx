// The public index: every piece on this site, what it does, who designed the original, where its code is, and how it
// stays free. No sign-in here. The pieces come from pieces/index.ts (the one list); adding a piece adds its card, its
// row in the credits, its footer link and its sitemap entry. The collage and the "how" pictures are real captures.
import { PIECES, REPO, type Piece } from "@/pieces";
import { KitScripts } from "@/components/KitScripts";

const ARROW = (
  <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true"><path className="m-arrow__stem" d="M1 6h8" /><path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" /></svg>
);
const CHEV = (
  <svg className="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const MAIN_ACTION = "See the pieces";
const short = (url: string) => url.replace("https://github.com/", "github.com/");

// The hero collage: one set per piece, its real screens (cropped from the clone's docs/media) and its name tag.
const SETS: Record<string, { a: string; b: string; alt: string; aStyle: React.CSSProperties; bStyle: React.CSSProperties; tag: React.CSSProperties }> = {
  flowers: {
    a: "/site/flowers-a.jpg", b: "/site/flowers-b.jpg", alt: "seedbed: a sample garden in bloom by day, and the same garden at night",
    aStyle: { left: "4%", top: "4%", width: "68%", height: "46%" }, bStyle: { left: "30%", top: "50%", width: "66%", height: "46%" }, tag: { left: "4%", top: "56%", width: "34%" },
  },
  slider: {
    a: "/site/slider-a.jpg", b: "/site/slider-b.jpg", alt: "detent: a sample slider being dragged, and its settings",
    aStyle: { left: "4%", top: "6%", width: "70%", height: "30%" }, bStyle: { left: "26%", top: "42%", width: "70%", height: "54%" }, tag: { left: "4%", top: "44%", width: "30%" },
  },
  footer: {
    a: "/site/footer-a.jpg", b: "/site/footer-b.jpg", alt: "grainfoot: a sample footer with a grain photo band, and the band plain beside grainy",
    aStyle: { left: "4%", top: "4%", width: "62%", height: "54%" }, bStyle: { left: "34%", top: "60%", width: "62%", height: "36%" }, tag: { left: "70%", top: "8%", width: "26%" },
  },
  gait: {
    a: "/site/gait-a.jpg", b: "/site/gait-b.jpg", alt: "Midstance: the motion-capture runner and the halftone load map for a sample session",
    aStyle: { left: "4%", top: "4%", width: "44%", height: "64%" }, bStyle: { left: "52%", top: "30%", width: "44%", height: "66%" }, tag: { left: "52%", top: "6%", width: "34%" },
  },
  dither: {
    a: "/site/dither-a.jpg", b: "/site/dither-b.jpg", alt: "backdrop: a sample picture dithered in orange behind a placeholder app screen, and the same picture before and after",
    aStyle: { left: "4%", top: "4%", width: "64%", height: "48%" }, bStyle: { left: "32%", top: "54%", width: "64%", height: "42%" }, tag: { left: "70%", top: "8%", width: "26%" },
  },
};

function CollageSet({ p, on }: { p: Piece; on: boolean }) {
  const s = SETS[p.path];
  if (!s) return null;
  return (
    <div className={`ly-collage__set${on ? " is-on" : ""}`} aria-hidden={on ? undefined : true}>
      <div className="ly-piece" style={s.aStyle}><img src={s.a} alt="" /></div>
      <div className="ly-piece" style={s.bStyle}><img src={s.b} alt="" /></div>
      <div className="ly-piece pc-tag" style={s.tag}>
        <img src={`/${p.path}/icon.svg`} alt="" width={28} height={28} />
        <span><b>{p.name}</b><code>/{p.path}</code></span>
      </div>
    </div>
  );
}

function PieceTile({ p, wide }: { p: Piece; wide?: boolean }) {
  return (
    <article className={`tile ${wide ? "span-12 piece--wide" : "span-6"} piece m-zoom`} data-hover-play="">
      <a className="tile__media" href={`/${p.path}`} aria-label={p.title} tabIndex={-1}>
        <video src={p.media.video} poster={p.media.poster} muted loop playsInline preload="none" aria-hidden="true" />
      </a>
      <div className="tile__head">
        <h3><a href={`/${p.path}`}>{p.title}</a></h3>
        <span className="tile__price">/{p.path}</span>
      </div>
      <p className="piece__line">{p.line}</p>
      <p className="piece__meta">
        <span>{p.name}, after <a href={p.credit.url} target="_blank" rel="noopener noreferrer">{p.credit.name}</a></span>
        <a href={p.repo} target="_blank" rel="noopener noreferrer">{short(p.repo)}</a>
      </p>
    </article>
  );
}

export default function Index() {
  // two tiles a row, one row a screen; an odd last piece takes the whole row (media left, words right)
  const rows: Piece[][] = [];
  for (let i = 0; i < PIECES.length; i += 2) rows.push(PIECES.slice(i, i + 2));
  const [first, ...rest] = rows;
  const embeds = PIECES.filter((p) => p.embed);
  return (
    <>
      <header className="nav">
        <div className="wrap nav__bar">
          <a className="skip-link" href="#top">Skip to content</a>
          <a className="nav__logo" href="#top"><span className="mark" data-mark="ring" aria-hidden="true" />fork this frontend</a>
          <nav className="nav__links" aria-label="Main">
            <div className="nav__item">
              <a className="nav__link" href="#pieces">Pieces {CHEV}</a>
              <div className="nav__menu">
                <div className="wrap grid">
                  <div className="menu-col span-3">
                    <p className="t-label">For your own site</p>
                    {PIECES.filter((p) => p.embed).map((p) => <a key={p.path} href={`/${p.path}`}>{p.what}<span>/{p.path}</span></a>)}
                  </div>
                  <div className="menu-col span-3">
                    <p className="t-label">In the browser</p>
                    {PIECES.filter((p) => !p.embed).map((p) => <a key={p.path} href={`/${p.path}`}>{p.what}<span>/{p.path}</span></a>)}
                  </div>
                  <a className="menu-card span-3 start-10" href="#how">
                    <div className="panel"><img className="frame__img" src="/site/how-1.jpg" alt="The sign-in screen in front of the flower hover effect" /></div>
                    <span className="t-card">One sign-in, every piece</span>
                    <span className="t-small muted">Free with a publik account</span>
                  </a>
                </div>
              </div>
            </div>
            <div className="nav__item"><a className="nav__link" href="#how">Sign-in</a></div>
            <div className="nav__item"><a className="nav__link" href="#embed">Embed</a></div>
            <div className="nav__item"><a className="nav__link" href="#credits">Credits</a></div>
          </nav>
          <div className="nav__actions">
            <a className="btn btn--primary" href="#pieces">{MAIN_ACTION}</a>
          </div>
          <button className="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero hero--triptych" data-enter="" aria-labelledby="hero-h">
          <div className="wrap"><div className="hero-text grid hero__grid">
            <div className="span-3">
              <h1 id="hero-h"><span className="nowrap">Front-end</span> pieces for websites</h1>
              <p className="hero__lead">{PIECES.length} pieces rebuilt from designs posted on X. Free to use with a publik account, free to copy under MIT.</p>
            </div>
            <div className="ly-collage span-6 start-4" role="img" aria-label={PIECES.map((p) => SETS[p.path]?.alt).filter(Boolean).join(". ")}>
              {PIECES.map((p, i) => <CollageSet key={p.path} p={p} on={i === 0} />)}
            </div>
            <div className="span-3 start-10 hero__cta"><a className="btn btn--primary" href="#pieces">{MAIN_ACTION}{ARROW}</a></div>
          </div></div>
        </section>

        <section className="section g2" id="pieces" style={{ ["--h" as string]: rows.length }} aria-labelledby="pieces-h">
          <div className="wrap">
            <div className="group">
              <div className="section-head">
                <h2 id="pieces-h">The pieces. <span className="muted">Each runs at its own address and copies into your site.</span></h2>
              </div>
              <div className="grid">{first.map((p) => <PieceTile key={p.path} p={p} wide={first.length === 1} />)}</div>
            </div>
            {rest.map((row) => (
              <div className="group" key={row[0].path}>
                <div className="grid">{row.map((p) => <PieceTile key={p.path} p={p} wide={row.length === 1} />)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="how" style={{ ["--h" as string]: 2 }} data-moment="pinned-chapters" aria-labelledby="how-h">
          <div className="wrap mo-pc__grid">
            <div className="mo-pc__text">
              <h2 id="how-h">Free with one publik sign-in</h2>
              <ol className="mo-pc__steps">
                <li className="mo-pc__step">
                  <h3>Open a piece</h3>
                  <p>Each piece shows its preview and one button, Sign in with publik. There is nothing to buy and no card to add.</p>
                  <figure className="mo-pc__visual"><img src="/site/how-1.jpg" alt="The sign-in screen in front of the flower hover effect" width={1200} height={900} loading="lazy" /></figure>
                </li>
                <li className="mo-pc__step">
                  <h3>Sign in once for every piece</h3>
                  <p>publik is a free software marketplace. One sign-in opens all {PIECES.length} pieces and credits their builder for your use.</p>
                  <figure className="mo-pc__visual"><img src="/site/how-2.jpg" alt="The flower hover effect open after sign-in, a garden in bloom" width={1200} height={900} loading="lazy" /></figure>
                </li>
                <li className="mo-pc__step">
                  <h3>Pick what runs the AI</h3>
                  <p>{PIECES.filter((p) => p.usesAi).length} pieces have one AI feature each. It runs on your publik plan or on your own Claude or OpenAI key.</p>
                  <figure className="mo-pc__visual"><img src="/site/how-3.jpg" alt="The choice of publik plan, Claude key or OpenAI key, open over the slider" width={1200} height={900} loading="lazy" /></figure>
                </li>
              </ol>
            </div>
            <div className="mo-pc__visuals frame" />
          </div>
        </section>

        <section className="section" id="embed" aria-labelledby="embed-h">
          <div className="wrap">
            <div className="section-head">
              <h2 id="embed-h">Embed a piece in your site. <span className="muted">{embeds.length} of them are one file each.</span></h2>
            </div>
            <div className="grid fill embed">
              <div className="span-6 embed__text">
                <ul className="rows">
                  {embeds.map((p) => (
                    <li key={p.path}>
                      <span className="rows__name">{p.what}</span>
                      <a className="rows__value" href={p.embed!.href}>{p.embed!.label}</a>
                    </li>
                  ))}
                </ul>
                <pre className="embed__code" aria-label="The garden and the slider on any page"><code>{`<script type="module"
  src="https://frontend.vedantsoni.com/flowers/seedbed.js"></script>
<seedbed-garden preset="meadow"></seedbed-garden>

<script defer
  src="https://frontend.vedantsoni.com/slider/detent.js"></script>
<div data-detent data-label="How was it?"
  data-min="0" data-max="10" data-value="7"></div>`}</code></pre>
              </div>
              <div className="span-6 start-7 embed__live" data-visual="">
                <seedbed-garden preset="meadow" radius="150" className="embed__garden" role="img" aria-label="A seedbed garden: move across the dots and flowers grow" />
                <div className="embed__slider">
                  <div data-detent="" data-label="How was it?" data-min="0" data-max="10" data-step="0.1" data-value="7" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="credits" aria-labelledby="credits-h">
          <div className="wrap">
            <div className="section-head">
              <h2 id="credits-h">Designers and source code. <span className="muted">Every piece names the post it was rebuilt from.</span></h2>
            </div>
            <div className="grid">
              <div className="span-6 stack-5 credits__text">
                <p>fork this (@forkthis_ai) is an AI that runs its own X account. When someone posts a design, it rebuilds it from scratch as free, open-source code and puts the front-end ones here.</p>
                <p>The code, the drawings and the copy are new. No original code, logo or brand is used, and each repo says so.</p>
              </div>
              <ul className="rows span-6 start-7 credits__rows">
                {PIECES.map((p) => (
                  <li key={p.path}>
                    <span className="rows__name"><img src={`/${p.path}/icon.svg`} alt="" width={32} height={32} /><span>{p.what}<small>After <a href={p.credit.url} target="_blank" rel="noopener noreferrer">{p.credit.name}</a> · MIT</small></span></span>
                    <a className="rows__value" href={p.repo} target="_blank" rel="noopener noreferrer">{p.name}</a>
                  </li>
                ))}
              </ul>
              <div className="span-6 btn-row credits__actions">
                <a className="btn btn--secondary" href="https://x.com/forkthis_ai" target="_blank" rel="noopener noreferrer">Follow fork this on X</a>
                <a className="btn btn--secondary" href={REPO} target="_blank" rel="noopener noreferrer">Read the site&apos;s code</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer closing footer--statement" id="close" aria-labelledby="close-h">
        <div className="wrap">
          <div className="closing__cta close--word">
            <div className="section-head--split">
              <div><h2 id="close-h">Pick a piece and sign in</h2><p className="t-lead">Free with a publik account. MIT licensed.</p></div>
              <a className="btn btn--primary" href="#pieces">{MAIN_ACTION}{ARROW}</a>
            </div>
            <p className="close__word" aria-hidden="true">fork this frontend</p>
          </div>
          <div className="closing__links">
            <div className="grid">
              <div className="span-4 stack-4">
                <a className="nav__logo" href="#top"><span className="mark" data-mark="ring" aria-hidden="true" />fork this frontend</a>
                <p className="footer__lede">Front-end pieces, rebuilt in code.</p>
              </div>
              <div className="span-2 footer__col"><h3>Pieces</h3><ul>{PIECES.map((p) => <li key={p.path}><a href={`/${p.path}`}>/{p.path}</a></li>)}</ul></div>
              <div className="span-2 footer__col"><h3>Sign-in</h3><ul><li><a href="#how">How it works</a></li><li><a href="https://publikhq.com" target="_blank" rel="noopener noreferrer">publik</a></li></ul></div>
              <div className="span-2 footer__col"><h3>Embed</h3><ul>{embeds.map((p) => <li key={p.path}><a href={p.embed!.href}>{p.embed!.label}</a></li>)}</ul></div>
              <div className="span-2 footer__col"><h3>Credits</h3><ul><li><a href="#credits">Designers</a></li><li><a href={REPO} target="_blank" rel="noopener noreferrer">Read the site&apos;s code</a></li><li><a href="https://x.com/forkthis_ai" target="_blank" rel="noopener noreferrer">Follow fork this on X</a></li></ul></div>
            </div>
            <div className="footer__legal">
              <span>&copy; 2026 fork this frontend · MIT licence</span>
              <div className="socials" />
            </div>
          </div>
        </div>
      </footer>
      <nav className="actionbar" aria-label="Quick actions">
        <a className="btn btn--primary" href="#pieces">{MAIN_ACTION}</a>
      </nav>
      <KitScripts />
    </>
  );
}
