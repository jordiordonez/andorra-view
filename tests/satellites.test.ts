import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ANDORRA_CENTER } from '../src/config/geo'
import { ALWAYS_SHOWN, computeSatState, normalizeCelestrak, satrecFromOmm, type OmmRecord } from '../src/providers/satellites'

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')) as OmmRecord[]
const stations = fixture('celestrak_stations.json')
const visual = fixture('celestrak_visual.json')
// Close to the fixtures' element epochs so SGP4 stays accurate.
const AT = new Date('2026-10-06T08:30:00Z')

describe('CelesTrak OMM adapter', () => {
  it('normalizes and deduplicates by NORAD id across groups', () => {
    const out = normalizeCelestrak({ stations, visual }, AT, ANDORRA_CENTER)
    const ids = out.map((e) => e.properties.noradId)
    expect(new Set(ids).size).toBe(ids.length)
    const iss = out.find((e) => e.properties.noradId === 25544)!
    expect(iss).toBeDefined()
    expect(iss.properties.groups).toContain('stations')
    expect(iss.type).toBe('satellite')
    expect(iss.timestamp).toMatch(/Z$/)
    expect(iss.properties.omm.OBJECT_NAME).toContain('ISS')
    expect(ALWAYS_SHOWN.has(25544)).toBe(true)
  })

  it('accepts 6-digit catalogue numbers (OMM only)', () => {
    const rec = { ...stations[0], NORAD_CAT_ID: 100882, OBJECT_NAME: 'TEST 6-DIGIT' }
    const out = normalizeCelestrak({ test: [rec] }, AT, ANDORRA_CENTER)
    expect(out[0]?.properties.noradId).toBe(100882)
  })

  it('propagates the ISS to a plausible LEO state', () => {
    const iss = stations.find((s) => Number(s.NORAD_CAT_ID) === 25544)!
    const state = computeSatState(satrecFromOmm(iss)!, AT, ANDORRA_CENTER)!
    expect(state.altitudeKm).toBeGreaterThan(350)
    expect(state.altitudeKm).toBeLessThan(460)
    expect(state.speedKms).toBeGreaterThan(7.4)
    expect(state.speedKms).toBeLessThan(7.9)
    expect(Math.abs(state.latitude)).toBeLessThanOrEqual(52)
    expect(state.elevationDeg).toBeGreaterThanOrEqual(-90)
    expect(state.elevationDeg).toBeLessThanOrEqual(90)
    expect(state.azimuthDeg).toBeGreaterThanOrEqual(0)
    expect(state.azimuthDeg).toBeLessThan(360)
  })

  it('skips malformed records', () => {
    const out = normalizeCelestrak({ bad: [{ OBJECT_NAME: 'X' } as unknown as OmmRecord] }, AT, ANDORRA_CENTER)
    expect(out).toEqual([])
  })
})
