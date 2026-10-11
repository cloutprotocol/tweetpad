import { Easing, interpolate, spring } from "remotion";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const glide = Easing.bezier(0.22, 1, 0.36, 1);
export const settle = Easing.bezier(0.65, 0, 0.35, 1);

/** 0→1 between frames a and b, eased. */
export const ramp = (f: number, a: number, b: number, ease = glide) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });
/** fade in over [a, a+d] and out over [b-d, b] */
export const inOut = (f: number, a: number, b: number, d = 10) =>
  Math.min(ramp(f, a, a + d), 1 - ramp(f, b - d, b, settle));
export const pop = (f: number, at: number, fps = 30) => spring({ frame: f - at, fps, config: { damping: 14, stiffness: 160, mass: 0.7 } });
/** typed text: chars per frame */
export const typed = (text: string, f: number, start: number, cpf = 0.6) =>
  text.slice(0, Math.max(0, Math.min(text.length, Math.floor((f - start) * cpf))));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
