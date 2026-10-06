/** "fa 37 s" style relative time (Catalan UI). */
export function timeAgo(iso: string | number | undefined, now = Date.now()): string {
  if (iso === undefined) return '—'
  const t = typeof iso === 'number' ? iso : Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const s = Math.round((now - t) / 1000)
  if (s < -60) return `d’aquí a ${formatDuration(-s)}`
  if (s < 5) return 'ara mateix'
  return `fa ${formatDuration(s)}`
}

export function formatDuration(seconds: number): string {
  const s = Math.abs(Math.round(seconds))
  if (s < 60) return `${s} s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 48) return m % 60 && h < 6 ? `${h} h ${m % 60} min` : `${h} h`
  return `${Math.round(h / 24)} dies`
}

export function formatLocalTime(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ca-AD', { timeZone: 'Europe/Andorra', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * Freshness check: data older than `maxAgeMs` must not be presented as live.
 * Returns 'fresh' | 'aging' (older than expected) | 'stale' (older than 3× expected).
 */
export function ageState(iso: string | undefined, expectedMs: number, now = Date.now()): 'fresh' | 'aging' | 'stale' | 'unknown' {
  if (!iso) return 'unknown'
  const age = now - Date.parse(iso)
  if (!Number.isFinite(age)) return 'unknown'
  if (age <= expectedMs * 1.5) return 'fresh'
  if (age <= expectedMs * 3) return 'aging'
  return 'stale'
}
