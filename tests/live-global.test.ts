import { describe, expect, it } from 'vitest'
import { firesFeed } from '../server/feeds/fires'
import { satellitesFeed } from '../server/feeds/satellites'
import { weatherAlertsFeed } from '../server/feeds/weatherAlerts'
import { emscQueryUrl, normalizeEmsc } from '../src/providers/earthquakes'

/** Hits real upstreams. Run with: LIVE=1 npx vitest run tests/live-global.test.ts */
const live = process.env.LIVE === '1' ? describe : describe.skip
const ctx = { env: {}, url: new URL('http://localhost/api') }

live('live global feeds', () => {
  it('satellites', async () => {
    const r = await satellitesFeed.load(ctx)
    console.log('satellites', r.entities.length, r.sourceUpdatedAt, r.warning ?? '')
    expect(r.entities.length).toBeGreaterThan(20)
  }, 40_000)

  it('fires', async () => {
    const r = await firesFeed.load(ctx)
    console.log('fires', r.entities.length, r.sourceUpdatedAt, r.warning ?? '')
    expect(Array.isArray(r.entities)).toBe(true)
  }, 60_000)

  it('weather alerts', async () => {
    const r = await weatherAlertsFeed.load(ctx)
    console.log('weather-alerts', r.entities.length, r.sourceUpdatedAt)
    expect(Array.isArray(r.entities)).toBe(true)
  }, 30_000)

  it('earthquakes (EMSC direct)', async () => {
    const res = await fetch(emscQueryUrl())
    const out = normalizeEmsc(res.status === 204 ? undefined : await res.json())
    console.log('earthquakes', out.length, out[0]?.label)
    expect(Array.isArray(out)).toBe(true)
  }, 30_000)
})
