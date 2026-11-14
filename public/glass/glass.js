// Plain DOM, no React: the HTML/CSS version runs this same function. root = the .vl element.
function mountGlass(root) {
    const word = root.querySelector(".vl-word");
    const panel = root.querySelector(".vl-panel");
    const mark = root.querySelector(".vl-mark");
    let nat = { w: 1600, h: 1000 };
    let alive = true;
    // Fit the word to the panel width, then give each letter the photo in card coordinates.
    function layout() {
        if (!alive)
            return;
        const W = root.clientWidth, H = root.clientHeight;
        word.style.setProperty("--fs", "100px");
        // Width: the panel minus the margins and room for the mark. Height: the word must stay under the links.
        const narrow = W < 640; // on a phone the mark sits above the word, so the word gets the full width
        const avail = panel.clientWidth - 2 * word.offsetLeft - (narrow ? 0 : mark.offsetWidth + 12);
        const nav = root.querySelector(".vl-nav");
        const navBottom = nav ? nav.offsetTop + nav.offsetHeight : 0; // .vl-nav is positioned, so this is in panel coordinates
        const tall = panel.clientHeight - (word.offsetTop + 10); // the word's visible height at 100px, above the panel's bottom edge
        const roomH = panel.clientHeight - navBottom - 14 - (narrow ? mark.offsetHeight + 8 : 0);
        const fs = Math.max(40, Math.min((100 * avail) / Math.max(1, word.scrollWidth), (100 * roomH) / Math.max(1, tall)));
        word.style.setProperty("--fs", fs.toFixed(1) + "px");
        const s = Math.max(W / nat.w, H / nat.h), bw = nat.w * s, bh = nat.h * s, ox = (W - bw) / 2, oy = (H - bh) / 2;
        // offsetLeft/Top ignore transforms, so this is the letter's resting place.
        const px = panel.offsetLeft + panel.clientLeft, py = panel.offsetTop + panel.clientTop;
        const shift = fs * 0.1; // the word's translateY(.1em)
        word.querySelectorAll(".vl-l").forEach((l) => {
            const x = px + word.offsetLeft + l.offsetLeft, y = py + word.offsetTop + l.offsetTop + shift;
            l.style.setProperty("--bw", bw + "px");
            l.style.setProperty("--bh", bh + "px");
            l.style.setProperty("--bx", (ox - x).toFixed(1) + "px");
            l.style.setProperty("--by", (oy - y).toFixed(1) + "px");
        });
        const top = word.offsetTop + shift;
        mark.style.setProperty("--mt", Math.max(0, narrow ? top - mark.offsetHeight - 8 : top - mark.offsetHeight * 0.1) + "px");
    }
    function readPhoto() {
        const m = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(root).getPropertyValue("--photo"));
        if (!m)
            return layout();
        const img = new Image();
        img.onload = () => { nat = { w: img.naturalWidth || 1600, h: img.naturalHeight || 1000 }; layout(); };
        img.onerror = () => layout();
        img.src = m[1];
    }
    // Entrance: arm it (hidden start state), then play when 35% of the card is on screen; replay when it comes back.
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function play() {
        root.setAttribute("data-reset", "");
        root.removeAttribute("data-in");
        void root.offsetWidth;
        root.removeAttribute("data-reset");
        requestAnimationFrame(() => requestAnimationFrame(() => root.setAttribute("data-in", "")));
    }
    let io = null;
    let seen = false;
    if (!still && "IntersectionObserver" in window) {
        root.setAttribute("data-armed", "");
        io = new IntersectionObserver((es) => {
            seen = true;
            for (const e of es) {
                if (e.intersectionRatio >= 0.35 && !root.hasAttribute("data-in"))
                    root.setAttribute("data-in", "");
                else if (!e.isIntersecting)
                    root.removeAttribute("data-in");
            }
        }, { threshold: [0, 0.35] });
        io.observe(root);
    }
    const failsafe = setTimeout(() => { if (!seen)
        root.setAttribute("data-in", ""); }, 3000);
    const ro = new ResizeObserver(() => layout());
    ro.observe(root);
    if (document.fonts)
        document.fonts.ready.then(() => layout());
    readPhoto();
    return {
        play,
        refresh() { readPhoto(); },
        dispose() { alive = false; clearTimeout(failsafe); ro.disconnect(); if (io)
            io.disconnect(); root.removeAttribute("data-armed"); },
    };
}
