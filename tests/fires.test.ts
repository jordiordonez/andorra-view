import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ANDORRA_CENTER, haversineKm, RADII_KM } from '../src/config/geo'
import { normalizeFirms, parseCsv } from '../src/providers/fires'

const csv = readFileSync(new URL('./fixtures/firms_viirs_snpp_sample.csv', import.meta.url), 'utf8')

describe('FIRMS adapter', () => {
  it('parses the CSV header', () => {
    const rows = parseCsv(csv)
    expect(rows.length).toBeGreaterThan(3)
    expect(rows[0]).toHaveProperty('acq_time')
  })

  it('keeps only hotspots within the radius and normalizes fields', () => {
    const rows = parseCsv(csv)
    const out = normalizeFirms(rows, RADII_KM.fires)
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThan(rows.length) // far-away European rows dropped
    for (const f of out) {
      expect(haversineKm(ANDORRA_CENTER, f.position)).toBeLessThanOrEqual(RADII_KM.fires)
      expect(f.properties.instrument).toBe('VIIRS')
      expect(f.properties.satellite).toBe('Suomi NPP')
      expect(f.timestamp).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:00\.000Z$/)
      expect(['day', 'night']).toContain(f.properties.dayNight)
    }
    // newest first
    const times = out.map((f) => f.properties.acquiredAt)
    expect([...times].sort().reverse()).toEqual(times)
  })

  it('parses acquisition time HHMM as UTC and handles MODIS rows', () => {
    const rows = parseCsv(
      'latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight\n42.5,1.6,320.1,1,1,2026-10-05,0102,A,77,6.1NRT,290,12.5,N\n42.5,1.6,320.1,1,1,2026-10-05,0102,A,77,6.1NRT,290,12.5,N',
    )
    const out = normalizeFirms(rows, 50)
    expect(out).toHaveLength(1) // duplicate collapsed
    expect(out[0].timestamp).toBe('2026-10-05T01:02:00.000Z')
    expect(out[0].properties).toMatchObject({ instrument: 'MODIS', satellite: 'Aqua', confidence: '77', frpMw: 12.5, dayNight: 'night' })
  })

  it('returns [] for an empty file', () => {
    expect(normalizeFirms(parseCsv('latitude,longitude\n'), 150)).toEqual([])
  })
})
