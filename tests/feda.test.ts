import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseLastEnergy, summarizeEnergy } from '../src/providers/feda'

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

describe('FEDA energy', () => {
  it('parses the last energy day by series', () => {
    const day = parseLastEnergy(fixture('feda_GetLastEnergy.json'))!
    expect(day.date).toBe('2026-10-05')
    expect(day.mwh.consumption).toBe(37.53)
    expect(day.mwh.importSpain).toBe(25.22)
    expect(day.mwh.hydro).toBe(0)
  })

  it('flags the partial day and reports the last complete one', () => {
    const s = summarizeEnergy(fixture('feda_GetLastEnergy.json'), fixture('feda_GetEnergyHistory_10.json'), [
      { data: '2026-10-04T00:00:00Z', consum: 33.1 },
      { data: '2026-10-05T00:00:00Z', consum: 0 },
    ])
    expect(s.latestPartial).toBe(true)
    expect(s.lastComplete?.date).toBe('2026-10-04')
    expect(s.lastComplete?.consumptionMWh).toBe(1164.15)
    expect(s.lastComplete?.productionMWh).toBe(33.1)
    expect(s.lastComplete?.selfSufficiencyPct).toBe(2.8)
    expect(s.consumptionHistory.map((d) => d.date)).not.toContain('2026-10-05')
  })

  it('works without history', () => {
    const s = summarizeEnergy(fixture('feda_GetLastEnergy.json'))
    expect(s.latest?.date).toBe('2026-10-05')
    expect(s.latestPartial).toBe(false)
    expect(s.lastComplete).toBeUndefined()
  })
})
