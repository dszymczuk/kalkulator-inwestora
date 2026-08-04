/**
 * Kolory palety są dobrane pod ciemne tło aplikacji. Na białym papierze część
 * z nich (żółty, róż, błękit) robi się nieczytelna, więc przed wydrukiem
 * przyciemniamy je tak długo, aż osiągną wymagany kontrast względem bieli.
 */

const WHITE_LUMINANCE = 1;

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;

  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

/** Luminancja względna wg WCAG 2.1. */
export function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrast koloru względem białego tła (1–21). */
export function contrastOnWhite(hex: string): number {
  return (WHITE_LUMINANCE + 0.05) / (relativeLuminance(parseHex(hex)) + 0.05);
}

/**
 * Przyciemnia kolor, aż osiągnie zadany kontrast na białym tle. Odcień zostaje
 * zachowany — skalujemy wszystkie kanały tym samym współczynnikiem.
 */
export function darkenForPrint(hex: string, minContrast = 4.5): string {
  const rgb = parseHex(hex);
  if (contrastOnWhite(hex) >= minContrast) return hex.toLowerCase();

  let factor = 1;
  for (let step = 0; step < 40; step += 1) {
    factor -= 0.025;
    const candidate: [number, number, number] = [rgb[0] * factor, rgb[1] * factor, rgb[2] * factor];
    if ((WHITE_LUMINANCE + 0.05) / (relativeLuminance(candidate) + 0.05) >= minContrast) {
      return toHex(candidate);
    }
  }

  return '#000000';
}
