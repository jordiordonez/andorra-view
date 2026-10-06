/** Presentation model for the entity detail panel (desktop side panel / mobile bottom sheet). */
export interface DetailField {
  label: string
  value: string
  /** Optional emphasis: 'good' | 'warn' | 'bad' colour the value. */
  tone?: 'good' | 'warn' | 'bad'
}

export interface EntityDetails {
  title: string
  subtitle?: string
  /** Badge such as "EN DIRECTE", "PREVISIÓ", "ESTIMAT". Freshness badge is added automatically. */
  badges?: string[]
  fields: DetailField[]
  image?: { url: string; alt: string; caption?: string; refreshMs?: number }
  links?: Array<{ label: string; url: string }>
  /** Caveat shown in small print (e.g. "Hotspot satel·litari, no confirmat com a incendi"). */
  note?: string
}

export const fmt = {
  num(v: unknown, digits = 0, unit = ''): string {
    return typeof v === 'number' && Number.isFinite(v)
      ? `${v.toLocaleString('ca-AD', { maximumFractionDigits: digits, minimumFractionDigits: digits })}${unit ? ` ${unit}` : ''}`
      : '—'
  },
  text(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : '—'
  },
}
