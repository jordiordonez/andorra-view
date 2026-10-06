import {
  ArcGISTiledElevationTerrainProvider,
  Credit,
  Ellipsoid,
  Event,
  HeightmapTerrainData,
  Math as CMath,
  Resource,
  TerrainProvider,
  WebMercatorTilingScheme,
  type Request,
  type TerrainData,
} from 'cesium'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

/**
 * Composite terrain:
 *  - inside Andorra, from zoom level GOVERN_MIN_LEVEL: the Govern d'Andorra 5 m DTM (ArcGIS LERC tiles),
 *  - everywhere else (and as fallback): Mapzen/AWS Terrarium tiles (EU-DEM / SRTM, ~30 m).
 * Both are Web Mercator 256 px pyramids, so tiles map 1:1. Skirts hide the small seams between them.
 */

const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const TERRARIUM_MAX_LEVEL = 14
const GOVERN_MIN_LEVEL = 11
const SIZE = 65

type Ring = number[][]

function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function makeContainment(fc: FeatureCollection<Polygon | MultiPolygon>) {
  const polygons: Ring[][] = []
  for (const f of fc.features) {
    if (f.geometry.type === 'Polygon') polygons.push(f.geometry.coordinates)
    else for (const p of f.geometry.coordinates) polygons.push(p)
  }
  return (lon: number, lat: number) =>
    polygons.some((rings) => pointInRing(lon, lat, rings[0]) && !rings.slice(1).some((h) => pointInRing(lon, lat, h)))
}

let canvas: OffscreenCanvas | HTMLCanvasElement | undefined
function readPixels(img: ImageBitmap | HTMLImageElement): Uint8ClampedArray {
  const w = img.width
  const h = img.height
  if (!canvas) canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h })
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, w, h).data
}

/** Decode a Terrarium PNG into a SIZE×SIZE height grid (bilinear resampling). Exported for tests. */
export function terrariumToHeights(px: Uint8ClampedArray, w: number, h: number, size = SIZE): Float32Array {
  const height = (x: number, y: number) => {
    const i = (Math.min(h - 1, y) * w + Math.min(w - 1, x)) * 4
    return px[i] * 256 + px[i + 1] + px[i + 2] / 256 - 32768
  }
  const out = new Float32Array(size * size)
  for (let r = 0; r < size; r++) {
    const fy = (r / (size - 1)) * (h - 1)
    const y0 = Math.floor(fy)
    const ty = fy - y0
    for (let c = 0; c < size; c++) {
      const fx = (c / (size - 1)) * (w - 1)
      const x0 = Math.floor(fx)
      const tx = fx - x0
      const top = height(x0, y0) * (1 - tx) + height(x0 + 1, y0) * tx
      const bottom = height(x0, y0 + 1) * (1 - tx) + height(x0 + 1, y0 + 1) * tx
      // Ocean/no-data in Terrarium is far below sea level; clamp to keep skirts sane.
      out[r * size + c] = Math.max(-500, top * (1 - ty) + bottom * ty)
    }
  }
  return out
}

export class AndorraTerrainProvider {
  readonly tilingScheme = new WebMercatorTilingScheme({ ellipsoid: Ellipsoid.WGS84 })
  readonly errorEvent = new Event()
  readonly credit = new Credit('Relleu: Govern d’Andorra (MDT 5 m) · Mapzen Terrain Tiles (EU-DEM, SRTM)')
  readonly hasWaterMask = false
  readonly hasVertexNormals = false
  readonly availability = undefined
  private readonly levelZeroError: number

  private constructor(
    private readonly govern: ArcGISTiledElevationTerrainProvider | undefined,
    private readonly insideAndorra: (lon: number, lat: number) => boolean,
  ) {
    this.levelZeroError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
      this.tilingScheme.ellipsoid,
      SIZE,
      this.tilingScheme.getNumberOfXTilesAtLevel(0),
    )
  }

  static async create(boundaryUrl: string): Promise<AndorraTerrainProvider> {
    let inside: (lon: number, lat: number) => boolean = () => false
    let govern: ArcGISTiledElevationTerrainProvider | undefined
    try {
      const [fc, provider] = await Promise.all([
        fetch(boundaryUrl).then((r) => r.json() as Promise<FeatureCollection<Polygon | MultiPolygon>>),
        ArcGISTiledElevationTerrainProvider.fromUrl('https://sig.govern.ad/server/rest/services/IDE/Andorra_DTM_5m_WGS84/ImageServer'),
      ])
      inside = makeContainment(fc)
      govern = provider
    } catch (err) {
      console.warn('[terrain] Govern DTM unavailable, using global terrain only', err)
    }
    return new AndorraTerrainProvider(govern, inside)
  }

  private useGovern(x: number, y: number, level: number): boolean {
    if (!this.govern || level < GOVERN_MIN_LEVEL) return false
    const r = this.tilingScheme.tileXYToRectangle(x, y, level)
    const pts: Array<[number, number]> = [
      [r.west, r.south],
      [r.east, r.south],
      [r.west, r.north],
      [r.east, r.north],
      [(r.west + r.east) / 2, (r.south + r.north) / 2],
    ]
    return pts.every(([lon, lat]) => this.insideAndorra(CMath.toDegrees(lon), CMath.toDegrees(lat)))
  }

  requestTileGeometry(x: number, y: number, level: number, request?: Request): Promise<TerrainData> | undefined {
    if (this.useGovern(x, y, level)) {
      const p = this.govern!.requestTileGeometry(x, y, level, request)
      if (!p) return undefined
      return p.catch(() => this.terrarium(x, y, level) ?? Promise.reject(new Error('terrain tile unavailable')))
    }
    return this.terrarium(x, y, level, request)
  }

  private terrarium(x: number, y: number, level: number, request?: Request): Promise<TerrainData> | undefined {
    if (level > TERRARIUM_MAX_LEVEL) return Promise.reject(new Error('beyond terrarium max level'))
    const resource = new Resource({ url: TERRARIUM.replace('{z}', String(level)).replace('{x}', String(x)).replace('{y}', String(y)), request })
    const img = resource.fetchImage({ preferImageBitmap: true })
    if (!img) return undefined
    return img.then((image) => {
      const px = readPixels(image as ImageBitmap | HTMLImageElement)
      return new HeightmapTerrainData({
        buffer: terrariumToHeights(px, image.width, image.height),
        width: SIZE,
        height: SIZE,
        childTileMask: this.childMask(x, y, level),
      })
    })
  }

  /** Bits: 1 = SW, 2 = SE, 4 = NW, 8 = NE (Cesium convention; tile y grows southwards). */
  private childMask(x: number, y: number, level: number): number {
    if (level < TERRARIUM_MAX_LEVEL) return 15
    const l = level + 1
    return (
      (this.useGovern(2 * x, 2 * y + 1, l) ? 1 : 0) |
      (this.useGovern(2 * x + 1, 2 * y + 1, l) ? 2 : 0) |
      (this.useGovern(2 * x, 2 * y, l) ? 4 : 0) |
      (this.useGovern(2 * x + 1, 2 * y, l) ? 8 : 0)
    )
  }

  getLevelMaximumGeometricError(level: number): number {
    return this.levelZeroError / (1 << level)
  }

  getTileDataAvailable(x: number, y: number, level: number): boolean | undefined {
    if (this.useGovern(x, y, level)) return this.govern!.getTileDataAvailable(x, y, level)
    return level <= TERRARIUM_MAX_LEVEL
  }

  loadTileDataAvailability(x: number, y: number, level: number): Promise<void> | undefined {
    if (this.useGovern(x, y, level)) return this.govern!.loadTileDataAvailability(x, y, level)
    return undefined
  }
}
