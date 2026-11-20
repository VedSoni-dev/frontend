export type FeltName = "green" | "blue" | "red" | "purple" | "teal" | "slate";
export interface BaizeConfig { label: string; done: string; felt: string; ball: number; hold: number; size: number; reset: number; sound: boolean }
export interface BaizeOptions extends Partial<BaizeConfig> { disabled?: boolean; onConfirm?: ((detail: { label: string; done: string }) => void) | null }
export interface Baize { readonly el: HTMLElement; readonly state: string; set(next: BaizeOptions): void; reset(): void; destroy(): void }
export interface BreakGeometry { L: number; M: number; D: number; cueFrom: number }
export const FELTS: Record<FeltName, string>;
export const BALL_COLORS: string[];
export const DEFAULTS: BaizeConfig;
export const ATTRS: string[];
export const RATIO: number;
export const CSS: string;
export function normalize(c?: unknown): BaizeConfig;
export function shade(hex: string, amt: number): string;
export function feltPalette(felt: string): { base: string; hi: string; lo: string; ink: string; lit: string };
export function ballLook(n: number): { n: number; color: string; stripe: boolean };
export function rolling(t: number, k: number): number;
export function breakAt(t: number, g: BreakGeometry): { cueX: number; cueOp: number; ballX: number; objX: number; objS: number; objOp: number; objDim: number; fill: number; done: number; check: number; events: { hit: number; clack: number; drop: number; end: number } };
export function play(kind: "hit" | "clack" | "drop" | "roll"): void;
export function mount(host: HTMLElement, opts?: BaizeOptions): Baize;
