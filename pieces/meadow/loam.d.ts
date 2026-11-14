export type Flower = "poppy" | "daisy" | "cornflower" | "buttercup" | "clover";
export type PlanterShape = "long" | "square" | "round";
export type Ground = "tiles" | "lawn" | "desk" | "plain";
export interface MeadowConfig { v: 1; seed: number; mix: Flower[]; density: number; wind: number; sun: number; planter: PlanterShape; ground: Ground; bugs: boolean; grow: boolean; renderer: "auto" | "static" }
export interface PlanterBox { x0: number; y0: number; x1: number; y1: number; ft: number; round: boolean; S: number }
export interface Field { box: PlanterBox; S: number; blades: Float32Array; bladeCount: number; heads: Float32Array; headCount: number; flowers: number[][] }
export interface Meadow { readonly config: MeadowConfig; readonly live: boolean; set(next: Partial<MeadowConfig>): void; regrow(): void; lens(on: boolean): void; frame(): void; toPNG(): Promise<Blob>; destroy(): void }
export const FLOWERS: Flower[];
export const PLANTERS: PlanterShape[];
export const GROUNDS: Ground[];
export const ATTRS: string[];
export const DEFAULTS: MeadowConfig;
export function normalize(c: unknown): MeadowConfig;
export function mulberry32(a: number): () => number;
export function planterBox(W: number, H: number, shape: PlanterShape): PlanterBox;
export function buildField(cfg: MeadowConfig, W: number, H: number): Field;
export function mount(el: HTMLElement, config?: Partial<MeadowConfig>): Meadow;
