import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normalizeAire, parseAireLatestDate, parseAireMapDate, parsePollutant } from '../src/providers/aireAd'

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

describe('aire.ad air quality', () => {
  it('normalizes map stations with coordinates and pollutants', () => {
    const out = normalizeAire(fixture('aire_ad_mapData.json'), fixture('aire_ad_stations.json'), { AD0942A: fixture('aire_ad_latestData_AD0942A.json') })
    expect(out.length).toBeGreaterThanOrEqual(3)
    const esc = out.find((e) => e.properties.stationId === 'AD0942A')!
    expect(esc.label).toBe('Escaldes-Engordany')
    expect(esc.properties.band).toBe('Excel·lent')
    expect(esc.properties.color).toBe('#46EDE3')
    expect(esc.properties.pollutants.map((p) => p.name)).toContain('NO2')
    expect(esc.timestamp).toBe('2026-10-06T08:00:00.000Z')
    const mobil = out.find((e) => e.properties.stationId === 'AD0940A')
    if (mobil) expect(mobil.label).toBe('Mòbil 1')
  })

  it('parses pollutant strings', () => {
    const p = parsePollutant({ pollutant: 'PM<sub>2.5</sub>', concentration: '6 &micro;g/m<sup>3</sup>', band: 'Excel·lent', color: '#46EDE3', period: 'Mitjana 24-hor&agrave;ria' })!
    expect(p).toMatchObject({ name: 'PM2.5', value: 6, unit: 'µg/m³', period: 'Mitjana 24-horària' })
  })

  it('parses dates in local time', () => {
    expect(parseAireMapDate('Dimarts 06/10/2026 a les 10h')).toBe('2026-10-06T08:00:00.000Z')
    expect(parseAireLatestDate('10/6/2026 10:00:00 AM')).toBe('2026-10-06T08:00:00.000Z')
    expect(parseAireLatestDate('1/15/2026 1:00:00 PM')).toBe('2026-01-15T12:00:00.000Z')
    expect(parseAireLatestDate('1/15/2026 12:30:00 AM')).toBe('2026-01-14T23:30:00.000Z')
  })
})
