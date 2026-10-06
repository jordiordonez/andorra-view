import { CAMERA_PRESETS } from '../config/geo'
import { createViewer, flyToPreset } from '../map/viewer'

export async function startApp(root: HTMLElement) {
  const viewer = await createViewer(root.querySelector<HTMLElement>('#map')!)
  ;(window as unknown as { viewer: unknown }).viewer = viewer
  await flyToPreset(viewer, CAMERA_PRESETS[0])
}
