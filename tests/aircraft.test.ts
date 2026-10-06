import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AIRSPACE_BBOX, ANDORRA_BBOX, inBBox } from '../src/config/geo'
import { normalizeAdsbLol, normalizeOpenSky } from '../src/providers/aircraft'

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

describe('aircraft adapters', () => {
  it('normalizes adsb.lol readsb JSON and filters to the bbox', () => {
    const raw = fixture('adsblol.json')
    const out = normalizeAdsbLol(raw, AIRSPACE_BBOX)
    expect(out.length).toBeGreaterThan(0)
    for (const a of out) {
      expect(a.type).toBe('aircraft')
      expect(a.id).toMatch(/^adsb-lol:[0-9a-f]{6}$/)
      expect(inBBox(a.position.longitude, a.position.latitude, AIRSPACE_BBOX)).toBe(true)
      expect(a.timestamp).toMatch(/^\d{4}-\d\d-\d\dT/)
      // Registration is intentionally dropped.
      expect(a.properties).not.toHaveProperty('r')
    }
    const first = out[0].properties
    if (first.altitudeM !== undefined) expect(first.altitudeM).toBeGreaterThan(0)
  })

  it('drops aircraft outside the requested bbox', () => {
    const raw = fixture('adsblol.json')
    expect(normalizeAdsbLol(raw, ANDORRA_BBOX).length).toBeLessThanOrEqual(normalizeAdsbLol(raw, AIRSPACE_BBOX).length)
  })

  it('converts adsb.lol units (ft → m, kt → km/h)', () => {
    const out = normalizeAdsbLol(
      { now: 1_700_000_000_000, ac: [{ hex: 'abc123', flight: 'TEST1  ', lat: 42.5, lon: 1.5, alt_baro: 10000, gs: 100, track: 90, seen_pos: 2 }] },
      ANDORRA_BBOX,
    )
    expect(out).toHaveLength(1)
    expect(out[0].label).toBe('TEST1')
    expect(out[0].properties.altitudeM).toBe(3048)
    expect(out[0].properties.speedKmh).toBe(185)
    expect(out[0].timestamp).toBe(new Date(1_700_000_000_000 - 2000).toISOString())
  })

  it('handles ground and missing positions', () => {
    const out = normalizeAdsbLol(
      { now: Date.now(), ac: [{ hex: 'a1', lat: 42.5, lon: 1.5, alt_baro: 'ground' }, { hex: 'a2' }, { hex: '~tisb', lat: 42.5, lon: 1.5 }] },
      ANDORRA_BBOX,
    )
    expect(out.map((a) => a.properties.icao24)).toEqual(['a1'])
    expect(out[0].properties.onGround).toBe(true)
    expect(out[0].properties.altitudeM).toBeUndefined()
  })

  it('normalizes OpenSky state vectors', () => {
    const raw = fixture('opensky.json')
    const out = normalizeOpenSky(raw, AIRSPACE_BBOX)
    expect(out.length).toBeGreaterThan(0)
    expect(out[0].source).toBe('opensky')
    expect(out[0].properties.icao24).toMatch(/^[0-9a-f]{6}$/)
  })
})
