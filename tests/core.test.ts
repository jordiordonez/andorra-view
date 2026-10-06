import { describe, expect, it, vi } from 'vitest'
import { ANDORRA_BBOX, ANDORRA_CENTER, CAMERA_PRESETS, distanceFromAndorraKm, expandBBox, haversineKm, inBBox } from '../src/config/geo'
import { DATA_SOURCES, getSource } from '../src/config/dataSources'
import { ageState, formatDuration, timeAgo } from '../src/core/time'
import { terrariumToHeights } from '../src/map/terrain'
import { normalize } from '../src/ui/search'

describe('geo config', () => {
  it('bbox filtering', () => {
    expect(inBBox(ANDORRA_CENTER.longitude, ANDORRA_CENTER.latitude, ANDORRA_BBOX)).toBe(true)
    expect(inBBox(2.17, 41.38, ANDORRA_BBOX)).toBe(false) // Barcelona
    expect(inBBox(1.3, 42.4, expandBBox(ANDORRA_BBOX, 0.2))).toBe(true)
  })

  it('haversine distances', () => {
    // Andorra la Vella → Barcelona ≈ 150 km
    const d = haversineKm({ longitude: 1.5212, latitude: 42.5069 }, { longitude: 2.1734, latitude: 41.3851 })
    expect(d).toBeGreaterThan(135)
    expect(d).toBeLessThan(145)
    expect(distanceFromAndorraKm(ANDORRA_CENTER)).toBe(0)
  })

  it('every place preset targets Andorra or its border', () => {
    for (const p of CAMERA_PRESETS) expect(inBBox(p.target.longitude, p.target.latitude, expandBBox(ANDORRA_BBOX, 0.02))).toBe(true)
  })
})

describe('source registry', () => {
  it('every source declares licence, attribution and freshness', () => {
    for (const s of Object.values(DATA_SOURCES)) {
      expect(s.license, s.id).toBeTruthy()
      expect(s.attribution, s.id).toBeTruthy()
      expect(['live', 'near-real-time', 'periodic', 'static', 'simulated']).toContain(s.freshness)
      if (s.freshness === 'static') expect(s.refreshInterval, s.id).toBe(0)
      else expect(s.refreshInterval, s.id).toBeGreaterThan(0)
    }
  })

  it('unlicensed sources are flagged as pending permission', () => {
    for (const s of Object.values(DATA_SOURCES)) if (s.licenseStatus === 'publicly-accessible') expect((s as { permissionPending?: boolean }).permissionPending, s.id).toBe(true)
  })

  it('nothing is marked simulated', () => {
    expect(Object.values(DATA_SOURCES).filter((s) => (s.freshness as string) === 'simulated')).toHaveLength(0)
    expect(getSource('nope')).toBeUndefined()
  })
})

describe('freshness', () => {
  const now = Date.parse('2026-10-06T10:00:00Z')
  it('classifies age against the expected refresh', () => {
    expect(ageState('2026-10-06T09:59:30Z', 60_000, now)).toBe('fresh')
    expect(ageState('2026-10-06T09:58:00Z', 60_000, now)).toBe('aging')
    expect(ageState('2026-10-06T09:50:00Z', 60_000, now)).toBe('stale')
    expect(ageState(undefined, 60_000, now)).toBe('unknown')
    expect(ageState('garbage', 60_000, now)).toBe('unknown')
  })
  it('formats relative times in Catalan', () => {
    expect(timeAgo('2026-10-06T09:59:23Z', now)).toBe('fa 37 s')
    expect(timeAgo('2026-10-06T09:58:00Z', now)).toBe('fa 2 min')
    expect(timeAgo(undefined, now)).toBe('—')
    expect(formatDuration(3 * 3600)).toBe('3 h')
  })
})

describe('search normalization', () => {
  it('is accent, case and punctuation insensitive', () => {
    expect(normalize('Sant Julià de Lòria')).toBe('sant julia de loria')
    expect(normalize('CG-2')).toBe(normalize('cg 2'))
    expect(normalize('CG-2')).toBe('cg2')
  })
})

describe('terrain decoding', () => {
  it('decodes Terrarium RGB into metres and resamples', () => {
    const w = 4
    const h = 4
    const px = new Uint8ClampedArray(w * h * 4)
    // height = R*256 + G + B/256 − 32768 → 1000 m = 33768 = 131*256 + 232
    for (let i = 0; i < w * h; i++) px.set([131, 232, 0, 255], i * 4)
    const out = terrariumToHeights(px, w, h, 5)
    expect(out).toHaveLength(25)
    for (const v of out) expect(v).toBeCloseTo(1000, 5)
  })
  it('clamps ocean/no-data', () => {
    const px = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255])
    expect(Math.min(...terrariumToHeights(px, 2, 2, 3))).toBe(-500)
  })
})

describe('layer lifecycle', () => {
  it('enable → load → render → disable, and isolates errors', async () => {
    const { Layer } = await import('../src/core/layer')
    const { health } = await import('../src/core/health')
    vi.stubGlobal('document', { hidden: false })
    let fail = false
    const rendered: number[] = []
    class TestLayer extends Layer {
      protected async load() {
        if (fail) throw new Error('boom')
        return { source: 'emsc', fetchedAt: new Date().toISOString(), entities: [{ id: 'emsc:1', type: 'earthquake' as const, label: 'q', position: { latitude: 42.5, longitude: 1.5 }, source: 'emsc', properties: {} }] }
      }
      protected render(e: unknown[]) {
        rendered.push(e.length)
      }
    }
    const layer = new TestLayer({ id: 't', title: 'T', group: 'emergency', sources: ['emsc'], refreshMs: 0 })
    ;(layer as unknown as { viewer: { scene: { requestRender(): void } } }).viewer = { scene: { requestRender() {} } }
    await layer.enable()
    expect(layer.state).toMatchObject({ enabled: true, loading: false, count: 1 })
    expect(layer.dataSource.show).toBe(true)
    expect(rendered).toEqual([1])
    expect(health.get('emsc').status).toBe('ok')

    fail = true
    await layer.refresh()
    expect(layer.state.error).toBe('boom')
    expect(layer.getEntities()).toHaveLength(1) // previous data kept
    expect(health.get('emsc').status).toBe('error')

    layer.disable()
    expect(layer.state.enabled).toBe(false)
    expect(layer.dataSource.show).toBe(false)
    vi.unstubAllGlobals()
  })
})
