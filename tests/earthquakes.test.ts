import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { emscQueryUrl, normalizeEmsc } from '../src/providers/earthquakes'

const raw = JSON.parse(readFileSync(new URL('./fixtures/emsc.json', import.meta.url), 'utf8'))

describe('EMSC adapter', () => {
  it('normalizes FDSN JSON events', () => {
    const out = normalizeEmsc(raw)
    expect(out.length).toBeGreaterThan(0)
    const q = out[0]
    expect(q.type).toBe('earthquake')
    expect(q.id).toMatch(/^emsc:/)
    expect(q.properties.url).toContain('seismicportal.eu/eventdetails.html?unid=')
    expect(typeof q.properties.magnitude).toBe('number')
    expect(q.properties.distanceKm).toBeLessThanOrEqual(150)
    expect(q.position.altitude).toBeLessThanOrEqual(0)
    const times = out.map((e) => e.properties.time)
    expect([...times].sort().reverse()).toEqual(times)
  })

  it('filters by radius and tolerates empty (204) responses', () => {
    expect(normalizeEmsc(raw, 1).length).toBeLessThanOrEqual(normalizeEmsc(raw).length)
    expect(normalizeEmsc(undefined)).toEqual([])
  })

  it('builds the query URL with degrees radius and start time', () => {
    const url = new URL(emscQueryUrl(30, { longitude: 1.6, latitude: 42.5 }, 111.2, new Date('2026-10-06T00:00:00Z')))
    expect(url.searchParams.get('maxradius')).toBe('1.00')
    expect(url.searchParams.get('starttime')).toBe('2026-09-06T00:00:00')
    expect(url.searchParams.get('format')).toBe('json')
  })
})
