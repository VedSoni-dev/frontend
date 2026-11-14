"use client";
/*! shoal · a 3D shoal of pixel-splat sharks you can spin · MIT · https://github.com/VedSoni-dev/frontend/tree/main/pieces/sharks
 * One file, no dependencies beyond React: raw WebGL2. Every shark is a procedural point cloud (our own models), drawn as
 * square splats into a low-res target and blown up nearest-neighbour, so it reads as pixel art until the camera tilts.
 * Look after stacked's (@stackedlol) "3D gaussian pixel sharks" post; no frames, sprites or colours from it are used.
 *
 *   <Shoal />                                   full-size canvas, fills its parent: a drop-in site background
 *   <Shoal pixelSize={6} count={8} speed={1} palette="deep" autoOrbit />
 *   const scene = createShoal(canvas, opts)     the same thing without React: scene.set({...}), scene.snapshot(), scene.dispose()
 */
import { useEffect, useRef, type CSSProperties } from "react";

export type PaletteId = "night" | "deep" | "mono" | "paper";
export const PALETTES: { id: PaletteId; label: string; bg: string }[] = [
  { id: "night", label: "Night water", bg: "#05080c" },
  { id: "deep", label: "Deep blue", bg: "#03112a" },
  { id: "mono", label: "Mono green", bg: "#020604" },
  { id: "paper", label: "Paper", bg: "#efe9dc" },
];
export interface ShoalOptions {
  /** 1 = smooth, 8 = chunky (CSS pixels per scene pixel). */
  pixelSize?: number;
  /** 1 to 10 sharks. */
  count?: number;
  /** Swim speed, 0 to 2. */
  speed?: number;
  palette?: PaletteId;
  /** The camera drifts top-down → side-on → back on its own until someone drags. */
  autoOrbit?: boolean;
  /** Drag, pinch, scroll and tap. Off = a pure background that ignores the pointer. */
  interactive?: boolean;
  /** A tap on a shark: its species name, or null for empty water. */
  onPick?: (species: string | null) => void;
}
export interface ShoalScene {
  set(o: Partial<ShoalOptions>): void;
  /** The current frame as a PNG (never a blank one). */
  snapshot(): Promise<Blob>;
  dispose(): void;
}
export const DEFAULTS: Required<Omit<ShoalOptions, "onPick">> = { pixelSize: 5, count: 10, speed: 1, palette: "night", autoOrbit: true, interactive: true };

// ---------- the cast: our own procedural sharks ----------
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
type Species = { name: string; len: number; girth: number; back: string; belly: string; head?: "hammer" | "goblin" | "wide"; pattern?: "dots" | "bands" | "tips"; dorsal: number; tail: number };
const SPECIES: Record<string, Species> = {
  whale: { name: "whale shark", len: 3.4, girth: 0.17, back: "#52748c", belly: "#1f2e3b", head: "wide", pattern: "dots", dorsal: 0.32, tail: 0.55 },
  hammer: { name: "hammerhead", len: 2.1, girth: 0.12, back: "#a3afb5", belly: "#3f4a51", head: "hammer", dorsal: 0.42, tail: 0.5 },
  zebra: { name: "zebra shark", len: 1.9, girth: 0.12, back: "#cfb07c", belly: "#5b4630", pattern: "bands", dorsal: 0.22, tail: 0.65 },
  nurse: { name: "nurse shark", len: 2.0, girth: 0.13, back: "#8c6b4a", belly: "#3e2c1e", dorsal: 0.24, tail: 0.42 },
  goblin: { name: "goblin shark", len: 2.0, girth: 0.11, back: "#cba8d0", belly: "#6a4f70", head: "goblin", dorsal: 0.18, tail: 0.5 },
  reef: { name: "grey reef shark", len: 1.6, girth: 0.11, back: "#8e9ca8", belly: "#363f47", pattern: "tips", dorsal: 0.34, tail: 0.5 },
};
/** The order sharks appear in as the count goes up: a mix at every count. */
const CAST = ["whale", "hammer", "zebra", "reef", "nurse", "goblin", "hammer", "reef", "hammer", "reef"];
const MAX = CAST.length;
/** Each shark's ring: radius, height, phase, speed factor. */
const RINGS: [number, number, number, number][] = [
  [1.7, 0.1, 0.0, 0.7], [3.6, 0.9, 1.1, 1.0], [4.6, -0.9, 2.6, 0.9], [2.9, -0.4, 4.1, 1.1], [5.3, 0.4, 5.0, 0.85],
  [4.1, 1.5, 3.3, 0.95], [3.2, -1.4, 0.5, 1.05], [5.8, -0.2, 2.0, 0.9], [2.4, 1.1, 5.7, 1.15], [4.9, -1.6, 4.6, 1.0],
];
// one vertex: pos(3) colour(3) meta(4: u along the body, shark id or -1, kind 0 shark/1 sediment/2 sparkle/3 glint, random)
const STRIDE = 10;

function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** All the points, built once from a fixed seed: the same scene on every load and in every PNG. */
function buildScene(): { data: Float32Array; ranges: [number, number][]; envStart: number; envCount: number } {
  const rnd = mulberry32(0x5ea5);
  const out: number[] = [];
  const push = (x: number, y: number, z: number, c: RGB, u: number, id: number, kind: number) => { out.push(x, y, z, c[0], c[1], c[2], u, id, kind, rnd()); };
  const ranges: [number, number][] = [];
  CAST.forEach((key, id) => {
    const s = SPECIES[key]; const L = s.len; const back = hex(s.back), belly = hex(s.belly), white = hex("#e9f1ee"), dark = hex("#14171a");
    const start = out.length / STRIDE;
    const radius = (u: number) => { const k = Math.min(u / 0.86, 1); return s.girth * L * Math.pow(Math.sin(Math.PI * Math.pow(k, 0.62)), 0.75) * (1 - 0.35 * u) + 0.004; };
    const n = Math.round(1700 * L);
    // body: points on an elliptical shell, more where the body is fatter; light back, dark belly
    for (let i = 0; i < n; i++) {
      let u = rnd(); if (rnd() > radius(u) / (s.girth * L)) u = rnd();
      const th = rnd() * Math.PI * 2; const r = radius(u);
      let ry = r * 0.82, rz = r;
      if (s.head === "wide" && u < 0.18) { rz *= 1.3; ry *= 0.75; }
      const y = Math.sin(th) * ry, z = Math.cos(th) * rz, x = L / 2 - u * L;
      const up = Math.sin(th) * 0.5 + 0.5;
      let c = mix(belly, back, Math.pow(up, 0.8));
      if (s.pattern === "dots" && up > 0.45 && u > 0.12 && u < 0.85) { const a = (u * 34) % 1, b = ((th / Math.PI) * 9) % 1; if (a < 0.28 && b < 0.3) c = white; }
      if (s.pattern === "bands" && Math.sin(u * 42) > 0.45 && up > 0.3) c = mix(c, hex("#3a2a1a"), 0.75);
      c = c.map((v) => v * (0.88 + rnd() * 0.24)) as RGB;
      push(x, y, z, c, u, id, 0);
    }
    // a triangle of points (a fin), with a colour from base to tip
    const tri = (a: number[], b: number[], cc: number[], m: number, tip: RGB | null) => {
      for (let i = 0; i < m; i++) {
        let p = rnd(), q = rnd(); if (p + q > 1) { p = 1 - p; q = 1 - q; }
        const x = a[0] + (b[0] - a[0]) * p + (cc[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * p + (cc[1] - a[1]) * q, z = a[2] + (b[2] - a[2]) * p + (cc[2] - a[2]) * q;
        let c = mix(belly, back, 0.75); if (tip && q > 0.7) c = tip;
        push(x, y, z, c.map((v) => v * (0.9 + rnd() * 0.2)) as RGB, Math.min(1, Math.max(0, (L / 2 - x) / L)), id, 0);
      }
    };
    const X = (u: number) => L / 2 - u * L;
    const tip = s.pattern === "tips" ? dark : null;
    const R0 = radius(0.38);
    tri([X(0.3), R0 * 0.8, 0], [X(0.5), R0 * 0.7, 0], [X(0.46), R0 + s.dorsal * L * 0.45, 0], Math.round(260 * L), tip); // first dorsal
    tri([X(0.68), radius(0.7) * 0.8, 0], [X(0.76), radius(0.75) * 0.7, 0], [X(0.75), radius(0.7) + 0.06 * L, 0], Math.round(60 * L), null); // second dorsal
    for (const side of [-1, 1]) tri([X(0.24), -R0 * 0.5, side * R0 * 0.6], [X(0.36), -R0 * 0.55, side * R0 * 0.5], [X(0.4), -R0 * 0.9, side * (R0 + 0.22 * L)], Math.round(200 * L), tip); // pectorals
    const tb = X(0.86), th = s.tail * L * 0.42;
    tri([tb, 0, 0], [tb - 0.06 * L, -0.02, 0], [tb - 0.2 * L, th, 0], Math.round(240 * L), tip); // upper caudal lobe
    tri([tb, 0, 0], [tb - 0.05 * L, 0.02, 0], [tb - 0.13 * L, -th * 0.55, 0], Math.round(130 * L), tip); // lower lobe
    if (s.head === "hammer") { // the T-bar head
      for (let i = 0; i < 520; i++) { const z = (rnd() * 2 - 1) * 0.2 * L, x = X(0.02 + rnd() * 0.06), y = (rnd() - 0.5) * 0.03 * L; push(x, y, z, mix(belly, back, y > 0 ? 0.95 : 0.3), 0.04, id, 0); }
      for (const side of [-1, 1]) push(X(0.05), 0.01, side * 0.2 * L, dark, 0.05, id, 0);
    } else if (s.head === "goblin") { // the long flat snout
      for (let i = 0; i < 260; i++) { const x = L / 2 + rnd() * 0.22 * L, z = (rnd() - 0.5) * 0.06 * L, y = 0.02 + (rnd() - 0.5) * 0.02 * L; push(x, y, z, mix(belly, back, 0.9), 0, id, 0); }
    }
    if (s.head !== "hammer") for (const side of [-1, 1]) push(X(0.07), radius(0.07) * 0.4, side * radius(0.07) * 0.95, dark, 0.07, id, 0); // eyes
    ranges.push([start, out.length / STRIDE - start]);
  });
  const envStart = out.length / STRIDE;
  // sediment: grey noise-clustered blobs low and around the edges (parallax as the camera turns)
  for (let b = 0; b < 40; b++) {
    const a = rnd() * Math.PI * 2, rr = 7.2 + rnd() * 5, cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, cy = -3.2 + rnd() * 1.6 + (rr > 9 ? rnd() * 3 : 0);
    const size = 0.4 + rnd() * 1.1, grey = 0.18 + rnd() * 0.22, m = Math.round(70 + size * 140);
    for (let i = 0; i < m; i++) {
      const g = Math.pow(rnd(), 0.6) * size, t = rnd() * Math.PI * 2, p = Math.acos(2 * rnd() - 1);
      const v = grey * (0.75 + rnd() * 0.5);
      push(cx + g * Math.sin(p) * Math.cos(t), cy + g * Math.cos(p) * 0.45, cz + g * Math.sin(p) * Math.sin(t), [v, v * 1.02, v * 1.06], 0, -1, 1);
    }
  }
  for (let i = 0; i < 500; i++) { const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 12, v = 0.1 + rnd() * 0.12; push(Math.cos(a) * rr, -3.6 - rnd() * 0.4, Math.sin(a) * rr, [v, v, v * 1.1], 0, -1, 1); } // the floor haze
  // sparkles: cyan pixels that twinkle, and a few plus-shaped glints
  for (let i = 0; i < 320; i++) { const a = rnd() * Math.PI * 2, rr = 1 + Math.sqrt(rnd()) * 8; push(Math.cos(a) * rr, (rnd() - 0.5) * 5, Math.sin(a) * rr, rnd() < 0.8 ? [0.45, 0.95, 1] : [0.9, 1, 1], 0, -1, 2); }
  for (let i = 0; i < 7; i++) { const a = rnd() * Math.PI * 2, rr = 2 + rnd() * 6; push(Math.cos(a) * rr, (rnd() - 0.5) * 4, Math.sin(a) * rr, [0.85, 1, 1], 0, -1, 3); }
  return { data: new Float32Array(out), ranges, envStart, envCount: out.length / STRIDE - envStart };
}

// ---------- matrices (column-major) ----------
function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function lookAt(e: number[], c: number[]) {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
  let xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xz /= l; // up = +y
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
}
function mul(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; }
  return o;
}

// ---------- shaders ----------
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos; layout(location=1) in vec3 a_col; layout(location=2) in vec4 a_meta;
uniform mat4 u_vp; uniform float u_t; uniform float u_swim; uniform float u_proj; uniform float u_count;
uniform vec4 u_ring[${MAX}]; uniform float u_burst; uniform float u_burstT; uniform float u_fade; uniform float u_sparkKeep;
out vec3 v_col; flat out float v_kind;
void main() {
  float id = a_meta.y, kind = a_meta.z, rnd = a_meta.w;
  vec3 col = a_col; vec3 w; float size;
  v_kind = kind;
  if (kind < 0.5) {
    if (id >= u_count) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; v_col = col; return; }
    vec4 r = u_ring[int(id)];
    float u = a_meta.x;
    // a travelling wave down the body, bigger toward the tail
    float bend = sin(u * 6.2 - u_swim * 5.5 * r.w + r.z * 3.0) * 0.22 * u * u;
    float ang = r.z + u_swim * 0.32 * r.w / max(r.x, 1.0) * 1.8;
    float h = r.y + 0.22 * sin(u_swim * 0.5 + r.z * 2.0);
    float a2 = ang + a_pos.x / r.x; // the body follows its ring
    float side = a_pos.z + bend;
    w = vec3(cos(a2) * (r.x + side), h + a_pos.y, sin(a2) * (r.x + side));
    size = 0.05 * (0.8 + 0.4 * rnd);
    col *= u_fade;
    if (abs(id - u_burst) < 0.5 && u_burstT < 1.0) {
      float k = 1.0 - u_burstT;
      if (rnd < 0.35) { col = mix(col, vec3(0.5, 1.0, 1.0), k); w += normalize(vec3(rnd - 0.17, fract(rnd * 7.3) - 0.5, fract(rnd * 13.1) - 0.5)) * k * 0.45 * fract(rnd * 31.7); }
      else col = mix(col, vec3(0.75, 1.0, 1.0), k * 0.35);
    }
  } else {
    w = a_pos; size = 0.07;
    if (kind > 1.5) {
      if (rnd > u_sparkKeep) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; v_col = col; return; }
      float tw = 0.5 + 0.5 * sin(u_t * (1.5 + rnd * 3.0) + rnd * 40.0);
      tw = smoothstep(0.35, 1.0, tw);
      col *= tw; size = kind > 2.5 ? 0.0 : 0.045;
      w.y += 0.15 * sin(u_t * 0.3 + rnd * 20.0);
    } else size = 0.09 * (0.7 + 0.6 * rnd);
  }
  vec4 p = u_vp * vec4(w, 1.0);
  gl_Position = p;
  gl_PointSize = kind > 2.5 ? 5.0 * smoothstep(0.2, 1.0, 0.5 + 0.5 * sin(u_t * 0.9 + rnd * 30.0)) : clamp(size * u_proj / p.w, 1.0, 64.0);
  v_col = col;
}`;
const FS = `#version 300 es
precision mediump float;
in vec3 v_col; flat in float v_kind; out vec4 o;
void main() {
  if (v_kind > 2.5) { vec2 q = abs(gl_PointCoord - 0.5) * 5.0; if (min(q.x, q.y) > 0.5) discard; }
  else if (v_kind > 1.5 && max(v_col.r, max(v_col.g, v_col.b)) < 0.06) discard;
  o = vec4(v_col, 1.0);
}`;
const BLIT_VS = `#version 300 es
out vec2 v_uv;
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); v_uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const BLIT_FS = `#version 300 es
precision mediump float;
in vec2 v_uv; uniform sampler2D u_tex; uniform int u_pal; uniform vec2 u_res; out vec4 o;
vec3 post(vec3 c, float n) { return floor(c * n + 0.5) / n; }
void main() {
  vec4 s = texture(u_tex, v_uv);
  float y = 0.5 + 0.5 * floor(v_uv.y * 8.0) / 8.0; // a faint stepped water gradient, darker below
  vec3 bg; vec3 c = s.rgb; float l = dot(c, vec3(0.3, 0.55, 0.15));
  if (u_pal == 1) { bg = mix(vec3(0.0, 0.03, 0.09), vec3(0.03, 0.1, 0.22), y); c = c * vec3(0.62, 0.86, 1.25) + vec3(0.0, 0.02, 0.06); }
  else if (u_pal == 2) { bg = mix(vec3(0.0, 0.015, 0.005), vec3(0.01, 0.05, 0.02), y); c = vec3(0.2, 1.0, 0.42) * pow(l, 0.85) * 1.15; }
  else if (u_pal == 3) { bg = mix(vec3(0.91, 0.88, 0.82), vec3(0.95, 0.93, 0.88), y); c = mix(vec3(0.95, 0.93, 0.88), vec3(0.07, 0.09, 0.13), clamp(l * 1.25 + 0.12, 0.0, 1.0)); c = mix(c, s.rgb * 0.6, 0.25); }
  else { bg = mix(vec3(0.0, 0.01, 0.02), vec3(0.02, 0.04, 0.06), y); }
  vec3 outc = s.a > 0.5 ? post(c, 6.0) : bg;
  o = vec4(outc, 1.0);
}`;
const PAL_INDEX: Record<PaletteId, number> = { night: 0, deep: 1, mono: 2, paper: 3 };

// ---------- the scene ----------
const DEG = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Mount the shoal on a canvas. Throws "webgl2" when the browser has no WebGL2 (show a still instead). */
export function createShoal(canvas: HTMLCanvasElement, init: ShoalOptions = {}): ShoalScene {
  const opts = { ...DEFAULTS, ...init } as Required<Omit<ShoalOptions, "onPick">> & { onPick?: ShoalOptions["onPick"] };
  opts.onPick = init.onPick;
  const scene = buildScene();
  let gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
  if (!gl) throw new Error("webgl2");
  type GLs = { prog: WebGLProgram; blit: WebGLProgram; vao: WebGLVertexArrayObject; vbo: WebGLBuffer; blitVao: WebGLVertexArrayObject; fbo: WebGLFramebuffer; tex: WebGLTexture; depth: WebGLRenderbuffer; loc: Record<string, WebGLUniformLocation | null>; fw: number; fh: number };
  let G: GLs | null = null;

  const compile = (g: WebGL2RenderingContext, vs: string, fs: string) => {
    const p = g.createProgram()!;
    for (const [type, src] of [[g.VERTEX_SHADER, vs], [g.FRAGMENT_SHADER, fs]] as const) {
      const s = g.createShader(type)!; g.shaderSource(s, src); g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS) && !g.isContextLost()) throw new Error("shader: " + g.getShaderInfoLog(s));
      g.attachShader(p, s); g.deleteShader(s);
    }
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS) && !g.isContextLost()) throw new Error("link: " + g.getProgramInfoLog(p));
    return p;
  };
  const setup = () => {
    const g = gl!;
    const prog = compile(g, VS, FS), blit = compile(g, BLIT_VS, BLIT_FS);
    const vao = g.createVertexArray()!; g.bindVertexArray(vao);
    const vbo = g.createBuffer()!; g.bindBuffer(g.ARRAY_BUFFER, vbo); g.bufferData(g.ARRAY_BUFFER, scene.data, g.STATIC_DRAW);
    g.enableVertexAttribArray(0); g.vertexAttribPointer(0, 3, g.FLOAT, false, STRIDE * 4, 0);
    g.enableVertexAttribArray(1); g.vertexAttribPointer(1, 3, g.FLOAT, false, STRIDE * 4, 12);
    g.enableVertexAttribArray(2); g.vertexAttribPointer(2, 4, g.FLOAT, false, STRIDE * 4, 24);
    const blitVao = g.createVertexArray()!;
    g.bindVertexArray(null);
    const loc: GLs["loc"] = {};
    for (const n of ["u_vp", "u_t", "u_swim", "u_proj", "u_count", "u_ring", "u_burst", "u_burstT", "u_fade", "u_sparkKeep"]) loc[n] = g.getUniformLocation(prog, n);
    for (const n of ["u_tex", "u_pal", "u_res"]) loc["b" + n] = g.getUniformLocation(blit, n);
    const tex = g.createTexture()!, depth = g.createRenderbuffer()!, fbo = g.createFramebuffer()!;
    G = { prog, blit, vao, vbo, blitVao, fbo, tex, depth, loc, fw: 0, fh: 0 };
  };
  const sizeTarget = (fw: number, fh: number) => {
    const g = gl!, s = G!;
    if (s.fw === fw && s.fh === fh) return;
    s.fw = fw; s.fh = fh;
    g.bindTexture(g.TEXTURE_2D, s.tex);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, fw, fh, 0, g.RGBA, g.UNSIGNED_BYTE, null);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.bindRenderbuffer(g.RENDERBUFFER, s.depth); g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT24, fw, fh);
    g.bindFramebuffer(g.FRAMEBUFFER, s.fbo);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, s.tex, 0);
    g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, s.depth);
    g.bindFramebuffer(g.FRAMEBUFFER, null);
  };
  setup();

  // camera: spherical orbit around the shoal
  const cam = { az: 35 * DEG, polar: 10 * DEG, radius: 12.5, vaz: 0, vpol: 0 };
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let t = 0, swim = 0, autoT = 0, idleAt = -1e9, last = performance.now(), raf = 0, running = true, visible = true, onscreen = true, lost = false, disposed = false;
  let fadeStart = -1, burst = -1, burstAt = -1e9, dprCap = 2, sparkKeep = 1, frames = 0, ftSum = 0, slowStreak = 0, fastStreak = 0;
  let lastVP = new Float32Array(16), cssW = 1, cssH = 1, prevNow = performance.now();

  const ringUniform = new Float32Array(MAX * 4);
  RINGS.forEach((r, i) => ringUniform.set(r, i * 4));

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width); cssH = Math.max(1, rect.height);
    const dpr = Math.min(dprCap, devicePixelRatio || 1);
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  };

  const render = () => {
    const g = gl; if (!g || !G || lost) return;
    resize();
    const dpr = canvas.width / cssW;
    const block = opts.pixelSize <= 1 ? 1 : opts.pixelSize * dpr;
    const fw = Math.max(1, Math.ceil(canvas.width / block)), fh = Math.max(1, Math.ceil(canvas.height / block));
    sizeTarget(fw, fh);
    const eye = [Math.sin(cam.polar) * Math.cos(cam.az) * cam.radius, Math.cos(cam.polar) * cam.radius, Math.sin(cam.polar) * Math.sin(cam.az) * cam.radius];
    const fov = 45 * DEG;
    lastVP = mul(perspective(fov, cssW / cssH, 0.1, 100), lookAt(eye, [0, -0.2, 0]));
    g.bindFramebuffer(g.FRAMEBUFFER, G.fbo); g.viewport(0, 0, fw, fh);
    g.clearColor(0, 0, 0, 0); g.clearDepth(1); g.enable(g.DEPTH_TEST); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
    g.useProgram(G.prog); g.bindVertexArray(G.vao);
    const L = G.loc;
    g.uniformMatrix4fv(L.u_vp, false, lastVP); g.uniform1f(L.u_t, t); g.uniform1f(L.u_swim, swim);
    g.uniform1f(L.u_proj, fh / (2 * Math.tan(fov / 2))); g.uniform1f(L.u_count, clamp(Math.round(opts.count), 1, MAX));
    g.uniform4fv(L.u_ring, ringUniform); g.uniform1f(L.u_burst, burst); g.uniform1f(L.u_burstT, clamp((t - burstAt) / 1.2, 0, 1));
    g.uniform1f(L.u_fade, fadeStart < 0 ? 1 : clamp((t - fadeStart) / 0.4, 0, 1)); g.uniform1f(L.u_sparkKeep, sparkKeep);
    g.drawArrays(g.POINTS, 0, scene.data.length / STRIDE);
    g.bindVertexArray(null);
    g.bindFramebuffer(g.FRAMEBUFFER, null); g.viewport(0, 0, canvas.width, canvas.height); g.disable(g.DEPTH_TEST);
    g.useProgram(G.blit); g.bindVertexArray(G.blitVao);
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, G.tex);
    g.uniform1i(L.bu_tex, 0); g.uniform1i(L.bu_pal, PAL_INDEX[opts.palette] ?? 0); g.uniform2f(L.bu_res, fw, fh);
    g.drawArrays(g.TRIANGLES, 0, 3);
    g.bindVertexArray(null);
  };

  const step = (now: number) => {
    raf = 0;
    if (!running || disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 20); last = now;
    // adaptive quality: fewer device pixels, then fewer sparkles, when frames run slow; back up after a long fast spell
    frames++; ftSum += now - prevNow; prevNow = now;
    if (frames >= 60) {
      const fps = 1000 / (ftSum / frames); frames = 0; ftSum = 0;
      if (fps < 40) { slowStreak++; fastStreak = 0; if (slowStreak >= 1) { slowStreak = 0; if (dprCap > 1) dprCap = dprCap > 1.5 ? 1.5 : 1; else sparkKeep = Math.max(0.3, sparkKeep - 0.35); } }
      else if (fps > 58) { fastStreak++; slowStreak = 0; if (fastStreak >= 3) { fastStreak = 0; if (sparkKeep < 1) sparkKeep = Math.min(1, sparkKeep + 0.35); else if (dprCap < 2) dprCap = dprCap < 1.5 ? 1.5 : 2; } }
    }
    t += dt; swim += dt * opts.speed;
    const dragging = pointers.size > 0;
    if (!dragging) {
      cam.az += cam.vaz * dt; cam.polar += cam.vpol * dt;
      const damp = Math.exp(-dt * 4); cam.vaz *= damp; cam.vpol *= damp;
      if (opts.autoOrbit && t - idleAt > 2) {
        autoT += dt;
        const ease = 1 - Math.exp(-dt * Math.min(1.6, (t - idleAt - 2) * 0.8 + 0.05));
        cam.az += dt * 0.12;
        const target = (10 + 70 * (0.5 - 0.5 * Math.cos((2 * Math.PI * autoT) / 9))) * DEG;
        cam.polar += (target - cam.polar) * ease;
        cam.radius += (12.5 - cam.radius) * ease * 0.15;
      }
    }
    cam.polar = clamp(cam.polar, 4 * DEG, 120 * DEG);
    render();
    raf = requestAnimationFrame(step);
  };
  const play = () => { if (!raf && running && visible && onscreen && !lost && !disposed) { last = prevNow = performance.now(); frames = 0; ftSum = 0; raf = requestAnimationFrame(step); } };
  const pause = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  // pointer: drag to orbit, pinch or scroll to zoom, tap to pick a shark
  const pointers = new Map<number, { x: number; y: number }>();
  let downAt = { x: 0, y: 0 }, moved = 0, pinch0 = 0, radius0 = 12.5, lastMove = 0;
  const interactiveOn = () => opts.interactive;
  const onDown = (e: PointerEvent) => {
    if (!interactiveOn()) return;
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { downAt = { x: e.clientX, y: e.clientY }; moved = 0; cam.vaz = 0; cam.vpol = 0; }
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); radius0 = cam.radius; moved = 99; }
    idleAt = t;
  };
  const onMove = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    moved = Math.max(moved, Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y));
    if (pointers.size === 1) {
      cam.az += dx * 0.0065; cam.polar -= dy * 0.0065;
      const now = performance.now(), k = 1000 / Math.max(8, now - lastMove); lastMove = now;
      cam.vaz = dx * 0.0065 * Math.min(k, 60); cam.vpol = -dy * 0.0065 * Math.min(k, 60);
    } else if (pointers.size === 2 && pinch0 > 0) {
      const [a, b] = [...pointers.values()]; cam.radius = clamp(radius0 * (pinch0 / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y))), 6, 30);
    }
    idleAt = t;
    if (!raf) render();
  };
  const onUp = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 0 && moved < 6) pick(e.clientX, e.clientY);
    if (performance.now() - lastMove > 80) { cam.vaz = 0; cam.vpol = 0; }
    idleAt = t;
  };
  const onWheel = (e: WheelEvent) => {
    if (!interactiveOn()) return;
    e.preventDefault(); cam.radius = clamp(cam.radius * Math.exp(e.deltaY * 0.0012), 6, 30); idleAt = t; if (!raf) render();
  };
  /** The CPU mirror of the shader's ring path: where each shark's middle is now, on screen. */
  const pick = (cx: number, cy: number) => {
    const rect = canvas.getBoundingClientRect(); const x = cx - rect.left, y = cy - rect.top;
    let best = -1, bestD = Infinity;
    const n = clamp(Math.round(opts.count), 1, MAX);
    for (let i = 0; i < n; i++) {
      const [R, H, ph, sp] = RINGS[i];
      const ang = ph + swim * 0.32 * sp / Math.max(R, 1) * 1.8, h = H + 0.22 * Math.sin(swim * 0.5 + ph * 2);
      const v = lastVP, wx = Math.cos(ang) * R, wz = Math.sin(ang) * R;
      const cxw = v[0] * wx + v[4] * h + v[8] * wz + v[12], cyw = v[1] * wx + v[5] * h + v[9] * wz + v[13], w = v[3] * wx + v[7] * h + v[11] * wz + v[15];
      if (w <= 0) continue;
      const sx = (cxw / w * 0.5 + 0.5) * rect.width, sy = (1 - (cyw / w * 0.5 + 0.5)) * rect.height;
      const reach = Math.max(28, (SPECIES[CAST[i]].len * 0.6 / w) * rect.height);
      const d = Math.hypot(sx - x, sy - y);
      if (d < reach && d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0) { burst = best; burstAt = t; }
    opts.onPick?.(best >= 0 ? SPECIES[CAST[best]].name : null);
    if (!raf) render();
  };

  const onLost = (e: Event) => { e.preventDefault(); lost = true; pause(); };
  const onRestored = () => { lost = false; G = null; try { setup(); render(); play(); } catch { /* the page shows Retry */ } };
  const onVis = () => { visible = document.visibilityState !== "hidden"; if (visible) play(); else pause(); };
  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(([en]) => { onscreen = en.isIntersecting; if (onscreen) play(); else pause(); }) : null;
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (!raf) render(); }) : null;

  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("webglcontextlost", onLost); canvas.addEventListener("webglcontextrestored", onRestored);
  document.addEventListener("visibilitychange", onVis);
  io?.observe(canvas); ro?.observe(canvas);

  if (reduced && init.autoOrbit === undefined) opts.autoOrbit = false;
  if (reduced && init.speed === undefined) opts.speed = 0.3;
  // the first frame now (no black flash), then the sharks fade in
  render(); fadeStart = 0; play();

  return {
    set(o) {
      Object.assign(opts, o);
      if ("onPick" in o) opts.onPick = o.onPick;
      if (o.autoOrbit) idleAt = -1e9;
      if (!raf) render();
    },
    async snapshot() {
      render();
      const out = document.createElement("canvas"); out.width = canvas.width; out.height = canvas.height;
      const g2 = out.getContext("2d", { willReadFrequently: true })!;
      const blank = () => {
        const d = g2.getImageData(0, 0, out.width, out.height).data; let lo = 765, hi = 0;
        for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const k = ((Math.floor((j + 0.5) / 16 * out.height) * out.width) + Math.floor((i + 0.5) / 16 * out.width)) * 4; const s = d[k] + d[k + 1] + d[k + 2]; lo = Math.min(lo, s); hi = Math.max(hi, s); }
        return hi - lo < 4 && hi < 6;
      };
      g2.drawImage(canvas, 0, 0);
      if (blank()) { render(); g2.drawImage(canvas, 0, 0); }
      if (blank()) throw new Error("The frame came out blank. Try again.");
      return await new Promise<Blob>((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't make the PNG."))), "image/png"));
    },
    dispose() {
      disposed = true; running = false; pause();
      canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("webglcontextlost", onLost); canvas.removeEventListener("webglcontextrestored", onRestored);
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect(); ro?.disconnect();
      const g = gl; if (g && G && !g.isContextLost()) {
        g.deleteProgram(G.prog); g.deleteProgram(G.blit); g.deleteBuffer(G.vbo); g.deleteVertexArray(G.vao); g.deleteVertexArray(G.blitVao);
        g.deleteFramebuffer(G.fbo); g.deleteTexture(G.tex); g.deleteRenderbuffer(G.depth);
      }
      G = null; gl = null;
    },
  };
}

/** The shoal as a full-size canvas: put it in any positioned box (or fixed behind your page) and it fills it. */
export default function Shoal({ className, style, ...o }: ShoalOptions & { className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ShoalScene | null>(null);
  useEffect(() => {
    try { scene.current = createShoal(ref.current!, o); } catch { scene.current = null; }
    return () => { scene.current?.dispose(); scene.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { scene.current?.set(o); }, [o.pixelSize, o.count, o.speed, o.palette, o.autoOrbit, o.interactive, o.onPick]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className={className} style={{ display: "block", width: "100%", height: "100%", background: "#05080c", ...style }} aria-label="A shoal of pixel sharks swimming in 3D" />;
}
