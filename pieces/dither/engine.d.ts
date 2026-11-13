export type Pattern = "bayer4" | "bayer8" | "noise";
export type PaletteId = "ember" | "ash" | "blood" | "phosphor" | "ink" | "custom";
export interface Settings { dot: number; contrast: number; darkness: number; mix: number; pattern: Pattern; palette: PaletteId; accent: string }
export interface Grid { data: Uint8ClampedArray; width: number; height: number }
export const PATTERNS: Pattern[];
export const PALETTES: Record<Exclude<PaletteId, "custom">, { name: string; accent: string }>;
export const DEFAULTS: Settings;
export function clamp(v: number, a: number, b: number): number;
export function hexToRgb(hex: unknown): [number, number, number] | null;
export function lum(r: number, g: number, b: number): number;
export function ramp(accentHex: string): { c: number[]; l: number }[];
export function bayer(n: number): Float32Array;
export function threshold(pattern: Pattern, x: number, y: number): number;
export function normalize(o: unknown): Settings;
export function downscale(data: ArrayLike<number>, w: number, h: number, gw: number, gh: number): Float32Array;
export function tone(l: number, contrast: number, darkness: number): number;
export function dither(data: ArrayLike<number>, w: number, h: number, opts: Partial<Settings>, gw?: number, gh?: number): Grid;
export function upscale(grid: Grid, factor: number): Grid;
export function exportPlan(sw: number, sh: number, tw: number, th: number, dot: number): {
  crop: { x: number; y: number; w: number; h: number }; gw: number; gh: number; dot: number; width: number; height: number; offX: number; offY: number;
};
