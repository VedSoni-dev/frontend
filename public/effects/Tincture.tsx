"use client";
/*! tincture · liquid, marble, torn-print, glow and grain treatments for your own images · MIT
 *  https://github.com/VedSoni-dev/frontend/tree/main/pieces/effects · https://frontend.vedantsoni.com/effects
 *
 *  One file, no dependencies beyond React. Drop it into your app and use it:
 *    <Tincture src="/photo.jpg" preset="marble" warp={0.7} grain={0.4} torn="left" style={{ width: 480, height: 360 }} />
 *  Everything is one WebGL fragment shader: fbm domain-warp, posterize, tint, glow, film grain and a
 *  noise-displaced torn-paper edge. With no WebGL it falls back to the plain image.
 */
import { useEffect, useRef, type CSSProperties } from "react";

export type PresetId = "liquid" | "marble" | "torn" | "glow" | "gradient" | "posterize";
type RGB = [number, number, number];
/** The five values the sliders move, all 0..1. */
export interface Dials { warp: number; scale: number; grain: number; edge: number; tint: number }
export interface Treatment extends Dials {
  glow: number; poster: number; marble: number;
  /** 0: the image, 1: a grain mesh gradient from `palette` (no image needed). */
  mode: 0 | 1;
  color: RGB;
  palette: [RGB, RGB, RGB];
}

const DUSK: [RGB, RGB, RGB] = [[0.98, 0.96, 0.94], [0.62, 0.78, 0.96], [0.97, 0.66, 0.74]];
export const PRESETS: Record<PresetId, { label: string } & Treatment> = {
  liquid: { label: "Liquid", warp: 0.55, scale: 0.45, grain: 0.35, edge: 0.55, tint: 0.1, glow: 0.2, poster: 0.25, marble: 0.25, mode: 0, color: [1, 0.78, 0.86], palette: DUSK },
  marble: { label: "Marble", warp: 0.8, scale: 0.6, grain: 0.3, edge: 0.4, tint: 0.15, glow: 0.12, poster: 0, marble: 1, mode: 0, color: [0.72, 0.8, 1], palette: DUSK },
  torn: { label: "Torn print", warp: 0.35, scale: 0.5, grain: 0.5, edge: 0.85, tint: 0.06, glow: 0.1, poster: 0.5, marble: 0.35, mode: 0, color: [1, 0.9, 0.8], palette: DUSK },
  glow: { label: "Glow", warp: 0.25, scale: 0.35, grain: 0.3, edge: 0.3, tint: 0.25, glow: 0.95, poster: 0, marble: 0.2, mode: 0, color: [1, 0.72, 0.52], palette: DUSK },
  gradient: { label: "Grain gradient", warp: 0.6, scale: 0.4, grain: 0.55, edge: 0.3, tint: 0, glow: 0, poster: 0, marble: 0.6, mode: 1, color: [1, 1, 1], palette: DUSK },
  posterize: { label: "Posterize", warp: 0.3, scale: 0.5, grain: 0.25, edge: 0.5, tint: 0.1, glow: 0.05, poster: 0.9, marble: 0.3, mode: 0, color: [0.9, 0.85, 1], palette: DUSK },
};

const VERT = `attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;v.y=1.-v.y;gl_Position=vec4(a,0.,1.);}`;
const FRAG = `precision highp float;
varying vec2 v;
uniform sampler2D img;
uniform vec2 res, isz;
uniform float time, dpr, warp, scl, grain, edge, tint, glow, poster, marble, mode, seed, has;
uniform vec3 tcol, c1, c2, c3;
uniform vec4 torn;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
vec2 cover(vec2 u){float ra=res.x/res.y,ia=isz.x/isz.y;vec2 s=ra>ia?vec2(1.,ia/ra):vec2(ra/ia,1.);return (u-.5)*s+.5;}
vec3 tex(vec2 u){return texture2D(img,clamp(cover(u),.001,.999)).rgb;}
float rip(float along,float sd){return (n(vec2(along*.07,sd))*.65+n(vec2(along*.35,sd+7.))*.35)*edge*16.+.5;}
void main(){
  vec2 u=v; float t=time*.07;
  vec2 p=u*vec2(res.x/res.y,1.)*(1.+scl*5.)+seed*3.1;
  vec2 q=vec2(fbm(p+t),fbm(p+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p+4.*q+vec2(1.7,9.2)+t*.7),fbm(p+4.*q+vec2(8.3,2.8)-t*.6));
  vec2 d=mix(q-.5,r-.5,marble);
  vec2 w=u+d*warp*.5+vec2(sin(u.y*18.+t*9.+d.x*6.),cos(u.x*14.-t*7.+d.y*6.))*warp*.006;
  vec3 col;
  if(mode<.5&&has>.5){
    col=tex(w);
    if(glow>0.){vec3 b=vec3(0.);for(int i=0;i<12;i++){float a=float(i)*.5236;b+=tex(w+vec2(cos(a),sin(a))*.035);}b/=12.;
      vec3 hi=max(b-.35,0.)*1.6;col=1.-(1.-col)*(1.-hi*glow);col=mix(col,b,glow*.25);}
  }else{
    float g=smoothstep(.15,.85,r.x+d.y*.6),k=smoothstep(.25,.95,q.y+d.x*.8);
    col=mix(mix(c1,c2,g),c3,k*.85);
  }
  if(poster>0.){float l=mix(24.,3.,poster);col=floor(col*l+.5)/l;}
  float y=dot(col,vec3(.299,.587,.114));
  col=mix(col,tcol*(y*1.15+.12),tint);
  col+=(h(gl_FragCoord.xy+fract(time*7.31)*91.)-.5)*grain*.32;
  vec2 px=u*res/dpr, sz=res/dpr; float al=1., fr=0., e;
  if(torn.x>0.){e=rip(px.y,seed);al*=smoothstep(e-.8,e+.8,px.x);fr=max(fr,1.-smoothstep(e,e+3.,px.x));}
  if(torn.y>0.){e=rip(px.y,seed+3.);al*=smoothstep(e-.8,e+.8,sz.x-px.x);fr=max(fr,1.-smoothstep(e,e+3.,sz.x-px.x));}
  if(torn.z>0.){e=rip(px.x,seed+5.);al*=smoothstep(e-.8,e+.8,px.y);fr=max(fr,1.-smoothstep(e,e+3.,px.y));}
  if(torn.w>0.){e=rip(px.x,seed+9.);al*=smoothstep(e-.8,e+.8,sz.y-px.y);fr=max(fr,1.-smoothstep(e,e+3.,sz.y-px.y));}
  col=mix(col,vec3(.98,.97,.95),fr*min(edge*1.5,1.)*.85);
  gl_FragColor=vec4(clamp(col,0.,1.)*al,al);
}`;

export type Sides = string; // any of "left right top bottom", or "all"
export interface DrawOptions {
  /** Device pixels. */ w: number; h: number; dpr: number;
  time: number; treatment: Treatment; seed?: number; torn?: Sides;
  /** Use the uploaded image (else the gradient). */ image?: boolean;
}
export interface Renderer {
  canvas: HTMLCanvasElement;
  setImage(src: TexImageSource | null): void;
  draw(o: DrawOptions): boolean;
  destroy(): void;
}

function sidesOf(s = ""): [number, number, number, number] {
  const all = s.includes("all");
  return [all || s.includes("left") ? 1 : 0, all || s.includes("right") ? 1 : 0, all || s.includes("top") ? 1 : 0, all || s.includes("bottom") ? 1 : 0];
}

/** One WebGL context on `canvas`. Survives context loss: it rebuilds and re-uploads the last image. Null without WebGL. */
export function createRenderer(canvas: HTMLCanvasElement = document.createElement("canvas")): Renderer | null {
  let gl: WebGLRenderingContext | null = null;
  let prog: WebGLProgram | null = null;
  let tex: WebGLTexture | null = null;
  let source: TexImageSource | null = null;
  let size: [number, number] = [1, 1];
  const loc: Record<string, WebGLUniformLocation | null> = {};
  const opts: WebGLContextAttributes = { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true, antialias: false };

  function sh(type: number, src: string) {
    const s = gl!.createShader(type)!; gl!.shaderSource(s, src); gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) || "shader");
    return s;
  }
  function init(): boolean {
    gl = (canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts)) as WebGLRenderingContext | null;
    if (!gl) return false;
    prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    for (const k of ["img", "res", "isz", "time", "dpr", "warp", "scl", "grain", "edge", "tint", "glow", "poster", "marble", "mode", "seed", "has", "tcol", "c1", "c2", "c3", "torn"]) loc[k] = gl.getUniformLocation(prog, k);
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, val] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, val);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([200, 200, 210, 255]));
    if (source) upload(source);
    return true;
  }
  function upload(src: TexImageSource) {
    if (!gl) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    const s = src as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number };
    size = [s.naturalWidth || s.videoWidth || s.width || 1, s.naturalHeight || s.videoHeight || s.height || 1];
  }
  const onLost = (e: Event) => { e.preventDefault(); gl = null; };
  const onRestored = () => { try { init(); } catch { gl = null; } };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  try { if (!init()) return null; } catch { return null; }

  return {
    canvas,
    setImage(src) { source = src; if (src) upload(src); },
    draw(o) {
      if (!gl || gl.isContextLost()) return false;
      if (canvas.width !== o.w || canvas.height !== o.h) { canvas.width = o.w; canvas.height = o.h; }
      const T = o.treatment;
      gl.viewport(0, 0, o.w, o.h);
      gl.uniform1i(loc.img, 0);
      gl.uniform2f(loc.res, o.w, o.h); gl.uniform2f(loc.isz, size[0], size[1]);
      gl.uniform1f(loc.time, o.time); gl.uniform1f(loc.dpr, o.dpr);
      gl.uniform1f(loc.warp, T.warp); gl.uniform1f(loc.scl, T.scale); gl.uniform1f(loc.grain, T.grain);
      gl.uniform1f(loc.edge, T.edge); gl.uniform1f(loc.tint, T.tint); gl.uniform1f(loc.glow, T.glow);
      gl.uniform1f(loc.poster, T.poster); gl.uniform1f(loc.marble, T.marble); gl.uniform1f(loc.mode, T.mode);
      gl.uniform1f(loc.seed, o.seed ?? 1); gl.uniform1f(loc.has, o.image !== false && source ? 1 : 0);
      gl.uniform3fv(loc.tcol, T.color); gl.uniform3fv(loc.c1, T.palette[0]); gl.uniform3fv(loc.c2, T.palette[1]); gl.uniform3fv(loc.c3, T.palette[2]);
      gl.uniform4fv(loc.torn, sidesOf(o.torn));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return true;
    },
    destroy() {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

export interface TinctureProps extends Partial<Dials> {
  /** Your image (same origin, or served with CORS). Leave it out for the grain gradient. */
  src?: string;
  preset?: PresetId;
  /** Which edges tear: "left", "right top", "all"... */
  torn?: Sides;
  seed?: number;
  /** false: one still frame. Reduced-motion users always get a still frame. */
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}

/** A live treated image. Size it with CSS; it fills its box like object-fit: cover. */
export default function Tincture({ src, preset = "liquid", torn = "", seed = 1, animate = true, className, style, alt = "", ...dials }: TinctureProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ preset, torn, seed, animate, dials });
  live.current = { preset, torn, seed, animate, dials };
  const key = JSON.stringify([preset, torn, seed, animate, dials]);

  useEffect(() => {
    const canvas = ref.current!;
    const r = createRenderer(canvas);
    if (!r) { if (src) { canvas.style.background = `center / cover url("${src}")`; } return; }
    let raf = 0, visible = true, loaded = !src;
    const still = !live.current.animate || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    const frame = () => {
      raf = 0;
      const { preset: p, torn: tn, seed: sd, dials: d } = live.current;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      const T = { ...PRESETS[p], ...Object.fromEntries(Object.entries(d).filter(([, x]) => x !== undefined)) } as Treatment;
      if (loaded) r.draw({ w, h, dpr, time: still ? 4 : (performance.now() - t0) / 1000, treatment: T, seed: sd, torn: tn, image: !!src });
      if (!still && visible) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    if (src) {
      const im = new Image(); im.crossOrigin = "anonymous"; im.decoding = "async";
      im.onload = () => { r.setImage(im); loaded = true; kick(); };
      im.src = src;
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; if (visible) kick(); });
    io.observe(canvas);
    const onVis = () => { visible = !document.hidden; if (visible) kick(); };
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(kick); ro.observe(canvas);
    canvas.addEventListener("webglcontextrestored", kick);
    (canvas as unknown as { __kick?: () => void }).__kick = kick;
    kick();
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); r.destroy(); };
  }, [src]);

  useEffect(() => { (ref.current as unknown as { __kick?: () => void } | null)?.__kick?.(); }, [key]);

  return <canvas ref={ref} className={className} style={{ display: "block", width: "100%", height: "100%", ...style }} role="img" aria-label={alt} />;
}
