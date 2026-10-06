import { readFileSync } from 'node:fs'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'
import { andorraDate, normalizeEaws } from '../src/providers/avalanche'

const regions = JSON.parse(readFileSync(new URL('../public/data/eaws-ad-regions.geojson', import.meta.url), 'utf8')) as FeatureCollection<Polygon | MultiPolygon>
const subset = JSON.parse(readFileSync(new URL('./fixtures/eaws_ratings_2026-01-15_AD.json', import.meta.url), 'utf8'))
const ratings = { maxDangerRatings: subset.AD_subset as Record<string, number> }

describe('EAWS avalanche adapter', () => {
  it('joins ratings with the three Andorran micro-regions', () => {
    const out = normalizeEaws(ratings, regions, '2026-01-15')
    expect(out.map((z) => z.properties.regionId).sort()).toEqual(['AD-01', 'AD-02', 'AD-03'])
    for (const z of out) {
      expect(z.properties.level).toBe(3)
      expect(z.properties.levelName).toBe('Marcat')
      expect(z.geometry).toBeDefined()
      expect(z.position.latitude).toBeGreaterThan(42.4)
    }
    expect(out.find((z) => z.properties.regionId === 'AD-02')?.properties.regionName).toBe('Àrea Central')
  })

  it('treats 0 / missing ratings as no bulletin (off-season)', () => {
    expect(normalizeEaws({ maxDangerRatings: { 'AD-01': 0, 'AD-02': 0, 'AD-03': 0 } }, regions, '2026-10-06')).toEqual([])
    expect(normalizeEaws(undefined, regions, '2026-10-06')).toEqual([])
  })

  it('computes the date in Europe/Andorra', () => {
    expect(andorraDate(new Date('2026-01-14T23:30:00Z'))).toBe('2026-01-15')
    expect(andorraDate(new Date('2026-07-14T21:59:00Z'))).toBe('2026-07-14')
  })
})
