import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { METEO_STATIONS } from '../src/data/meteoStations'
import { normalizeMeteoAd, parseMeteoInfo, parseMeteoValue, type MeteoVariable, type RawMeteoRow } from '../src/providers/meteoAd'

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

const TABS: Record<MeteoVariable, string> = {
  temperature: 'meteo_ad_DadesActuals_p0.json',
  precip24h: 'meteo_ad_DadesActuals_p3.json',
  wind: 'meteo_ad_DadesActuals_p4.json',
  humidity: 'meteo_ad_DadesActuals_p6.json',
  snowDepth: 'meteo_ad_DadesActuals_p10.json',
  pressureMsl: 'meteo_ad_DadesActuals_p12.json',
}
const tabs = Object.fromEntries(Object.entries(TABS).map(([k, f]) => [k, fixture(f) as RawMeteoRow[]])) as Record<MeteoVariable, RawMeteoRow[]>
const NOW = Date.parse('2026-10-06T10:05:00Z')

describe('meteo.ad observations', () => {
  it('parses the info fragment', () => {
    const r = parseMeteoInfo("<span style='color:#ffffff'>(1876m)<br>06/10/2026</span><br>09:54 (UTC) </span> - 11:54 (GMT+2)")
    expect(r).toEqual({ altitudeM: 1876, observedAt: '2026-10-06T09:54:00.000Z' })
  })

  it('parses value strings', () => {
    expect(parseMeteoValue('temperature', '12.2ºC')).toEqual({ temperatureC: 12.2 })
    expect(parseMeteoValue('temperature', '-3.4ºC')).toEqual({ temperatureC: -3.4 })
    expect(parseMeteoValue('wind', '197º | 0.5m/s')).toEqual({ windDirDeg: 197, windSpeedMs: 0.5 })
    expect(parseMeteoValue('humidity', '80%')).toEqual({ humidityPct: 80 })
    expect(parseMeteoValue('snowDepth', '0cm')).toEqual({ snowDepthCm: 0 })
    expect(parseMeteoValue('pressureMsl', '1016hPa')).toEqual({ pressureMslHPa: 1016 })
    expect(parseMeteoValue('precip24h', '0.3 mm')).toEqual({ precip24hMm: 0.3 })
    expect(parseMeteoValue('wind', 'n/d')).toEqual({})
  })

  it('joins all tabs with station coordinates', () => {
    const { entities, unlocated } = normalizeMeteoAd(tabs, METEO_STATIONS, { now: NOW })
    expect(entities.length).toBeGreaterThanOrEqual(25)
    expect(unlocated).toEqual([])
    const feda = entities.find((e) => e.properties.code === '99130001')!
    expect(feda.properties.temperatureC).toBeTypeOf('number')
    expect(feda.properties.windSpeedMs).toBeTypeOf('number')
    expect(feda.properties.snowDepthCm).toBe(0)
    expect(feda.timestamp).toMatch(/^2026-10-06T09:\d\d:00.000Z$/)
    for (const e of entities) {
      expect(e.position.latitude).toBeGreaterThan(42.4)
      expect(e.position.longitude).toBeGreaterThan(1.4)
    }
  })

  it('drops observations older than maxAge', () => {
    const later = Date.parse('2026-10-06T16:00:00Z')
    const { entities, staleDropped } = normalizeMeteoAd(tabs, METEO_STATIONS, { now: later })
    expect(entities).toEqual([])
    expect(staleDropped.length).toBeGreaterThan(0)
  })

  it('tolerates missing tabs and unknown stations', () => {
    const { entities, unlocated } = normalizeMeteoAd(
      { temperature: [['123456', '(10m)<br>06/10/2026</span><br>09:50 (UTC)', 'X', '', '5.0ºC']] },
      METEO_STATIONS,
      { now: NOW },
    )
    expect(entities).toEqual([])
    expect(unlocated).toEqual(['123456'])
  })
})
