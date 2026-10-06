import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { capPolygonToRing, normalizeMeteoalarm } from '../src/providers/weatherAlerts'

const raw = JSON.parse(readFileSync(new URL('./fixtures/meteoalarm_feeds-andorra.json', import.meta.url), 'utf8'))

describe('Meteoalarm adapter', () => {
  it('keeps alerts active at the given time, in Catalan, with polygons', () => {
    const all = normalizeMeteoalarm(raw, new Date('2026-10-01T16:00:00+02:00'))
    expect(all).toHaveLength(6) // 3 storm warnings active + 3 rain warnings not yet started
    const out = all.filter((a) => a.properties.status === 'active')
    expect(out).toHaveLength(3)
    for (const a of out) {
      expect(a.properties.language).toBe('ca-ES')
      expect(a.properties.status).toBe('active')
      expect(a.properties.severity).toBe('Moderate')
      expect(a.properties.awarenessLevel).toBe('yellow')
      expect(a.geometry?.type).toBe('Polygon')
      expect(a.position.latitude).toBeGreaterThan(42.4)
      expect(a.position.latitude).toBeLessThan(42.7)
    }
    expect(out.map((a) => a.properties.areaDesc).sort()).toEqual(['Zona centre', 'Zona nord', 'Zona sud'])
  })

  it('marks future alerts as upcoming and drops expired ones', () => {
    const upcoming = normalizeMeteoalarm(raw, new Date('2026-10-03T10:00:00+02:00'))
    expect(upcoming).toHaveLength(3)
    expect(upcoming.every((a) => a.properties.status === 'upcoming')).toBe(true)
    expect(normalizeMeteoalarm(raw, new Date('2026-10-06T12:00:00Z'))).toEqual([])
  })

  it('drops cancelled alerts and handles empty feeds', () => {
    const cancelled = { warnings: raw.warnings.map((w: { alert: object }) => ({ ...w, alert: { ...w.alert, msgType: 'Cancel' } })) }
    expect(normalizeMeteoalarm(cancelled, new Date('2026-10-01T16:00:00+02:00'))).toEqual([])
    expect(normalizeMeteoalarm({ warnings: [] })).toEqual([])
    expect(normalizeMeteoalarm({})).toEqual([])
  })

  it('converts CAP "lat,lon" polygons to closed [lon,lat] rings', () => {
    const ring = capPolygonToRing('42.5,1.5 42.6,1.6 42.5,1.7')
    expect(ring[0]).toEqual([1.5, 42.5])
    expect(ring.at(-1)).toEqual(ring[0])
    expect(ring).toHaveLength(4)
  })
})
