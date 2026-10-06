import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normalizePoints } from '../src/providers/mobilitat'
import { mergeParkings, normalizeAlvParking, occupancyLevel } from '../src/providers/parking'

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

describe('Andorra la Vella parking', () => {
  it('normalizes 36 car parks, 13 with counters', () => {
    const out = normalizeAlvParking(fixture('andorralavella_parking_occupancy.geojson'))
    expect(out.length).toBe(36)
    const live = out.filter((p) => p.properties.live)
    expect(live.length).toBe(13)
    const pc = out.find((p) => p.label === '9A Parc Central')!
    expect(pc.properties.free).toBe(386)
    expect(pc.properties.total).toBe(462)
    expect(pc.properties.occupancyPct).toBe(16)
    expect(pc.properties.pricePerHour).toBe(2.4)
    expect(pc.timestamp).toBeUndefined() // service publishes no update time
  })

  it('does not invent occupancy for car parks without counters', () => {
    const out = normalizeAlvParking(fixture('andorralavella_parking_occupancy.geojson'))
    for (const p of out.filter((x) => !x.properties.live)) {
      expect(p.properties.free).toBeUndefined()
      expect(occupancyLevel(p.properties)).toBe('unknown')
    }
  })

  it('rejects inconsistent counters', () => {
    const out = normalizeAlvParking({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [1.52, 42.5] }, properties: { ID_POI: 1, NOM: 'X', FREEOCCUPANCY: 50, TOTALOCCUPANCY: 10 } }],
    })
    expect(out[0].properties.live).toBe(false)
  })

  it('classifies occupancy levels', () => {
    const base = { live: true, origin: 'alv-live' as const }
    expect(occupancyLevel({ ...base, free: 0, total: 100 })).toBe('full')
    expect(occupancyLevel({ ...base, free: 10, total: 100 })).toBe('busy')
    expect(occupancyLevel({ ...base, free: 50, total: 100 })).toBe('free')
  })

  it('merges with Mobilitat car parks, deduping nearby ones', () => {
    const alv = normalizeAlvParking(fixture('andorralavella_parking_occupancy.geojson'))
    const { parkings } = normalizePoints(fixture('mobilitat_points_ca.json'))
    const merged = mergeParkings(alv, parkings)
    expect(merged.length).toBeLessThan(alv.length + parkings.length)
    expect(merged.length).toBeGreaterThanOrEqual(alv.length)
    expect(new Set(merged.map((m) => m.id)).size).toBe(merged.length)
  })
})
