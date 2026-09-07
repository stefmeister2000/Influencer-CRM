/**
 * Per-team brand color. Each team picks ONE hex color (their brand's primary
 * color); we derive a full 50-700 tint/shade scale from it and expose it as
 * CSS custom properties that override the app's default palette for that
 * team's session only (see brandStyleTag()). This is what makes the same
 * software show different colors per company instead of one hardcoded theme.
 */

// The app's original hand-tuned blue scale — used byte-for-byte when a team
// hasn't picked a color, so nobody sees a visual change until they opt in.
const DEFAULT_SCALE: Record<number, [number, number, number]> = {
  50: [239, 246, 255], 100: [219, 234, 254], 200: [191, 219, 254], 300: [147, 197, 253],
  400: [96, 165, 250], 500: [59, 130, 246], 600: [37, 99, 235], 700: [29, 78, 216],
};

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

const TINT_LIGHTNESS: Record<number, number> = { 50: 96, 100: 91, 200: 82, 300: 70, 400: 56, 500: 48 };
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700] as const;

/** Derive the {50..700} scale (as RGB triplets) from one input hex color. */
export function brandScaleFromHex(hex: string): Record<(typeof STEPS)[number], [number, number, number]> {
  const rgb = hexToRgb(hex);
  if (!rgb) return DEFAULT_SCALE as Record<(typeof STEPS)[number], [number, number, number]>;
  const [h, s, l] = rgbToHsl(...rgb);
  const sat = Math.max(s, 35); // keep low-saturation picks from looking washed out
  const scale: Record<number, [number, number, number]> = {};
  for (const step of [50, 100, 200, 300, 400, 500] as const) {
    scale[step] = hslToRgb(h, step <= 200 ? Math.min(sat, 55) : sat, TINT_LIGHTNESS[step]);
  }
  scale[600] = rgb; // exactly what the team picked
  scale[700] = hslToRgb(h, sat, Math.max(l - 12, 12));
  return scale as Record<(typeof STEPS)[number], [number, number, number]>;
}

/** CSS custom-property declarations for one team's brand scale. */
export function brandCssVars(hex: string | null | undefined): string {
  const scale = hex?.trim() ? brandScaleFromHex(hex) : (DEFAULT_SCALE as Record<(typeof STEPS)[number], [number, number, number]>);
  return STEPS.map((step) => `--brand-${step}:${scale[step].join(" ")};`).join("");
}

export function isValidHexColor(hex: string): boolean {
  return hexToRgb(hex) !== null;
}
