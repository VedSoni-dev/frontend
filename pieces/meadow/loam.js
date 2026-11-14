/*! loam · a living flower meadow in a planter, drawn in WebGL · MIT · https://frontend.vedantsoni.com/meadow
 * After Rishi's living flower meadow (https://x.com/that_rishi07/status/2121338147187425617), rebuilt clean-room: own
 * code, shaders, planter, flowers and palette. One WebGL2 canvas, no dependencies, no textures, no network.
 *   import { mount } from "./loam.js";  const m = mount(el, { planter: "long", wind: 0.5 });  m.set({ sun: 200 }); m.destroy();
 *   or: <loam-meadow planter="long" mix="poppy,daisy,cornflower" style="display:block;height:70vh"></loam-meadow>
 * Move through it to blow the grass aside; hold (or long-press, or press L) for a glass lens.
 */

export const FLOWERS = ["poppy", "daisy", "cornflower", "buttercup", "clover"];
export const PLANTERS = ["long", "square", "round"];
export const GROUNDS = ["tiles", "lawn", "desk", "plain"];
export const DEFAULTS = { v: 1, seed: 11, mix: FLOWERS.slice(), density: 0.6, wind: 0.45, sun: 135, planter: "long", ground: "tiles", bugs: true, grow: false, renderer: "auto" };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d, a, b) => { const n = typeof v === "string" ? parseFloat(v) : v; return typeof n === "number" && isFinite(n) ? clamp(n, a, b) : d; };
const bool = (v, d) => (v === true || v === "true" || v === "" ? true : v === false || v === "false" ? false : d);

/** Any input (storage, URL hash, attributes, junk) -> a valid config. */
export function normalize(c) {
  const o = c && typeof c === "object" ? c : {};
  let mix = DEFAULTS.mix;
  if (Array.isArray(o.mix)) mix = FLOWERS.filter((f) => o.mix.includes(f));
  else if (typeof o.mix === "string") { const s = o.mix.split(/[\s,]+/); mix = FLOWERS.filter((f) => s.includes(f)); }
  return {
    v: 1,
    seed: Math.floor(num(o.seed, DEFAULTS.seed, 0, 1e9)),
    mix,
    density: num(o.density, DEFAULTS.density, 0, 1),
    wind: num(o.wind, DEFAULTS.wind, 0, 1),
    sun: Math.round(num(o.sun, DEFAULTS.sun, 0, 360)),
    planter: PLANTERS.includes(o.planter) ? o.planter : DEFAULTS.planter,
    ground: GROUNDS.includes(o.ground) ? o.ground : DEFAULTS.ground,
    bugs: bool(o.bugs, DEFAULTS.bugs),
    grow: bool(o.grow, DEFAULTS.grow),
    renderer: o.renderer === "static" ? "static" : "auto",
  };
}

// ---- seeded randomness: every placement comes from the seed, so a seed is a meadow ----
export function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** The planter's outer box in CSS px for a W x H stage: long planters turn upright on tall screens. */
export function planterBox(W, H, shape) {
  let aspect = shape === "long" ? 1.75 : 1;
  if (shape === "long" && H > W * 1.1) aspect = 1 / 1.75;
  const w = Math.min(W * 0.88, H * 0.8 * aspect), h = w / aspect;
  const ft = Math.min(w, h) * (shape === "round" ? 0.07 : 0.085);
  const x0 = (W - w) / 2, y0 = (H - h) / 2;
  return { x0, y0, x1: x0 + w, y1: y0 + h, ft, round: shape === "round", S: Math.min(w, h) - 2 * ft };
}

// flower kinds in the shader: 1 poppy, 2 daisy, 3 cornflower, 4 buttercup, 5 clover; 0 is a clover leaf
const KIND = { poppy: 1, daisy: 2, cornflower: 3, buttercup: 4, clover: 5 };
const SIZE = { poppy: 0.2, daisy: 0.12, cornflower: 0.105, buttercup: 0.08, clover: 0.075 };
const HEIGHT = { poppy: 1.9, daisy: 1.5, cornflower: 1.6, buttercup: 1.25, clover: 1.0 };
const WEIGHT = { poppy: 0.9, daisy: 1.2, cornflower: 1.1, buttercup: 1.2, clover: 0.7 };

/** Where every blade, leaf and flower goes: pure and seeded. blades: 8 floats each, heads: 12 floats each. */
export function buildField(cfg, W, H) {
  const box = planterBox(W, H, cfg.planter);
  const S = box.S, ix0 = box.x0 + box.ft, iy0 = box.y0 + box.ft, iw = box.x1 - box.x0 - 2 * box.ft, ih = box.y1 - box.y0 - 2 * box.ft;
  const cx = ix0 + iw / 2, cy = iy0 + ih / 2, rr = iw / 2;
  const rnd = mulberry32(cfg.seed * 9973 + 17);
  const inside = (x, y, m) => box.round ? Math.hypot(x - cx, y - cy) < rr - m : x > ix0 + m && x < ix0 + iw - m && y > iy0 + m && y < iy0 + ih - m;
  const pick = (m) => { for (let i = 0; i < 40; i++) { const x = ix0 + rnd() * iw, y = iy0 + rnd() * ih; if (inside(x, y, m)) return [x, y]; } return [cx, cy]; };
  const area = (box.round ? Math.PI * rr * rr : iw * ih) / (S * S);

  // grass in tufts: blades fan out of each tuft, seen from straight above
  const target = Math.round(area * 7000 * (0.3 + 0.7 * cfg.density));
  const blades = new Float32Array(target * 8);
  let n = 0;
  while (n < target) {
    const [tx, ty] = pick(S * 0.005);
    const k = 5 + Math.floor(rnd() * 6), dry = rnd() < 0.18 ? rnd() : 0;
    for (let j = 0; j < k && n < target; j++, n++) {
      const o = n * 8;
      blades[o] = tx + (rnd() - 0.5) * S * 0.025; blades[o + 1] = ty + (rnd() - 0.5) * S * 0.025;
      blades[o + 2] = rnd() * Math.PI * 2; blades[o + 3] = S * (0.045 + 0.075 * rnd());
      blades[o + 4] = S * (0.006 + 0.006 * rnd()); blades[o + 5] = rnd(); blades[o + 6] = rnd() * 0.55; blades[o + 7] = dry;
    }
  }
  // shuffle so a lower quality can draw the first N and still cover the whole bed
  for (let i = target - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); for (let q = 0; q < 8; q++) { const t = blades[i * 8 + q]; blades[i * 8 + q] = blades[j * 8 + q]; blades[j * 8 + q] = t; } }

  const heads = [];
  const nLeaves = Math.round(area * 70 * (0.4 + 0.6 * cfg.density));
  for (let i = 0; i < nLeaves; i++) { const [x, y] = pick(S * 0.02); heads.push([x, y, S * (0.035 + 0.025 * rnd()), rnd() * 6.283, 0, rnd(), rnd() * 0.5, 0.35, 1, 1, 1, 1]); }
  const mix = cfg.mix, wsum = mix.reduce((s, f) => s + WEIGHT[f], 0);
  const nFlowers = mix.length ? Math.round(area * 46 * (0.25 + 0.75 * cfg.density)) : 0;
  const placed = [];
  for (let i = 0; i < nFlowers; i++) {
    let r = rnd() * wsum, f = mix[0];
    for (const m of mix) { r -= WEIGHT[m]; if (r <= 0) { f = m; break; } }
    const size = S * SIZE[f] * (0.8 + 0.4 * rnd());
    let best = null, bestD = -Infinity;
    for (let t = 0; t < 8; t++) { // keep the heads from piling up: best of a few tries
      const [x, y] = pick(size * 0.35);
      let d = 1e9; for (const p of placed) d = Math.min(d, Math.hypot(p[0] - x, p[1] - y) - (p[2] + size) * 0.42);
      if (d > bestD) { bestD = d; best = [x, y]; }
      if (d > 0) break;
    }
    placed.push([best[0], best[1], size]);
    heads.push([best[0], best[1], size, rnd() * 6.283, KIND[f], rnd(), 0.3 + rnd() * 0.55, HEIGHT[f] * (0.85 + 0.3 * rnd()), 1, 1, 1, 1]);
  }
  heads.sort((a, b) => a[7] - b[7]); // leaves first, the tallest flowers last (on top)
  const hd = new Float32Array(heads.length * 12);
  heads.forEach((h, i) => hd.set(h, i * 12));
  return { box, S, blades, bladeCount: target, heads: hd, headCount: heads.length, flowers: heads.filter((h) => h[4] > 0) };
}

// ---- shaders ----
const NOISE = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+17.1;a*=.5;}return s;}`;
const COMMON = `
uniform vec2 u_res; uniform vec2 u_c; uniform float u_zoom; uniform float u_t; uniform float u_wind; uniform float u_S;
uniform vec2 u_wdir; uniform vec4 u_ptr[8]; uniform vec2 u_sdir; uniform vec2 u_ldir; uniform float u_grow; uniform float u_shadow;
${NOISE}
vec2 windAt(vec2 p,float h){
  vec2 q=p/u_S; float w=u_wind;
  float g=vn(q*1.3-u_wdir*u_t*(0.25+0.6*w));
  float f=vn(q*4.0+vec2(u_t*0.7,-u_t*0.5));
  float sw=sin(u_t*(1.2+1.4*w)+dot(q,vec2(4.1,2.7))+f*4.0);
  vec2 pr=vec2(-u_wdir.y,u_wdir.x);
  vec2 d=u_wdir*((g-0.35)*1.6*w+sw*0.22*(0.15+w))+pr*(f-0.5)*0.6*(0.15+w);
  d*=u_S*0.04*h;
  for(int i=0;i<8;i++){vec4 P=u_ptr[i]; if(P.z>0.001){vec2 v=p-P.xy; float dd=length(v); float k=P.z*exp(-dd*dd/(P.w*P.w)); d+=v/max(dd,1.0)*k*P.w*0.55*min(h,1.4);}}
  return d;
}
vec4 toClip(vec2 p){vec2 s=(p-u_c)*u_zoom+u_c; return vec4(s.x/u_res.x*2.-1.,1.-s.y/u_res.y*2.,0.,1.);}`;

const BLADE_VS = `#version 300 es
precision highp float;
${COMMON}
layout(location=0) in vec2 a_v;
layout(location=1) in vec4 a_i0;
layout(location=2) in vec4 a_i1;
out float v_v; out float v_u; out vec2 v_n; out vec2 v_c;
void main(){
  float g=smoothstep(a_i1.z,a_i1.z+0.4,u_grow);
  float L=a_i0.w*(0.2+0.8*g);
  vec2 dir=vec2(cos(a_i0.z),sin(a_i0.z));
  vec2 D=windAt(a_i0.xy,1.0)*g;
  float v=a_v.y;
  vec2 P=a_i0.xy+dir*L*v+D*v*v;
  vec2 tg=normalize(dir*L+2.0*D*v+vec2(1e-4));
  vec2 n=vec2(-tg.y,tg.x);
  P+=n*a_v.x*a_i1.x*(1.0-v*0.9)*g*0.5;
  if(u_shadow>0.5) P+=u_sdir*u_S*0.02*(0.2+v);
  v_v=v; v_u=a_v.x; v_n=n; v_c=a_i1.yw;
  gl_Position=toClip(P);
}`;
const BLADE_FS = `#version 300 es
precision highp float;
uniform vec2 u_ldir; uniform float u_shadow;
in float v_v; in float v_u; in vec2 v_n; in vec2 v_c;
out vec4 o;
void main(){
  if(u_shadow>0.5){o=vec4(0.,0.,0.,0.12);return;}
  vec3 hi=mix(vec3(.30,.60,.11),vec3(.52,.74,.20),v_c.x);
  hi=mix(hi,vec3(.66,.66,.30),v_c.y*0.7);
  vec3 c=mix(vec3(.04,.13,.03),hi,smoothstep(0.,0.8,v_v));
  float side=sign(v_u)*dot(v_n,u_ldir);
  c*=0.8+0.34*side*smoothstep(0.,0.4,abs(v_u))+0.12*v_v;
  c+=vec3(.12,.13,.05)*pow(v_v,3.);
  o=vec4(c,1.);
}`;
const SPRITE_VS = `#version 300 es
precision highp float;
${COMMON}
uniform float u_dyn;
layout(location=0) in vec2 a_q;
layout(location=1) in vec4 a_i0;
layout(location=2) in vec4 a_i1;
layout(location=3) in vec4 a_i2;
out vec2 v_p; flat out float v_k; out float v_s; out vec4 v_col; out vec2 v_l;
void main(){
  float g=u_dyn>0.5?1.0:smoothstep(a_i1.z,a_i1.z+0.35,u_grow);
  vec2 pos=a_i0.xy;
  if(u_dyn<0.5) pos+=windAt(pos,a_i1.w)*g;
  float c=cos(a_i0.w), s=sin(a_i0.w);
  vec2 q=a_q*a_i0.z*0.5*g;
  vec2 P=pos+vec2(c*q.x-s*q.y,s*q.x+c*q.y);
  if(u_shadow>0.5) P+=u_sdir*u_S*0.02*a_i1.w;
  v_p=a_q; v_k=a_i1.x; v_s=a_i1.y; v_col=a_i2;
  v_l=vec2(c*u_ldir.x+s*u_ldir.y,-s*u_ldir.x+c*u_ldir.y);
  gl_Position=toClip(P);
}`;
const SPRITE_FS = `#version 300 es
precision highp float;
uniform float u_shadow; uniform float u_t;
in vec2 v_p; flat in float v_k; in float v_s; in vec4 v_col; in vec2 v_l;
out vec4 o;
float h11(float x){return fract(sin(x*127.1)*43758.5453);}
float ell(vec2 p,vec2 c,vec2 r,float aa){return 1.-smoothstep(1.-aa*8.,1.+aa*8.,length((p-c)/r));}
void main(){
  vec2 p=v_p; float r=length(p), a=atan(p.y,p.x); float aa=fwidth(r)*1.3+1e-4;
  int k=int(v_k+0.5); float s=v_s; float ph=a+s*6.2832;
  vec3 c=vec3(0.); float m=0.;
  float lit=dot(p,v_l);
  if(k==0){
    float d=1e3; for(int i=0;i<3;i++){float an=float(i)*2.094+s*6.28; vec2 cc=vec2(cos(an),sin(an))*0.4; d=min(d,length(p-cc)-0.42);}
    m=1.-smoothstep(-aa,aa,d);
    c=mix(vec3(.09,.27,.06),vec3(.20,.47,.12),fract(s*7.)); c*=0.85+0.25*lit;
    c=mix(c,c*1.45,(1.-smoothstep(0.02,0.06,abs(r-0.42)))*0.5);
  } else if(k==1){
    float e=0.80+0.11*cos(4.*ph)+0.035*sin(a*11.+s*20.);
    m=1.-smoothstep(e-aa,e+aa,r);
    c=vec3(.86,.05,.03);
    c*=1.-0.35*smoothstep(0.82,1.,-cos(4.*ph))*smoothstep(0.25,0.6,r);
    c*=0.9+0.1*sin(a*70.+sin(r*9.)*2.);
    c*=0.6+0.52*smoothstep(0.18,0.8,r);
    c+=vec3(.22,.04,.02)*max(lit,0.);
    c=mix(vec3(.07,.02,.06),c,smoothstep(.19,.30,r));
    c=mix(vec3(.50,.58,.38)*(0.8+0.25*sin(a*8.)),c,smoothstep(.08,.11,r));
  } else if(k==2){
    float n=22.; float pp=a/6.2832*n+s*7.; float pa=abs(fract(pp)-0.5)*2.;
    float len=0.86+0.1*h11(floor(pp)+s*31.);
    float wd=0.78*(1.-smoothstep(len-0.32,len,r))+0.06;
    float pet=(1.-smoothstep(wd-0.16,wd+0.04,pa))*(1.-smoothstep(len-aa,len+aa,r));
    m=max(pet,1.-smoothstep(0.26-aa,0.26+aa,r));
    c=vec3(.97,.97,.95)*(0.8+0.2*smoothstep(0.2,0.6,r))*(0.9+0.12*lit);
    c*=0.86+0.14*(1.-pa);
    vec3 cen=vec3(.98,.74,.08)*(0.75+0.3*(lit*0.5+0.5))*(0.88+0.12*sin(p.x*70.)*sin(p.y*70.));
    c=mix(cen,c,smoothstep(.22,.28,r));
  } else if(k==3){
    float e=0.56+0.34*pow(abs(cos(ph*4.)),0.6)+0.07*abs(sin(ph*36.));
    m=1.-smoothstep(e-aa,e+aa,r);
    c=mix(vec3(.10,.15,.62),vec3(.32,.44,.98),smoothstep(0.25,0.85,r));
    c*=0.82+0.22*abs(sin(ph*36.)); c*=0.85+0.22*lit;
    float sp=(1.-smoothstep(.17,.32,r))*(0.6+0.4*sin(ph*30.));
    c=mix(c,vec3(.36,.07,.50),sp);
  } else if(k==4){
    float e=0.74+0.18*cos(5.*ph);
    m=1.-smoothstep(e-aa,e+aa,r);
    c=vec3(.99,.82,.06)*(0.62+0.45*smoothstep(0.1,0.7,r));
    c*=1.-0.3*smoothstep(0.8,1.,-cos(5.*ph))*smoothstep(.2,.5,r);
    vec2 hp=p-v_l*0.35; c+=vec3(1.,.95,.6)*exp(-dot(hp,hp)*18.)*0.55;
    c=mix(vec3(.72,.72,.16)*(0.85+0.15*sin(a*20.)),c,smoothstep(.15,.22,r));
  } else if(k==5){
    float e=0.82+0.08*sin(ph*9.)+0.05*sin(ph*23.);
    m=1.-smoothstep(e-aa,e+aa,r);
    c=mix(vec3(.98,.84,.92),vec3(.76,.26,.56),smoothstep(0.1,0.85,r));
    c*=0.78+0.26*(0.5+0.5*sin(ph*34.+r*20.)); c*=0.8+0.25*lit;
  } else if(k==10){
    float body=1.-smoothstep(1.-aa*6.,1.+aa*6.,length((p-vec2(-0.05,0.))/vec2(0.62,0.34)));
    float fl=0.35+0.65*abs(sin(u_t*70.+s*10.));
    float wg=max(ell(p,vec2(-0.05,0.42*fl+0.1),vec2(0.34,0.24*fl+0.02),aa),ell(p,vec2(-0.05,-0.42*fl-0.1),vec2(0.34,0.24*fl+0.02),aa));
    vec3 bc=mix(vec3(.07,.05,.03),vec3(.98,.74,.10),step(0.,sin(p.x*13.+1.)));
    bc=mix(bc,vec3(.06,.05,.04),smoothstep(0.38,0.45,p.x)); bc*=0.8+0.35*max(lit,0.);
    c=mix(vec3(.92,.95,1.),bc,body); m=max(body,wg*0.55);
  } else if(k==11){
    float fl=0.2+0.8*abs(sin(u_t*7.+s*10.));
    vec2 q=vec2(p.x,abs(p.y)/fl);
    float w1=ell(q,vec2(0.18,0.46),vec2(0.34,0.42),aa), w2=ell(q,vec2(-0.26,0.36),vec2(0.25,0.3),aa);
    float wing=max(w1,w2);
    vec3 wc=vec3(.98,.97,.91)*(0.85+0.2*lit);
    wc=mix(wc,vec3(.25,.24,.22),ell(q,vec2(0.36,0.72),vec2(0.14,0.12),aa));
    float body=ell(p,vec2(0.),vec2(0.55,0.08),aa);
    c=mix(wc,vec3(.15,.13,.1),body); m=max(wing,body);
  } else {
    m=ell(p,vec2(0.),vec2(0.85,0.48),aa);
    c=v_col.rgb*(0.78+0.3*lit)*(0.92+0.08*sin(p.x*30.));
  }
  if(u_shadow>0.5){o=vec4(0.,0.,0.,m*0.26*v_col.a);return;}
  if(m<0.01) discard;
  o=vec4(c,m*v_col.a);
}`;
const QUAD_VS = `#version 300 es
layout(location=0) in vec2 a_q;
void main(){gl_Position=vec4(a_q,0.,1.);}`;
const GROUND_FS = `#version 300 es
precision highp float;
uniform vec2 u_res; uniform vec2 u_c; uniform float u_zoom; uniform float u_dpr;
uniform vec4 u_box; uniform float u_ft; uniform float u_round; uniform float u_ground; uniform vec2 u_sdir; uniform vec2 u_ldir; uniform float u_S;
out vec4 o;
${NOISE}
float sdBox(vec2 p,vec2 b){vec2 d=abs(p)-b;return length(max(d,0.))+min(max(d.x,d.y),0.);}
float sdP(vec2 p,vec2 hb){return u_round>0.5?length(p)-hb.x:sdBox(p,hb);}
vec3 ground(vec2 w){
  int g=int(u_ground+.5);
  if(g==0){float T=max(u_res.x,u_res.y)*0.26; vec2 tc=w/T+vec2(0.37,0.21); vec2 id=floor(tc), f=fract(tc);
    vec3 c=mix(vec3(.80,.71,.61),vec3(.87,.79,.69),h21(id));
    c*=0.93+0.09*fbm(w*0.02+id*7.); c*=0.97+0.05*vn(w*0.4);
    float gw=2.2/T; float gr=min(min(f.x,1.-f.x),min(f.y,1.-f.y)); return mix(vec3(.62,.54,.46),c,smoothstep(gw*0.5,gw*1.5,gr));}
  if(g==1){float n=fbm(w*0.025); vec3 c=mix(vec3(.19,.36,.11),vec3(.36,.56,.20),n); return c*(0.88+0.16*vn(vec2(w.x*0.7,w.y*0.18)));}
  if(g==2){float P=u_S*0.3; float pl=floor(w.y/P); float n=fbm(vec2(w.x*0.004+pl*3.1,w.y*0.012+pl));
    vec3 c=mix(vec3(.46,.30,.18),vec3(.58,.40,.25),h21(vec2(pl,1.)));
    c*=0.9+0.08*sin((w.y+n*80.)*0.22)+0.06*fbm(vec2(w.x*0.01,w.y*0.25));
    float gp=fract(w.y/P); return c*mix(0.55,1.,smoothstep(0.,0.01,gp)*smoothstep(1.,0.99,gp));}
  return vec3(.92,.90,.86)*(0.97+0.03*vn(w*0.01));
}
void main(){
  vec2 px=vec2(gl_FragCoord.x,u_res.y*u_dpr-gl_FragCoord.y)/u_dpr;
  vec2 w=(px-u_c)/u_zoom+u_c;
  vec2 ctr=(u_box.xy+u_box.zw)*.5, hb=(u_box.zw-u_box.xy)*.5; float ft=u_ft;
  vec3 col=ground(w);
  float ds=sdP(w-ctr-u_sdir*ft*0.8,hb);
  col*=1.-0.42*(1.-smoothstep(-ft*0.3,ft*1.0,ds));
  vec2 q=w-ctr; float d0=sdP(q,hb);
  col*=1.-0.22*(1.-smoothstep(0.,ft*0.3,d0));
  if(d0<0.){
    float di=sdP(q,hb-ft);
    if(di>0.){
      vec3 c; float light;
      if(u_round>0.5){
        float rr=length(q); float t=(rr-(hb.x-ft))/ft*2.-1.; vec2 nrm=q/max(rr,1.)*t*t*t;
        float an=atan(q.y,q.x);
        c=mix(vec3(.70,.37,.23),vec3(.80,.46,.30),fbm(vec2(an*12.,rr*0.05)));
        c*=0.95+0.05*vn(w*0.5);
        light=dot(nrm,u_ldir);
        c*=1.-0.35*smoothstep(0.9,1.,abs(t));
      } else {
        vec2 aq=abs(q), in2=hb-ft;
        if(aq.x>in2.x&&aq.y>in2.y){
          vec2 pc=sign(q)*(hb-ft*0.5); vec2 lp=q-pc;
          float rr=length(lp+vec2(ft*0.07,ft*0.05));
          float ring=sin(rr/ft*48.+fbm(lp*0.05+sign(q)*3.)*4.);
          c=mix(vec3(.84,.62,.38),vec3(.70,.47,.27),smoothstep(0.4,1.,ring));
          float e=max(abs(lp.x),abs(lp.y))/(ft*0.5);
          vec2 nrm=(abs(lp.x)>abs(lp.y)?vec2(sign(lp.x),0.):vec2(0.,sign(lp.y)))*pow(e,6.);
          light=dot(nrm,u_ldir)+0.08;
          c*=0.5+0.5*smoothstep(1.0,0.93,e);
        } else {
          bool hz=aq.y>in2.y;
          float along=hz?q.x:q.y, across=hz?q.y:q.x, t=((hz?aq.y:aq.x)-(hz?in2.y:in2.x))/ft*2.-1.;
          vec2 ax=hz?vec2(0.,sign(q.y)):vec2(sign(q.x),0.);
          float n=fbm(vec2(along*0.004,across*0.04+(hz?0.:9.)));
          float rings=sin(across*0.45+n*10.+along*0.002);
          c=mix(vec3(.78,.56,.33),vec3(.90,.70,.46),0.5+0.5*rings);
          c*=0.93+0.1*fbm(vec2(along*0.0015,across*0.3));
          float kn=length(vec2(fract(along/(ft*7.)+h21(vec2(across>0.?1.:2.,hz?1.:2.)))-0.5,t*0.5)*vec2(ft*7.,ft)/ft);
          c=mix(vec3(.55,.36,.2),c,smoothstep(0.08,0.2,kn));
          light=dot(ax*t*t*t,u_ldir);
          float endc=(hz?in2.x:in2.y)-abs(along);
          c*=0.55+0.45*smoothstep(0.,ft*0.06,endc);
          c*=1.-0.3*smoothstep(0.9,1.,abs(t));
        }
      }
      col=c*(1.+0.32*light);
    } else {
      vec3 s=mix(vec3(.15,.09,.05),vec3(.27,.17,.10),fbm(w*0.05)); s*=0.82+0.28*vn(w*0.7);
      float sh=smoothstep(-ft*0.2,ft*0.2,sdP(q-u_sdir*ft*0.8,hb-ft));
      s*=1.-0.5*sh; s*=0.65+0.35*smoothstep(0.,ft*0.7,-di);
      col=s;
    }
  }
  vec2 uv=px/u_res-0.5; col*=1.-0.16*pow(length(uv)*1.3,2.5);
  o=vec4(col,1.);
}`;
const LENS_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex; uniform vec2 u_lc; uniform float u_lr; uniform vec2 u_resd;
out vec4 o;
void main(){
  vec2 f=gl_FragCoord.xy; vec2 q=(f-u_lc)/u_lr; float d=length(q);
  if(d>1.1){discard;}
  if(d>1.0){o=vec4(0.,0.,0.,0.22*(1.-smoothstep(1.,1.1,d)));return;}
  vec2 dv=q/max(d,1e-3);
  vec2 base=u_lc+q*(1.-0.16*pow(d,4.))*u_lr;
  float ca=0.012*u_lr*pow(d,3.);
  vec3 c=vec3(texture(u_tex,(base+dv*ca)/u_resd).r,texture(u_tex,base/u_resd).g,texture(u_tex,(base-dv*ca)/u_resd).b);
  c+=vec3(1.)*smoothstep(0.9,0.995,d)*0.35;
  c=mix(c,vec3(1.),smoothstep(0.975,1.0,d)*0.6);
  c+=smoothstep(0.72,0.95,d)*smoothstep(0.5,1.,dot(dv,normalize(vec2(-0.6,0.8))))*0.22;
  o=vec4(c,1.);
}`;

function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error("loam shader: " + gl.getShaderInfoLog(s));
    gl.attachShader(p, s); gl.deleteShader(s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error("loam link: " + gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ""); u[name] = gl.getUniformLocation(p, name); }
  return { p, u };
}

const POSTER = "https://frontend.vedantsoni.com/meadow/poster.jpg";

/** Mount a living meadow into el (it fills el). Returns { config, set, regrow, lens, frame, toPNG, destroy }. */
export function mount(el, config) {
  let cfg = normalize(config);
  if (typeof getComputedStyle !== "undefined" && getComputedStyle(el).position === "static") el.style.position = "relative";
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none";
  el.appendChild(canvas);
  let gl = null, fallbackEl = null;
  const fail = (why) => {
    canvas.style.display = "none";
    fallbackEl = document.createElement("div");
    fallbackEl.style.cssText = `position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:#cdbba6 url(${POSTER}) center/cover no-repeat;font:13px system-ui,sans-serif;color:#2a1d12`;
    fallbackEl.innerHTML = '<span style="background:#fffaf2;padding:6px 12px;border-radius:999px">The live meadow needs WebGL 2. This is a still of it.</span>';
    el.appendChild(fallbackEl);
    try { el.dispatchEvent(new CustomEvent("error", { detail: { reason: why } })); } catch { /* fine */ }
  };
  const reducedMq = typeof matchMedia !== "undefined" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reduced = !!reducedMq?.matches;

  let W = 1, H = 1, dpr = 1, scale = 1, field = null, P = null;
  let bladeDraw = 0, raf = 0, alive = true, visible = true, onscreen = true, t = 0, last = 0, grow = cfg.grow ? 0 : 1;
  const ptr = { x: -1e4, y: -1e4, in: false, s: 0, sp: 0, lx: 0, ly: 0, lt: 0, trail: [] };
  const lens = { on: false, k: 0, x: 0, y: 0, key: false, timer: 0, downX: 0, downY: 0 };
  const parts = { bees: [], petals: [], buf: new Float32Array(200 * 12) };
  const perf = { n: 0, sum: 0, level: 0 };

  function initGL() {
    gl = canvas.getContext("webgl2", { antialias: true, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
    if (!gl) return false;
    P = {
      blade: compile(gl, BLADE_VS, BLADE_FS), sprite: compile(gl, SPRITE_VS, SPRITE_FS),
      ground: compile(gl, QUAD_VS, GROUND_FS), lens: compile(gl, QUAD_VS, LENS_FS),
    };
    const mesh = []; for (let i = 0; i <= 4; i++) mesh.push(-1, i / 4, 1, i / 4);
    P.meshBuf = buf(new Float32Array(mesh)); P.quadBuf = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    P.triBuf = buf(new Float32Array([-1, -1, 3, -1, -1, 3]));
    P.bladeInst = gl.createBuffer(); P.headInst = gl.createBuffer(); P.dynInst = gl.createBuffer();
    P.bladeVao = vao(P.meshBuf, P.bladeInst, 2, 32); P.headVao = vao(P.quadBuf, P.headInst, 3, 48); P.dynVao = vao(P.quadBuf, P.dynInst, 3, 48);
    P.triVao = gl.createVertexArray(); gl.bindVertexArray(P.triVao); gl.bindBuffer(gl.ARRAY_BUFFER, P.triBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    P.fbo = null;
    return true;
  }
  function buf(data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; }
  function vao(base, inst, n, stride) {
    const v = gl.createVertexArray(); gl.bindVertexArray(v);
    gl.bindBuffer(gl.ARRAY_BUFFER, base); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    for (let i = 0; i < n; i++) { gl.enableVertexAttribArray(i + 1); gl.vertexAttribPointer(i + 1, 4, gl.FLOAT, false, stride, i * 16); gl.vertexAttribDivisor(i + 1, 1); }
    gl.bindVertexArray(null); return v;
  }
  function upload() {
    if (!gl || !field) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, P.bladeInst); gl.bufferData(gl.ARRAY_BUFFER, field.blades, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, P.headInst); gl.bufferData(gl.ARRAY_BUFFER, field.heads, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, P.dynInst); gl.bufferData(gl.ARRAY_BUFFER, parts.buf.byteLength, gl.DYNAMIC_DRAW);
    bladeDraw = Math.round(field.bladeCount * [1, 0.6, 0.4][perf.level]);
  }
  function fbo() {
    const w = canvas.width, h = canvas.height;
    if (P.fbo && P.fbo.w === w && P.fbo.h === h) return P.fbo;
    if (P.fbo) { gl.deleteFramebuffer(P.fbo.f); gl.deleteTexture(P.fbo.t); }
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return (P.fbo = { f, t: tex, w, h });
  }

  function resize() {
    const r = el.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, typeof devicePixelRatio === "number" ? devicePixelRatio : 1) * [1, 0.75, 0.55][perf.level];
    canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
    field = buildField(cfg, W, H);
    upload();
  }

  // ---- life: bees, butterflies and petals (CPU, one pool) ----
  const lrnd = mulberry32(cfg.seed + 101);
  function seedBugs() {
    parts.bees = [];
    if (!cfg.bugs || !field) return;
    const nb = 3, nf = 2;
    for (let i = 0; i < nb + nf; i++) parts.bees.push({ kind: i < nb ? 10 : 11, x: lrnd() * W, y: lrnd() * H, vx: 0, vy: 0, a: lrnd() * 6.28, tx: 0, ty: 0, wait: 0, ph: lrnd(), h: i < nb ? 3 : 4.2 });
    for (const b of parts.bees) retarget(b);
  }
  function retarget(b) {
    const f = field.flowers; const box = field.box;
    if (f.length && lrnd() < 0.8) { const h = f[Math.floor(lrnd() * f.length)]; b.tx = h[0]; b.ty = h[1]; }
    else { b.tx = box.x0 + lrnd() * (box.x1 - box.x0); b.ty = box.y0 + lrnd() * (box.y1 - box.y0); }
    b.wait = 0;
  }
  const PETAL = { 1: [0.85, 0.06, 0.04], 2: [0.97, 0.97, 0.94], 3: [0.25, 0.35, 0.92], 4: [0.99, 0.82, 0.1], 5: [0.85, 0.4, 0.65] };
  function petal(x, y, kind, vx, vy) {
    if (parts.petals.length >= 140) parts.petals.shift();
    parts.petals.push({ x, y, vx, vy, rot: lrnd() * 6.28, vr: (lrnd() - 0.5) * 6, h: 1.6 + lrnd() * 0.6, life: 0, c: PETAL[kind] || PETAL[1], size: field.S * (0.018 + 0.012 * lrnd()) });
  }
  function stepLife(dt) {
    if (!field) return;
    const S = field.S, wa = cfg.sun, wind = cfg.wind * (reduced ? 0.35 : 1);
    const wdx = Math.cos(0.5), wdy = Math.sin(0.5);
    for (const b of parts.bees) {
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
      const sp = S * (b.kind === 10 ? 0.5 : 0.3) * (reduced ? 0.5 : 1);
      if (d < S * 0.02) { b.wait += dt; if (b.wait > 1 + lrnd() * 2.5) retarget(b); }
      const want = Math.atan2(dy, dx) + Math.sin(t * (b.kind === 10 ? 3 : 1.3) + b.ph * 9) * (d < S * 0.05 ? 1.5 : 0.6);
      const ax = Math.cos(want) * sp * Math.min(1, d / (S * 0.1) + 0.15), ay = Math.sin(want) * sp * Math.min(1, d / (S * 0.1) + 0.15);
      b.vx += (ax - b.vx) * Math.min(1, dt * 2.5); b.vy += (ay - b.vy) * Math.min(1, dt * 2.5);
      if (ptr.in && !reduced) { // a fast pass blows bugs away
        const px = b.x - ptr.x, py = b.y - ptr.y, pd = Math.hypot(px, py);
        if (pd < S * 0.22 && ptr.sp > S * 1.5) { const k = Math.min(ptr.sp, S * 6) / Math.max(pd, 1) * 0.9; b.vx += px * k * dt * 8; b.vy += py * k * dt * 8; b.wait = 0; }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.hypot(b.vx, b.vy) > 4) b.a = Math.atan2(b.vy, b.vx);
      if (b.x < -S || b.x > W + S || b.y < -S || b.y > H + S) { b.vx *= -0.5; b.vy *= -0.5; retarget(b); }
    }
    if (!reduced && cfg.wind > 0.05 && field.flowers.length && lrnd() < dt * (0.25 + wind * 1.4)) {
      const f = field.flowers[Math.floor(lrnd() * field.flowers.length)];
      if (f[4] === 1 || f[4] === 2) petal(f[0], f[1], f[4], wdx * S * 0.2 * wind, wdy * S * 0.2 * wind);
    }
    for (const p of parts.petals) {
      p.life += dt;
      if (p.h > 0) {
        p.vx += (wdx * S * 0.35 * wind - p.vx) * dt * 0.6 + Math.sin(t * 2 + p.rot) * S * 0.2 * dt;
        p.vy += (wdy * S * 0.35 * wind - p.vy) * dt * 0.6 + Math.cos(t * 1.7 + p.rot) * S * 0.2 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.h = Math.max(0, p.h - dt * 0.35);
        if (p.h === 0) p.life = 0;
      } else if (p.life > 3.5) p.dead = true;
    }
    parts.petals = parts.petals.filter((p) => !p.dead && p.x > -S && p.x < W + S && p.y > -S && p.y < H + S);
  }
  function fling() { // a fast swipe tears petals off the heads it passes
    if (reduced || !field) return;
    const R = field.S * 0.16;
    for (const f of field.flowers) {
      if ((f[4] === 1 || f[4] === 2 || f[4] === 3) && Math.hypot(f[0] - ptr.x, f[1] - ptr.y) < R && lrnd() < 0.18) {
        const dx = f[0] - ptr.x, dy = f[1] - ptr.y, d = Math.max(1, Math.hypot(dx, dy));
        petal(f[0], f[1], f[4], ptr.vx * 0.5 + (dx / d) * field.S * 0.6, ptr.vy * 0.5 + (dy / d) * field.S * 0.6);
      }
    }
  }
  function packLife() {
    const a = parts.buf; let n = 0;
    const S = field.S;
    for (const b of parts.bees) { a.set([b.x, b.y, S * (b.kind === 10 ? 0.075 : 0.11), b.a, b.kind, b.ph, 0, b.h, 1, 1, 1, 1], n * 12); n++; }
    for (const p of parts.petals) { if (n >= 200) break; const al = p.h > 0 ? 1 : Math.max(0, 1 - Math.max(0, p.life - 2) / 1.5); a.set([p.x, p.y, p.size, p.rot, 12, 0, 0, p.h, p.c[0], p.c[1], p.c[2], al], n * 12); n++; }
    return n;
  }

  // ---- pointer wind ----
  function local(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function onMove(e) {
    const [x, y] = local(e); const now = performance.now();
    const dt = Math.max(8, now - (ptr.lt || now - 16)) / 1000;
    const vx = (x - ptr.x) / dt, vy = (y - ptr.y) / dt;
    const fresh = !ptr.in;
    ptr.vx = fresh ? 0 : vx; ptr.vy = fresh ? 0 : vy;
    ptr.sp = fresh ? 0 : ptr.sp * 0.6 + Math.min(Math.hypot(vx, vy), 1e4) * 0.4;
    ptr.x = x; ptr.y = y; ptr.lt = now; ptr.in = true;
    if (!ptr.trail.length || now - ptr.trail[ptr.trail.length - 1].t > 45) { ptr.trail.push({ x, y, t: now, s: Math.min(1.4, 0.5 + ptr.sp / ((field?.S || 600) * 4)) }); if (ptr.trail.length > 7) ptr.trail.shift(); }
    if (field && ptr.sp > field.S * 3) fling();
    if (lens.timer && Math.hypot(x - lens.downX, y - lens.downY) > 12) { clearTimeout(lens.timer); lens.timer = 0; }
    start();
  }
  function onDown(e) {
    onMove(e);
    if (e.pointerType === "mouse") { if (e.button === 0) lens.on = true; }
    else { lens.downX = ptr.x; lens.downY = ptr.y; clearTimeout(lens.timer); lens.timer = setTimeout(() => { lens.on = true; lens.timer = 0; }, 350); }
  }
  function onUp() { clearTimeout(lens.timer); lens.timer = 0; if (!lens.key) lens.on = false; }
  function onLeave(e) { ptr.in = false; onUp(e); }
  function onKey(e) {
    if (e.key !== "l" && e.key !== "L") return;
    const tg = e.target; if (tg && tg.closest && tg.closest("input, textarea, select, [contenteditable]")) return;
    if (e.metaKey || e.ctrlKey || e.altKey || !onscreen) return;
    lens.key = !lens.on; lens.on = lens.key;
    if (lens.on && !ptr.in) { lens.x = W / 2; lens.y = H / 2; }
    start();
  }
  canvas.addEventListener("pointermove", onMove); canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointerleave", onLeave); canvas.addEventListener("pointercancel", onLeave);
  canvas.addEventListener("contextmenu", (e) => { if (lens.on) e.preventDefault(); });
  addEventListener("keydown", onKey);

  function ptrUniform() {
    const u = new Float32Array(32); const S = field.S; const now = performance.now();
    ptr.s += ((ptr.in ? 1 : 0) - ptr.s) * 0.15;
    if (ptr.s > 0.01) u.set([ptr.x, ptr.y, ptr.s * Math.min(1.5, 0.75 + ptr.sp / (S * 8)) * (1 - 0.75 * lens.k), S * 0.15], 0);
    let i = 1;
    for (let j = ptr.trail.length - 1; j >= 0 && i < 8; j--, i++) {
      const p = ptr.trail[j], age = (now - p.t) / 1000;
      const k = p.s * Math.exp(-age * 3.2) * (reduced ? 0.5 : 1);
      if (k > 0.01) u.set([p.x, p.y, k * 0.8, S * 0.15 * (1 + age * 0.6)], i * 4);
    }
    ptr.sp *= 0.9;
    return u;
  }

  function common(prog, zoom, cx, cy, ptru) {
    const u = prog.u, S = field.S, sa = cfg.sun * Math.PI / 180;
    const lx = Math.cos(sa), ly = -Math.sin(sa);
    gl.useProgram(prog.p);
    u.u_res && gl.uniform2f(u.u_res, W, H); u.u_c && gl.uniform2f(u.u_c, cx, cy); u.u_zoom && gl.uniform1f(u.u_zoom, zoom);
    u.u_t && gl.uniform1f(u.u_t, t); u.u_wind && gl.uniform1f(u.u_wind, cfg.wind * (reduced ? 0.35 : 1)); u.u_S && gl.uniform1f(u.u_S, S);
    u.u_wdir && gl.uniform2f(u.u_wdir, Math.cos(0.5), Math.sin(0.5)); u.u_ptr && gl.uniform4fv(u.u_ptr, ptru);
    u.u_sdir && gl.uniform2f(u.u_sdir, -lx, -ly); u.u_ldir && gl.uniform2f(u.u_ldir, lx, ly); u.u_grow && gl.uniform1f(u.u_grow, grow);
    u.u_dpr && gl.uniform1f(u.u_dpr, dpr);
  }
  function scene(zoom, cx, cy, ptru, nDyn) {
    const box = field.box;
    common(P.ground, zoom, cx, cy, ptru);
    const g = P.ground.u;
    gl.uniform4f(g.u_box, box.x0, box.y0, box.x1, box.y1); gl.uniform1f(g.u_ft, box.ft); gl.uniform1f(g.u_round, box.round ? 1 : 0);
    gl.uniform1f(g.u_ground, GROUNDS.indexOf(cfg.ground));
    gl.disable(gl.BLEND);
    gl.bindVertexArray(P.triVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const nLeaves = countLeaves();
    // leaves, then grass shadows and grass, then flower shadows and flowers, then the life above it all
    common(P.sprite, zoom, cx, cy, ptru); gl.uniform1f(P.sprite.u.u_dyn, 0); gl.uniform1f(P.sprite.u.u_shadow, 0);
    gl.bindVertexArray(P.headVao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nLeaves);
    common(P.blade, zoom, cx, cy, ptru);
    gl.bindVertexArray(P.bladeVao);
    gl.uniform1f(P.blade.u.u_shadow, 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 10, bladeDraw);
    gl.uniform1f(P.blade.u.u_shadow, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 10, bladeDraw);
    common(P.sprite, zoom, cx, cy, ptru); gl.uniform1f(P.sprite.u.u_dyn, 0);
    gl.bindVertexArray(P.headVao);
    const nf = field.headCount - nLeaves;
    gl.uniform1f(P.sprite.u.u_shadow, 1); drawRange(nLeaves, nf);
    gl.uniform1f(P.sprite.u.u_shadow, 0); drawRange(nLeaves, nf);
    if (nDyn) {
      gl.uniform1f(P.sprite.u.u_dyn, 1); gl.bindVertexArray(P.dynVao);
      gl.uniform1f(P.sprite.u.u_shadow, 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nDyn);
      gl.uniform1f(P.sprite.u.u_shadow, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nDyn);
    }
    gl.bindVertexArray(null);
  }
  let leafCount = -1, leafFor = null;
  function countLeaves() { if (leafFor !== field) { leafFor = field; leafCount = 0; while (leafCount < field.headCount && field.heads[leafCount * 12 + 4] === 0) leafCount++; } return leafCount; }
  function drawRange(first, count) {
    if (count <= 0) return;
    // WebGL2 has no base-instance draw: re-point the instance attributes at the first flower
    gl.bindBuffer(gl.ARRAY_BUFFER, P.headInst);
    for (let i = 0; i < 3; i++) gl.vertexAttribPointer(i + 1, 4, gl.FLOAT, false, 48, first * 48 + i * 16);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    for (let i = 0; i < 3; i++) gl.vertexAttribPointer(i + 1, 4, gl.FLOAT, false, 48, i * 16);
  }

  function draw() {
    if (!gl || !field || gl.isContextLost()) return;
    const ptru = ptrUniform();
    const nDyn = packLife();
    if (nDyn) { gl.bindBuffer(gl.ARRAY_BUFFER, P.dynInst); gl.bufferSubData(gl.ARRAY_BUFFER, 0, parts.buf, 0, nDyn * 12); }
    lens.k += ((lens.on ? 1 : 0) - lens.k) * (reduced ? 1 : 0.22);
    if (ptr.in) { lens.x = ptr.x; lens.y = ptr.y; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
    scene(1, W / 2, H / 2, ptru, nDyn);
    if (lens.k > 0.02) {
      const R = Math.min(W, H) * 0.24 * (0.6 + 0.4 * lens.k);
      const f = fbo();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.f); gl.viewport(0, 0, f.w, f.h);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(Math.floor((lens.x - R * 1.1) * dpr), Math.floor((H - lens.y - R * 1.1) * dpr), Math.ceil(R * 2.2 * dpr), Math.ceil(R * 2.2 * dpr));
      scene(2, lens.x, lens.y, ptru, nDyn);
      gl.disable(gl.SCISSOR_TEST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(P.lens.p); const u = P.lens.u;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, f.t); gl.uniform1i(u.u_tex, 0);
      gl.uniform2f(u.u_lc, lens.x * dpr, (H - lens.y) * dpr); gl.uniform1f(u.u_lr, R * dpr); gl.uniform2f(u.u_resd, canvas.width, canvas.height);
      gl.enable(gl.BLEND); gl.bindVertexArray(P.triVao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
    }
  }

  function loop(now) {
    raf = 0;
    if (!alive) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    if (last && perf.n < 60) { perf.n++; if (perf.n > 10) perf.sum += (now - last); if (perf.n === 60) adapt(perf.sum / 50); }
    last = now;
    t += dt * (reduced ? 0.4 : 1);
    if (grow < 1) grow = Math.min(1, grow + dt / 9);
    if (cfg.bugs) stepLife(dt);
    draw();
    start();
  }
  function adapt(ms) {
    const lvl = ms > 40 ? 2 : ms > 24 ? 1 : 0;
    if (lvl > perf.level) { perf.level = lvl; resize(); }
  }
  function start() { if (!raf && alive && visible && onscreen && gl) { last = 0; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  const onVis = () => { visible = document.visibilityState !== "hidden"; visible ? start() : stop(); };
  document.addEventListener("visibilitychange", onVis);
  const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => { onscreen = es[es.length - 1].isIntersecting; onscreen ? start() : stop(); }) : null;
  io?.observe(el);
  let rt = 0;
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (!alive || !gl) return; resize(); seedBugs(); draw(); }, 60); }) : null;
  ro?.observe(el);
  const onReduced = () => { reduced = !!reducedMq?.matches; if (reduced) parts.petals = []; };
  reducedMq?.addEventListener?.("change", onReduced);
  const onLost = (e) => { e.preventDefault(); stop(); };
  const onRestored = () => { try { P = null; if (initGL()) { resize(); start(); } } catch (err) { fail(String(err)); } };
  canvas.addEventListener("webglcontextlost", onLost); canvas.addEventListener("webglcontextrestored", onRestored);

  try {
    if (cfg.renderer === "static" || !initGL()) { gl = null; fail(cfg.renderer === "static" ? "static" : "no-webgl2"); }
    else { resize(); seedBugs(); draw(); start(); }
  } catch (err) { gl = null; fail(String(err && err.message || err)); }

  return {
    get config() { return cfg; },
    get live() { return !!gl; },
    set(next) {
      const old = cfg; cfg = normalize({ ...cfg, ...next });
      if (!gl) return;
      if (old.seed !== cfg.seed || old.mix.join() !== cfg.mix.join() || old.density !== cfg.density || old.planter !== cfg.planter) { resize(); seedBugs(); }
      if (old.bugs !== cfg.bugs) { seedBugs(); if (!cfg.bugs) parts.petals = []; }
      if (cfg.grow && !old.grow) grow = 0;
      draw(); start();
    },
    /** Replay the meadow growing from bare soil. */
    regrow() { grow = 0; start(); },
    /** Show or hide the glass lens (at the pointer, or the middle). */
    lens(on) { lens.key = !!on; lens.on = !!on; if (on && !ptr.in) { lens.x = W / 2; lens.y = H / 2; } start(); },
    frame() { draw(); },
    /** The current frame as a PNG Blob (the canvas size, up to 2x your screen). */
    toPNG() {
      return new Promise((res, rej) => { if (!gl) return rej(new Error("no WebGL")); draw(); canvas.toBlob((b) => (b ? res(b) : rej(new Error("export failed"))), "image/png"); });
    },
    destroy() {
      alive = false; stop(); clearTimeout(rt); clearTimeout(lens.timer);
      canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointerleave", onLeave); canvas.removeEventListener("pointercancel", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost); canvas.removeEventListener("webglcontextrestored", onRestored);
      removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVis);
      io?.disconnect(); ro?.disconnect(); reducedMq?.removeEventListener?.("change", onReduced);
      if (gl && P) {
        for (const k of ["blade", "sprite", "ground", "lens"]) gl.deleteProgram(P[k].p);
        for (const k of ["meshBuf", "quadBuf", "triBuf", "bladeInst", "headInst", "dynInst"]) gl.deleteBuffer(P[k]);
        for (const k of ["bladeVao", "headVao", "dynVao", "triVao"]) gl.deleteVertexArray(P[k]);
        if (P.fbo) { gl.deleteFramebuffer(P.fbo.f); gl.deleteTexture(P.fbo.t); }
      }
      gl = null; P = null; canvas.remove(); fallbackEl?.remove();
    },
  };
}

/** <loam-meadow planter="long" mix="poppy,daisy" density="0.6" wind="0.45" sun="135" ground="tiles" seed="11" bugs grow> */
export const ATTRS = ["seed", "mix", "density", "wind", "sun", "planter", "ground", "bugs", "grow", "renderer"];
function defineElement() {
  if (typeof customElements === "undefined" || typeof HTMLElement === "undefined" || customElements.get("loam-meadow")) return;
  customElements.define("loam-meadow", class extends HTMLElement {
    static get observedAttributes() { return ATTRS; }
    read() { const o = {}; for (const a of ATTRS) if (this.hasAttribute(a)) o[a] = this.getAttribute(a); return o; }
    connectedCallback() {
      if (!this.shadowRoot) { const r = this.attachShadow({ mode: "open" }); r.innerHTML = '<style>:host{display:block;position:relative;min-height:240px;overflow:hidden}div{position:absolute;inset:0}</style><div></div>'; }
      this.meadow = mount(this.shadowRoot.querySelector("div"), this.read());
      this.shadowRoot.querySelector("div").addEventListener("error", (e) => this.dispatchEvent(new CustomEvent("error", { detail: e.detail })));
    }
    attributeChangedCallback() { this.meadow?.set(this.read()); }
    disconnectedCallback() { this.meadow?.destroy(); this.meadow = null; }
  });
}
defineElement();
