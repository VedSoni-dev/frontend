import type { PresetId } from "./Tincture";
export type LayoutId = "split" | "poster" | "chips" | "ticket";
export type DialId = "warp" | "scale" | "grain" | "edge" | "tint";
export type Texts = typeof TEXTS;
export interface Look { v: number; layout: LayoutId; preset: PresetId; dials: Partial<Record<DialId, number>> | null; texts: { [K in LayoutId]?: Partial<Texts[K]> } }
export const VERSION: number;
export const PRESET_IDS: PresetId[];
export const LAYOUTS: { id: LayoutId; label: string }[];
export const DIALS: { id: DialId; label: string }[];
export const TEXTS: {
  split: { head: string; cta: string; note: string };
  poster: { head: string; label1: string; label2: string; label3: string };
  chips: { head: string };
  ticket: { head: string; sub: string; date: string; code: string };
};
export const DEFAULT_LOOK: Look;
export function normalize(raw: unknown): Look;
export function encodeHash(look: Look): string;
export function decodeHash(hash: string): Look | null;
