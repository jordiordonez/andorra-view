// Live smoke tests against the real Andorran upstreams. Skipped unless LIVE=1.
import { describe, expect, it } from 'vitest'
import { airQualityFeed } from '../server/feeds/airQuality'
import { energyFeed } from '../server/feeds/energy'
import { mobilityPointsFeed, trafficIncidentsFeed, webcamImageFeed, webcamsFeed } from '../server/feeds/mobilitat'
import { weatherStationsFeed } from '../server/feeds/weatherStations'

const ctx = { env: {}, url: new URL('http://localhost/') }
const live = describe.skipIf(process.env.LIVE !== '1')

live('Andorran feeds (live)', () => {
  for (const feed of [trafficIncidentsFeed, webcamsFeed, mobilityPointsFeed, weatherStationsFeed, airQualityFeed, energyFeed]) {
    it(`${feed.id} responds`, async () => {
      const r = await feed.load(ctx)
      console.log(feed.id, r.entities.length, r.sourceUpdatedAt ?? '', r.warning ?? '')
      expect(r.source).toBe(feed.sourceId)
      if (feed.id !== 'energy') expect(r.entities.length).toBeGreaterThan(0)
    }, 30_000)
  }

  it('webcam-image serves only known cameras', async () => {
    const cams = await webcamsFeed.load(ctx)
    const id = String((cams.entities[0].properties as { cameraId: number }).cameraId)
    const img = await webcamImageFeed.load(ctx, id)
    expect(img.contentType).toMatch(/^image\//)
    expect(img.body.byteLength).toBeGreaterThan(1000)
    await expect(webcamImageFeed.load(ctx, '999999')).rejects.toThrow()
    await expect(webcamImageFeed.load(ctx, '../x')).rejects.toThrow()
  }, 40_000)
})
