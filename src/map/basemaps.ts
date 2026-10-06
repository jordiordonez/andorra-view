import {
  ArcGisMapServerImageryProvider,
  CesiumTerrainProvider,
  Color,
  EllipsoidTerrainProvider,
  ImageryLayer,
  Ion,
  Rectangle,
  UrlTemplateImageryProvider,
  WebMercatorTilingScheme,
  createGooglePhotorealistic3DTileset,
  type Cesium3DTileset,
  type TerrainProvider,
  type Viewer,
} from 'cesium'
import { ANDORRA_BBOX, expandBBox } from '../config/geo'
import { AndorraTerrainProvider } from './terrain'

/**
 * Basemap provider abstraction. Imagery, terrain and the optional photorealistic mesh can each be
 * swapped without touching layers or UI. Keys come from Vite env vars and are browser-visible by
 * design (restrict them by HTTP referrer in the provider console).
 */

export const ENV = {
  cesiumIonToken: import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined,
  googleMapsKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined,
}

const GOVERN = 'https://sig.govern.ad/server/rest/services'
const andorraRect = (pad = 0.02) => {
  const b = expandBBox(ANDORRA_BBOX, pad)
  return Rectangle.fromDegrees(b.west, b.south, b.east, b.north)
}

export type ImageryId = 'ortho' | 'topo' | 'satellite'
export type TerrainId = 'govern-dtm' | 'cesium-world' | 'ellipsoid'

export interface ImageryOption {
  id: ImageryId
  name: string
  sources: string[]
}

export const IMAGERY_OPTIONS: ImageryOption[] = [
  { id: 'ortho', name: 'Ortofoto', sources: ['govern-ortho', 'eox-s2cloudless'] },
  { id: 'topo', name: 'Topogràfic', sources: ['govern-sig', 'eox-s2cloudless'] },
  { id: 'satellite', name: 'Sentinel-2', sources: ['eox-s2cloudless'] },
]

/** Global context imagery (10 m Sentinel-2 mosaic, non-commercial licence). */
function eoxProvider() {
  return new UrlTemplateImageryProvider({
    url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg',
    tilingScheme: new WebMercatorTilingScheme(),
    maximumLevel: 15,
    credit: 'Sentinel-2 cloudless 2024 by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)',
  })
}

/** Replace the imagery stack. Andorra-only official tiles sit on top of global context imagery. */
export async function setImagery(viewer: Viewer, id: ImageryId) {
  const layers = viewer.imageryLayers
  layers.removeAll(true)
  layers.add(new ImageryLayer(eoxProvider()))
  if (id === 'satellite') return
  const service = id === 'ortho' ? 'Mapa_Base_IDE_Orto_2022_WM' : 'Mapa_Base_IDE_WM_Color'
  try {
    const provider = await ArcGisMapServerImageryProvider.fromUrl(`${GOVERN}/Hosted/${service}/MapServer`, {
      enablePickFeatures: false,
    })
    // The tile cache only covers Andorra: 404s around the border are expected; a listener stops Cesium logging them.
    provider.errorEvent.addEventListener(() => {})
    // Govern tiles are filled with rgb(248,248,248) outside the border: key that colour out so Sentinel-2 shows through.
    layers.add(new ImageryLayer(provider, { rectangle: andorraRect(), colorToAlpha: Color.fromBytes(248, 248, 248), colorToAlphaThreshold: 0.004 }))
  } catch (err) {
    console.warn('[basemap] Govern tiles unavailable, keeping global imagery', err)
  }
}

export async function createTerrain(id: TerrainId): Promise<TerrainProvider> {
  try {
    if (id === 'cesium-world' && ENV.cesiumIonToken) {
      Ion.defaultAccessToken = ENV.cesiumIonToken
      return await CesiumTerrainProvider.fromIonAssetId(1, { requestVertexNormals: true })
    }
    if (id === 'govern-dtm') {
      return (await AndorraTerrainProvider.create(`${import.meta.env.BASE_URL}data/parishes.geojson`)) as unknown as TerrainProvider
    }
  } catch (err) {
    console.warn(`[basemap] terrain ${id} unavailable, using ellipsoid`, err)
  }
  return new EllipsoidTerrainProvider()
}

const params = new URLSearchParams(location.search)

export function defaultTerrainId(): TerrainId {
  const forced = params.get('terrain') as TerrainId | null
  if (forced && ['govern-dtm', 'cesium-world', 'ellipsoid'].includes(forced)) return forced
  return ENV.cesiumIonToken ? 'cesium-world' : 'govern-dtm'
}

export function defaultImageryId(): ImageryId {
  const forced = params.get('imagery') as ImageryId | null
  return forced && IMAGERY_OPTIONS.some((o) => o.id === forced) ? forced : 'ortho'
}

let photoreal: Cesium3DTileset | undefined

/** Optional Google Photorealistic 3D Tiles. Only offered when a key is configured. */
export async function setPhotorealistic(viewer: Viewer, on: boolean): Promise<boolean> {
  if (!ENV.googleMapsKey) return false
  if (on && !photoreal) {
    photoreal = await createGooglePhotorealistic3DTileset({ key: ENV.googleMapsKey })
    viewer.scene.primitives.add(photoreal)
  }
  if (photoreal) photoreal.show = on
  // The mesh already contains terrain + imagery; hide the globe to avoid z-fighting.
  viewer.scene.globe.show = !on
  return true
}
