export type Paint = (w: number, h: number) => Uint8ClampedArray;
export const dusk: Paint;
export const glow: Paint;
export const ridges: Paint;
export const SAMPLES: { id: "dusk" | "glow" | "ridges"; name: string; paint: Paint }[];
