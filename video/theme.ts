/**
 * Shared visual language for the finance documentary look.
 *
 * Goal: premium animated financial documentary, not PowerPoint. Restrained
 * palette, one accent, strong typographic hierarchy, generous safe areas.
 */
export const THEME = {
  bg: '#0e1116',
  bgWarm: '#12161d',
  panel: '#181d26',
  ink: '#f2f4f7',
  inkDim: '#9aa4b2',
  accent: '#2fbf71', // money green
  accentDim: '#1d7a48',
  warn: '#e5484d', // expense red
  gold: '#e6b450',
  gridLine: 'rgba(255,255,255,0.08)',
  fontDisplay: '"Archivo", "Arial Black", system-ui, sans-serif',
  fontBody: '"Inter", Arial, system-ui, sans-serif',
  fontMono: '"IBM Plex Mono", ui-monospace, monospace',
} as const;

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/** YouTube-safe title/action margins (approx 5% / 10%). */
export const SAFE = {
  x: 160,
  y: 100,
} as const;

export function formatMoney(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
