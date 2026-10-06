/**
 * Billboard icons generated as SVG data URIs (no external assets, crisp at any DPR).
 * Glyph paths are drawn on a 24×24 grid.
 */

export const GLYPHS = {
  plane: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z',
  satellite: 'M7 4 4 7l3 3 3-3zm10 10-3 3 3 3 3-3zM9.5 9.5l5 5 2-2-5-5zM15 4h5v5h-2V6h-3zM4 15h2v3h3v2H4z',
  camera: 'M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm8 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  warning: 'M12 3 2 20h20zm-1 6h2v6h-2zm0 8h2v2h-2z',
  works: 'M3 20h18v-2H3zm2-3h3l3-9h2l3 9h3L13 5h-2z',
  closed: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM6 11h12v2H6z',
  snow: 'M11 2h2v4l2-2 1.4 1.4L13 8.8V11h2.2l3.4-3.4L20 9l-2 2h4v2h-4l2 2-1.4 1.4-3.4-3.4H13v2.2l3.4 3.4L15 20l-2-2v4h-2v-4l-2 2-1.4-1.4 3.4-3.4V13H8.8l-3.4 3.4L4 15l2-2H2v-2h4L4 9l1.4-1.4L8.8 11H11V8.8L7.6 5.4 9 4l2 2z',
  parking: 'M6 3h7a5 5 0 0 1 0 10h-3v8H6zm4 4v2h3a1 1 0 0 0 0-2z',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
  bus: 'M5 4h14a1 1 0 0 1 1 1v12h-1v2h-3v-2H8v2H5v-2H4V5a1 1 0 0 1 1-1zm1 2v5h12V6zm1 7.5a1.5 1.5 0 1 0 0 .01zm10 0a1.5 1.5 0 1 0 0 .01z',
  thermo: 'M10 4a2 2 0 1 1 4 0v9.3a4 4 0 1 1-4 0z',
  fire: 'M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 1-6 1-8.5z',
  quake: 'M2 12h4l2-6 3 12 3-9 2 3h6v2h-7l-1-1.5-3 9-3-12-1 3.5H2z',
  air: 'M3 8h11a3 3 0 1 0-3-3h2a1 1 0 1 1 1 1H3zm0 4h15a3 3 0 1 1-3 3h2a1 1 0 1 0 1-1H3zm0 4h7v2H3z',
  hospital: 'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z',
  peak: 'M2 20 9 7l3 5 2-3 8 11z',
  ski: 'M4 18l16-8-1-2L3 16zm9-12a2 2 0 1 0 0-.01z',
  dot: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
} as const

export type GlyphName = keyof typeof GLYPHS

const cache = new Map<string, string>()

/** Round badge with a glyph: used for most point entities. */
export function badgeIcon(glyph: GlyphName, fill: string, opts: { size?: number; ring?: string; glyphColor?: string } = {}): string {
  const { size = 32, ring = 'rgba(5,7,10,0.85)', glyphColor = '#05070a' } = opts
  const key = `b|${glyph}|${fill}|${size}|${ring}|${glyphColor}`
  let url = cache.get(key)
  if (!url) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="${fill}" stroke="${ring}" stroke-width="2.5"/><g transform="translate(6 6) scale(0.8333)"><path d="${GLYPHS[glyph]}" fill="${glyphColor}"/></g></svg>`
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    cache.set(key, url)
  }
  return url
}

/** Bare glyph with a dark outline (aircraft, satellites) — rotated by the billboard. */
export function glyphIcon(glyph: GlyphName, fill: string, size = 28): string {
  const key = `g|${glyph}|${fill}|${size}`
  let url = cache.get(key)
  if (!url) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${GLYPHS[glyph]}" fill="${fill}" stroke="rgba(5,7,10,0.9)" stroke-width="1.2" paint-order="stroke"/></svg>`
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    cache.set(key, url)
  }
  return url
}

/** Shared palette (kept in sync with CSS tokens in styles.css). */
export const PALETTE = {
  accent: '#38bdf8',
  aircraft: '#fbbf24',
  satellite: '#c4b5fd',
  incident: '#f97316',
  closure: '#ef4444',
  works: '#f59e0b',
  info: '#38bdf8',
  webcam: '#e2e8f0',
  parking: '#3b82f6',
  ev: '#22c55e',
  bus: '#a3e635',
  weather: '#67e8f9',
  fire: '#ef4444',
  quake: '#e879f9',
  air: '#34d399',
  hospital: '#f43f5e',
  muted: '#94a3b8',
} as const
