export type SkyTime = "dawn" | "noon" | "dusk" | "night";
export type SkyGlyphs = "ascii" | "dots" | "blocks";
export interface SkyConfig { v: 1; seed: number; time: SkyTime; cover: number; wind: number; speed: number; cell: number; glyphs: SkyGlyphs; trail: boolean; gust: boolean; fade: boolean }
export interface SkyPalette { sky: string[]; dot: string; cloud: string; edge: string; trail: string; page: string; stars: string | null }
export interface Sky { readonly config: SkyConfig; set(next: Partial<SkyConfig>): void; frame(): void; toPNG(w: number, h: number): Promise<Blob | null>; destroy(): void }
export const DEFAULTS: SkyConfig;
export const TIMES: SkyTime[];
export const GLYPH_SETS: SkyGlyphs[];
export const PALETTES: Record<SkyTime, SkyPalette>;
export const TRAIL_GLYPHS: string[];
export function normalize(c: unknown): SkyConfig;
export function mulberry32(a: number): () => number;
export function noise2(x: number, y: number, s: number): number;
export function decayFactor(dt: number, life: number): number;
export function glyphFor(vx: number, vy: number, prev?: number): number;
export function mount(el: HTMLElement, config?: Partial<SkyConfig>): Sky;
