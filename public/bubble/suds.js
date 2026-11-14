/*! suds · a glass bubble over your footer's wordmark · MIT · https://frontend.vedantsoni.com/bubble */
(function () {
"use strict";
// Suds.tsx: a site footer whose giant wordmark sits under a glass bubble. The bubble follows the cursor on a spring,
// swells as it reaches the word, magnifies and bends the letters under it with rainbow fringes, and pinches off
// droplets when you move fast. Raw WebGL1, no dependencies beyond React. MIT. https://frontend.vedantsoni.com/bubble
//
//   <Suds word="Brightwater" columns={[{ title: "Product", links: [{ label: "Overview", href: "/" }] }]} />
//
// Props: word, columns, size (0.5-1.6), refraction (0-1), wobble (0-1), hue (0-1), theme ("dark" | "light"), note.
// Falls back to a CSS bubble without WebGL, parks a still bubble on one letter with reduced motion, follows a finger
// on touch, and sleeps when the footer is off-screen or the tab is hidden. Without React: createSuds(footerEl, opts).
const L = (label, href = "#") => ({ label, href });
const SUDS_DEFAULTS = {
    word: "Brightwater",
    columns: [
        { title: "Product", links: [L("Overview"), L("Features"), L("Pricing"), L("Changelog"), L("Roadmap")] },
        { title: "Resources", links: [L("Docs"), L("Guides"), L("Examples"), L("Status")] },
        { title: "Company", links: [L("About"), L("Journal"), L("Careers"), L("Contact")] },
        { title: "Legal", links: [L("Privacy"), L("Terms"), L("Licences")] },
    ],
    size: 1,
    refraction: 0.7,
    wobble: 0.5,
    hue: 0.1,
    theme: "dark",
    note: "Made with care",
};
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeHref = (h) => (/^\s*(javascript|data|vbscript):/i.test(h) ? "#" : h);
/** The footer's inner markup: the wordmark band (solid word between outlined ghosts) and the link columns. */
function sudsMarkup(o) {
    const w = esc((o.word || "").trim() || SUDS_DEFAULTS.word);
    const cols = o.columns
        .filter((c) => c.title || c.links.length)
        .map((c) => `<div class="suds-col"><h3>${esc(c.title)}</h3><ul>${c.links.map((l) => `<li><a href="${esc(safeHref(l.href))}">${esc(l.label)}</a></li>`).join("")}</ul></div>`)
        .join("");
    return `<div class="suds-band"><span class="suds-ghost suds-up" aria-hidden="true">${w}</span><h2 class="suds-word">${w}</h2><span class="suds-ghost suds-down" aria-hidden="true">${w}</span></div><nav class="suds-cols" aria-label="Footer">${cols}</nav><div class="suds-base"><span>&copy; ${w}</span><span>${esc(o.note || "")}</span></div>`;
}
const SUDS_CSS = `
.suds{--suds-bg:#0a0b0d;--suds-ink:#e6eaee;--suds-ghost:rgba(230,234,238,.11);--suds-muted:#8d939a;--suds-head:#5b6168;position:relative;display:block;background:var(--suds-bg);color:var(--suds-ink);padding:clamp(20px,3vw,48px) clamp(16px,2.5vw,36px) 24px;overflow:hidden;font-family:inherit}
.suds[data-theme=light]{--suds-bg:#f1f0ed;--suds-ink:#111316;--suds-ghost:rgba(17,19,22,.13);--suds-muted:#53585e;--suds-head:#8b9096}
.suds-band{position:relative;height:calc(var(--suds-fs,15vw)*2.15);overflow:hidden;touch-action:pan-y}
.suds-word,.suds-ghost{position:absolute;left:0;right:0;top:50%;margin:0;text-align:center;font-size:var(--suds-fs,15vw);font-weight:500;letter-spacing:-.045em;line-height:1;white-space:nowrap;transform:translateY(-50%);color:var(--suds-ink)}
.suds-up{transform:translateY(calc(-50% - 1.05em))}.suds-down{transform:translateY(calc(-50% + 1.05em))}
.suds-ghost{color:transparent;-webkit-text-stroke:1px var(--suds-ghost)}
.suds[data-live] .suds-word,.suds[data-live] .suds-ghost{opacity:0}
.suds-lens{position:absolute;pointer-events:none}.suds-lens canvas{display:block;width:100%;height:100%}
.suds-cols{position:relative;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:28px 24px;margin-top:clamp(4px,1.5vw,20px)}
.suds-col h3{margin:0 0 10px;font:500 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--suds-head)}
.suds-col ul{list-style:none;margin:0;padding:0}
.suds-col a{display:inline-flex;align-items:center;min-height:30px;color:var(--suds-muted);text-decoration:none;font-size:13px;transition:color .15s}
.suds-col a:hover,.suds-col a:focus-visible{color:var(--suds-ink)}
.suds-base{display:flex;justify-content:space-between;gap:16px;margin-top:36px;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--suds-head)}
.suds-css{position:absolute;left:0;top:0;border-radius:50%;pointer-events:none;-webkit-backdrop-filter:blur(1.5px) saturate(1.8) brightness(.8);backdrop-filter:blur(1.5px) saturate(1.8) brightness(.8);background:radial-gradient(circle at 34% 28%,rgba(255,255,255,.75),rgba(255,255,255,0) 14%),radial-gradient(circle,rgba(0,0,0,0) 60%,rgba(90,220,200,.35) 72%,rgba(240,110,230,.45) 84%,rgba(255,220,110,.4) 94%,rgba(0,0,0,0) 100%)}
@media (max-width:640px){.suds-cols{grid-template-columns:1fr 1fr}.suds-col a{min-height:44px}}
@media (prefers-reduced-motion:reduce){.suds-col a{transition:none}}
`;
function injectSudsCss(doc = document) {
    if (doc.getElementById("suds-css"))
        return;
    const s = doc.createElement("style");
    s.id = "suds-css";
    s.textContent = SUDS_CSS;
    doc.head.appendChild(s);
}
const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const FRAG = `precision highp float;
uniform sampler2D uTex;uniform vec2 uRes;uniform float uDpr;uniform vec3 uB[4];
uniform float uT,uRefr,uWob,uHue,uLight;
vec3 tx(vec2 q){return texture2D(uTex,clamp(q/uRes,vec2(.001),vec2(.999))).rgb;}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
  vec3 base=tx(p);
  float f=0.;vec2 g=vec2(0.);vec2 cw=vec2(0.);float ww=0.;float rr=0.;
  for(int i=0;i<4;i++){
    vec3 b=uB[i];if(b.z<.5)continue;
    vec2 d=p-b.xy;float a=atan(d.y,d.x);float fi=float(i);
    float r=b.z*(1.+uWob*(.06*sin(3.*a+uT*2.1+fi*1.7)+.035*sin(5.*a-uT*1.4+fi)));
    float dd=dot(d,d)+1.;float k=r*r/dd;
    f+=k;g+=-2.*k*d/dd;float w=k*k*b.z;cw+=b.xy*w;ww+=w;rr+=b.z*w;
  }
  float gl=max(length(g),1e-4);float s=(f-1.)/gl;
  if(s<-1.5||ww<1e-6){gl_FragColor=vec4(base,1.);return;}
  vec2 c=cw/ww;float R=rr/ww;
  float al=clamp(s+.5,0.,1.);
  float e=clamp(1.-1.9*(1.-inversesqrt(max(f,1.))),0.,1.);
  vec2 n=-g/gl;
  float mag=1.+.95*uRefr;
  vec2 q=c+(p-c)/mag+n*e*e*e*uRefr*R*.45;
  vec2 off=n*(1.+e*e*uRefr*5.);
  vec3 col=vec3(tx(q+off).r,tx(q).g,tx(q-off).b);
  col=mix(col*.8,col*.93,uLight);
  col*=1.-.28*smoothstep(.45,.95,e)*(1.-uLight*.5);
  float ang=atan(n.y,n.x);
  vec3 iri=.5+.5*cos(6.2831*(uHue+vec3(0.,.33,.67)+e*.85+ang*.11+uT*.025));
  float F=pow(e,4.);
  col=mix(col,iri,F*.62)+iri*F*.16;
  vec3 N=normalize(vec3(n*e,sqrt(max(1.-e*e,0.))+.05));
  vec3 Lt=normalize(vec3(-.55,-.62,.56));
  float sp=max(dot(reflect(-Lt,N),vec3(0.,0.,1.)),0.);
  col+=vec3(1.)*(pow(sp,26.)*.55+pow(sp,220.)*1.2);
  vec3 L2=normalize(vec3(.6,.55,.58));
  col+=iri*pow(max(dot(reflect(-L2,N),vec3(0.,0.,1.)),0.),18.)*.25;
  gl_FragColor=vec4(mix(base,col,al),1.);
}`;
const body = () => ({ x: -999, y: -999, vx: 0, vy: 0, r: 0 });
function spring(b, tx, ty, k, damp, dt) {
    const c = 2 * Math.sqrt(k) * damp;
    b.vx += (k * (tx - b.x) - c * b.vx) * dt;
    b.vy += (k * (ty - b.y) - c * b.vy) * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Fit the word to the band: the font size (px) that makes it span ~96% of the width, capped for very short words. */
function fitSize(widthAt100, bandWidth, maxPx = 340) {
    if (!(widthAt100 > 0) || !(bandWidth > 0))
        return 120;
    return Math.max(24, Math.min(maxPx, (bandWidth * 0.96 * 100) / widthAt100));
}
/** Attach the lens to a footer element that holds sudsMarkup(). Returns a handle for live changes. */
function createSuds(root, opts = {}) {
    var _a, _b, _c;
    let o = { ...SUDS_DEFAULTS, ...opts };
    const win = root.ownerDocument.defaultView || window;
    const reduced = (_b = (_a = win.matchMedia) === null || _a === void 0 ? void 0 : _a.call(win, "(prefers-reduced-motion: reduce)").matches) !== null && _b !== void 0 ? _b : false;
    const lens = root.ownerDocument.createElement("div");
    lens.className = "suds-lens";
    lens.setAttribute("aria-hidden", "true");
    root.appendChild(lens);
    const canvas = root.ownerDocument.createElement("canvas");
    lens.appendChild(canvas);
    const tcan = root.ownerDocument.createElement("canvas");
    const tctx = tcan.getContext("2d");
    const mctx = root.ownerDocument.createElement("canvas").getContext("2d");
    let gl = null;
    try {
        gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "low-power" });
    }
    catch {
        gl = null;
    }
    let mode = gl ? "webgl" : "css";
    let prog = null;
    let tex = null;
    const U = {};
    let cssBall = null;
    function compile() {
        if (!gl)
            return false;
        const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
            throw new Error(gl.getShaderInfoLog(s) || "shader"); return s; };
        prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            throw new Error("link");
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const a = gl.getAttribLocation(prog, "a");
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
        for (const n of ["uTex", "uRes", "uDpr", "uB", "uT", "uRefr", "uWob", "uHue", "uLight"])
            U[n] = gl.getUniformLocation(prog, n);
        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
            gl.texParameteri(gl.TEXTURE_2D, k, v);
        return true;
    }
    try {
        if (gl)
            compile();
    }
    catch {
        gl = null;
        mode = "css";
    }
    if (mode === "css") {
        lens.remove();
        cssBall = root.ownerDocument.createElement("div");
        cssBall.className = "suds-css";
        cssBall.setAttribute("aria-hidden", "true");
        root.appendChild(cssBall);
    }
    // layout, in band (css px) coordinates
    let W = 0, H = 0, dpr = 1, fs = 120, cy = 0, x0 = 0, x1 = 0, capH = 80, bandX = 0, bandY = 0;
    function layout() {
        const band = root.querySelector(".suds-band");
        const word = root.querySelector(".suds-word");
        if (!band || !word)
            return;
        const cs = win.getComputedStyle(word);
        const family = cs.fontFamily || "system-ui, sans-serif";
        const weight = cs.fontWeight || "500";
        const text = (word.textContent || "").trim();
        W = band.clientWidth;
        mctx.font = `${weight} 100px ${family}`;
        if ("letterSpacing" in mctx)
            mctx.letterSpacing = "-4.5px";
        const want = fitSize(mctx.measureText(text).width, W);
        if (Math.abs(want - fs) > 0.5 || !root.style.getPropertyValue("--suds-fs")) {
            fs = want;
            root.style.setProperty("--suds-fs", `${fs.toFixed(1)}px`);
        }
        H = band.clientHeight;
        bandX = band.offsetLeft;
        bandY = band.offsetTop;
        dpr = Math.min(2, win.devicePixelRatio || 1);
        cy = H / 2;
        if (gl) {
            Object.assign(lens.style, { left: `${bandX}px`, top: `${bandY}px`, width: `${W}px`, height: `${H}px` });
            canvas.width = Math.max(1, Math.round(W * dpr));
            canvas.height = Math.max(1, Math.round(H * dpr));
        }
        // draw the band into the texture: background, outlined ghosts, the solid word
        tcan.width = Math.max(1, Math.round(W * dpr));
        tcan.height = Math.max(1, Math.round(H * dpr));
        const t = tctx;
        t.setTransform(dpr, 0, 0, dpr, 0, 0);
        const rs = win.getComputedStyle(root);
        t.fillStyle = rs.getPropertyValue("--suds-bg").trim() || rs.backgroundColor || "#0a0b0d";
        t.fillRect(0, 0, W, H);
        t.font = `${weight} ${fs}px ${family}`;
        if ("letterSpacing" in t)
            t.letterSpacing = `${(-0.045 * fs).toFixed(2)}px`;
        t.textAlign = "center";
        t.textBaseline = "alphabetic";
        const m = t.measureText(text);
        const asc = m.actualBoundingBoxAscent || fs * 0.72;
        const desc = m.actualBoundingBoxDescent || 0;
        capH = t.measureText("H").actualBoundingBoxAscent || fs * 0.7;
        const baseY = cy + (asc - desc) / 2;
        x0 = W / 2 - m.width / 2;
        x1 = W / 2 + m.width / 2;
        t.lineWidth = Math.max(1, fs / 140);
        t.strokeStyle = rs.getPropertyValue("--suds-ghost").trim() || "rgba(230,234,238,.11)";
        t.strokeText(text, W / 2, baseY - fs * 1.05);
        t.strokeText(text, W / 2, baseY + fs * 1.05);
        t.fillStyle = rs.getPropertyValue("--suds-ink").trim() || "#e6eaee";
        t.fillText(text, W / 2, baseY);
        if (gl && tex) {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tcan);
            root.setAttribute("data-live", "");
        }
        kick();
    }
    // motion
    const drop = body(), main = body(), tail = body(), sat = body();
    let px = 0, py = 0, inside = false, lastMove = -1e9, touched = false, dropVis = 0, sweepT = -1, raf = 0, last = 0, time = 0, visible = true, seen = false;
    const parkX = () => x0 + (x1 - x0) * 0.62;
    function place(x, y) { for (const b of [main, tail, sat]) {
        b.x = x;
        b.y = y;
        b.vx = b.vy = 0;
    } }
    function step(dt) {
        time += dt;
        const R = 0.5 * fs * o.size;
        let tx = px, ty = py;
        if (sweepT >= 0) {
            sweepT += dt;
            const u = Math.min(1, sweepT / 2.4);
            const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
            tx = x0 + (x1 - x0) * (0.08 + 0.84 * ease);
            ty = cy + Math.sin(sweepT * 3.2) * capH * 0.25;
            if (u >= 1) {
                sweepT = -1;
                px = tx;
                py = ty;
            }
        }
        else if (!inside) {
            tx = main.x < -900 ? parkX() : main.x;
            ty = cy;
        }
        if (main.x < -900)
            place(tx, cy);
        const tyClamped = Math.min(cy + capH * 0.45, Math.max(cy - capH * 0.45, ty));
        const near = smooth(fs * 0.95, fs * 0.35, Math.abs(ty - cy)) * smooth(-R * 0.6, R * 0.3, Math.min(tx - x0, x1 - tx));
        const rTarget = R * (0.3 + 0.7 * (inside || sweepT >= 0 ? near : 1));
        main.r += (rTarget - main.r) * Math.min(1, dt * 5);
        spring(main, tx, tyClamped, 70, 0.5, dt);
        spring(tail, main.x, main.y, 30, 0.55, dt);
        spring(sat, tail.x, tail.y, 14, 0.5, dt);
        const sepT = Math.hypot(tail.x - main.x, tail.y - main.y);
        const sepS = Math.hypot(sat.x - tail.x, sat.y - tail.y);
        tail.r = main.r * 0.55 * Math.min(1, sepT / (main.r * 0.35 + 1));
        sat.r = main.r * 0.22 * Math.min(1, sepS / (main.r * 0.5 + 1));
        dropVis += ((inside && sweepT < 0 ? 1 : 0) - dropVis) * Math.min(1, dt * 8);
        drop.x = sweepT >= 0 ? tx : px;
        drop.y = sweepT >= 0 ? ty : py;
        drop.r = Math.max(5, fs * 0.05) * dropVis;
    }
    function settled() {
        const v = Math.abs(main.vx) + Math.abs(main.vy) + Math.abs(tail.vx) + Math.abs(tail.vy) + Math.abs(sat.vx) + Math.abs(sat.vy);
        return v < 2 && sweepT < 0 && performance.now() - lastMove > 1800 && (!inside || o.wobble === 0);
    }
    function draw() {
        if (gl && prog) {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform1i(U.uTex, 0);
            gl.uniform2f(U.uRes, W, H);
            gl.uniform1f(U.uDpr, canvas.width / Math.max(1, W));
            gl.uniform3fv(U.uB, new Float32Array([drop.x, drop.y, drop.r, main.x, main.y, main.r, tail.x, tail.y, tail.r, sat.x, sat.y, sat.r]));
            gl.uniform1f(U.uT, time);
            gl.uniform1f(U.uRefr, o.refraction);
            gl.uniform1f(U.uWob, reduced ? 0 : o.wobble);
            gl.uniform1f(U.uHue, o.hue);
            gl.uniform1f(U.uLight, o.theme === "light" ? 1 : 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        else if (cssBall) {
            const d = main.r * 2;
            Object.assign(cssBall.style, { width: `${d}px`, height: `${d}px`, transform: `translate(${bandX + main.x - main.r}px, ${bandY + main.y - main.r}px)` });
        }
    }
    function frame(now) {
        raf = 0;
        const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000) || 1 / 60);
        last = now;
        step(dt);
        draw();
        if (!settled() && visible && !root.ownerDocument.hidden)
            raf = win.requestAnimationFrame(frame);
    }
    function kick() {
        if (mode === "static")
            return;
        if (reduced) {
            if (main.x < -900 || !inside) {
                place(parkX(), cy);
                main.r = 0.5 * fs * o.size;
            }
            step(0);
            draw();
            return;
        }
        if (!raf && visible && !root.ownerDocument.hidden) {
            last = performance.now();
            raf = win.requestAnimationFrame(frame);
        }
    }
    const toBand = (e) => {
        const band = root.querySelector(".suds-band");
        const r = band === null || band === void 0 ? void 0 : band.getBoundingClientRect();
        if (!r)
            return;
        px = e.clientX - r.left;
        py = e.clientY - r.top;
        inside = e.clientY >= r.top - fs * 0.6 && e.clientY <= r.bottom + fs * 0.3;
    };
    const onMove = (e) => {
        toBand(e);
        touched = true;
        sweepT = -1;
        lastMove = performance.now();
        if (reduced) {
            if (inside) {
                place(Math.min(x1, Math.max(x0, px)), cy);
                main.r = 0.5 * fs * o.size;
            }
            step(0);
            draw();
            return;
        }
        kick();
    };
    const onLeave = () => { inside = false; lastMove = performance.now(); kick(); };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointercancel", onLeave);
    const io = new win.IntersectionObserver((es) => {
        visible = es.some((x) => x.isIntersecting);
        if (visible && !seen && !touched && !reduced) {
            seen = true;
            sweepT = 0;
        }
        kick();
    });
    io.observe(root);
    const onVis = () => kick();
    root.ownerDocument.addEventListener("visibilitychange", onVis);
    const ro = new win.ResizeObserver(() => layout());
    ro.observe(root);
    const onLost = (e) => { e.preventDefault(); teardownGl(); };
    canvas.addEventListener("webglcontextlost", onLost);
    function teardownGl() { mode = "static"; gl = null; lens.remove(); root.removeAttribute("data-live"); if (raf)
        win.cancelAnimationFrame(raf); raf = 0; }
    layout();
    (_c = root.ownerDocument.fonts) === null || _c === void 0 ? void 0 : _c.ready.then(() => layout()).catch(() => { });
    return {
        get mode() { return mode; },
        set(p) {
            const relayout = (p.theme && p.theme !== o.theme) || (p.size !== undefined && p.size !== o.size);
            o = { ...o, ...p };
            if (relayout)
                win.requestAnimationFrame(() => layout());
            else {
                lastMove = performance.now();
                kick();
            }
        },
        refresh() { win.requestAnimationFrame(() => layout()); },
        dispose() {
            var _a;
            if (raf)
                win.cancelAnimationFrame(raf);
            io.disconnect();
            ro.disconnect();
            root.removeEventListener("pointermove", onMove);
            root.removeEventListener("pointerdown", onMove);
            root.removeEventListener("pointerleave", onLeave);
            root.removeEventListener("pointercancel", onLeave);
            root.ownerDocument.removeEventListener("visibilitychange", onVis);
            canvas.removeEventListener("webglcontextlost", onLost);
            (_a = gl === null || gl === void 0 ? void 0 : gl.getExtension("WEBGL_lose_context")) === null || _a === void 0 ? void 0 : _a.loseContext();
            lens.remove();
            cssBall === null || cssBall === void 0 ? void 0 : cssBall.remove();
            root.removeAttribute("data-live");
        },
    };
}

function readOpts(el) {
  var o = {}; var a = function (n) { return el.getAttribute(n); };
  if (a("word") != null) o.word = a("word");
  if (a("note") != null) o.note = a("note");
  if (a("theme") === "light" || a("theme") === "dark") o.theme = a("theme");
  ["size", "refraction", "wobble", "hue"].forEach(function (k) { var v = parseFloat(a(k)); if (!isNaN(v)) o[k] = v; });
  var j = a("columns") || (el.querySelector('script[type="application/json"]') || {}).textContent;
  if (j) { try { o.columns = JSON.parse(j); } catch (e) { console.warn("suds: columns is not valid JSON"); } }
  return Object.assign({}, SUDS_DEFAULTS, o);
}
if (typeof customElements !== "undefined" && !customElements.get("suds-footer")) {
  customElements.define("suds-footer", class extends HTMLElement {
    static get observedAttributes() { return ["word", "note", "theme", "size", "refraction", "wobble", "hue", "columns"]; }
    connectedCallback() {
      injectSudsCss(this.ownerDocument);
      this.style.display = "block";
      var o = readOpts(this);
      this.foot = this.ownerDocument.createElement("footer");
      this.foot.className = "suds"; this.foot.setAttribute("data-theme", o.theme);
      this.foot.innerHTML = '<div class="suds-in">' + sudsMarkup(o) + "</div>";
      this.textContent = ""; this.appendChild(this.foot);
      this.suds = createSuds(this.foot, o);
    }
    attributeChangedCallback() {
      if (!this.suds) return;
      var o = readOpts(this);
      this.foot.setAttribute("data-theme", o.theme);
      this.foot.querySelector(".suds-in").innerHTML = sudsMarkup(o);
      this.suds.set(o); this.suds.refresh();
    }
    disconnectedCallback() { if (this.suds) this.suds.dispose(); this.suds = null; }
  });
}
globalThis.Suds = { createSuds: createSuds, sudsMarkup: sudsMarkup, injectSudsCss: injectSudsCss, fitSize: fitSize, DEFAULTS: SUDS_DEFAULTS };
})();
