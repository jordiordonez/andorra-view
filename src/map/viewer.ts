import {
  BoundingSphere,
  Cartesian3,
  Cartographic,
  Color,
  HeadingPitchRange,
  Math as CMath,
  Rectangle,
  Viewer,
  sampleTerrainMostDetailed,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { ANDORRA_BBOX, type CameraPreset, type LonLat } from '../config/geo'
import { createTerrain, defaultImageryId, defaultTerrainId, setImagery } from './basemaps'

export async function createViewer(container: HTMLElement): Promise<Viewer> {
  const viewer = new Viewer(container, {
    baseLayer: false,
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: true,
    // Render only when something changes: big battery/CPU win on mobile.
    requestRenderMode: true,
    maximumRenderTimeChange: 1,
    terrainProvider: await createTerrain(defaultTerrainId()),
  })

  const scene = viewer.scene
  scene.globe.enableLighting = false
  scene.globe.depthTestAgainstTerrain = true
  scene.globe.maximumScreenSpaceError = 1.5
  scene.globe.baseColor = Color.fromCssColorString('#0b0f14')
  scene.backgroundColor = Color.fromCssColorString('#05070a')
  scene.fog.enabled = true
  scene.fog.density = 1.2e-4
  if (scene.skyAtmosphere) scene.skyAtmosphere.show = true
  scene.screenSpaceCameraController.minimumZoomDistance = 150
  scene.screenSpaceCameraController.maximumZoomDistance = 25_000_000
  viewer.resolutionScale = Math.min(window.devicePixelRatio, 2) / window.devicePixelRatio
  // Move Cesium credits out of the way of the mobile bottom sheet; they remain visible (licence requirement).
  viewer.cesiumWidget.creditContainer.classList.add('cesium-credits')

  await setImagery(viewer, defaultImageryId())
  viewer.camera.setView({
    destination: Rectangle.fromDegrees(ANDORRA_BBOX.west - 0.3, ANDORRA_BBOX.south - 0.3, ANDORRA_BBOX.east + 0.3, ANDORRA_BBOX.north + 0.3),
  })
  return viewer
}

/** Fly to a point at a given range/heading/pitch, sampling terrain so the target sits on the ground. */
export async function flyToTarget(viewer: Viewer, target: LonLat & { height?: number }, range: number, heading = 0, pitch = -35, duration = 2.2) {
  const height = target.height ?? (await sampleHeight(viewer, target)) ?? 1200
  const center = Cartesian3.fromDegrees(target.longitude, target.latitude, height)
  const offset = new HeadingPitchRange(CMath.toRadians(heading), CMath.toRadians(pitch), range)
  // flyToBoundingSphere gives a smooth, interruptible flight with heading/pitch/range control.
  viewer.camera.flyToBoundingSphere(new BoundingSphere(center, 1), { offset, duration })
  viewer.scene.requestRender()
}

export function flyToPreset(viewer: Viewer, preset: CameraPreset) {
  return flyToTarget(viewer, preset.target, preset.range, preset.heading, preset.pitch)
}

async function sampleHeight(viewer: Viewer, p: LonLat): Promise<number | undefined> {
  try {
    const [c] = await sampleTerrainMostDetailed(viewer.terrainProvider, [Cartographic.fromDegrees(p.longitude, p.latitude)])
    return Number.isFinite(c.height) ? c.height : undefined
  } catch {
    return undefined
  }
}
