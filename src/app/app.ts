import { Cartesian3, ScreenSpaceEventHandler, ScreenSpaceEventType, defined, type Entity } from 'cesium'
import { CAMERA_PRESETS, type CameraPreset } from '../config/geo'
import { LayerManager, type Selection } from '../core/layerManager'
import { createLayers } from '../layers'
import { defaultImageryId, setImagery, setPhotorealistic } from '../map/basemaps'
import { createViewer, flyToPreset, flyToTarget } from '../map/viewer'
import { createDetailPanel } from '../ui/detailPanel'
import { createEnergyCard } from '../ui/energyCard'
import { createLayerPanel } from '../ui/layerPanel'
import { createPresetBar } from '../ui/presets'
import { createSearch, type SearchResult } from '../ui/search'
import { openStatusPanel } from '../ui/statusPanel'
import { createTopbar } from '../ui/topbar'
import { createAppTools } from './tools'

export async function startApp(root: HTMLElement) {
  const viewer = await createViewer(root.querySelector<HTMLElement>('#map')!)
  const manager = new LayerManager(viewer)
  for (const layer of createLayers()) await manager.register(layer)

  const isMobile = () => window.matchMedia('(max-width: 760px)').matches

  const focus = ({ entity }: Selection) => {
    const range = entity.type === 'aircraft' ? Math.max(8000, (entity.position.altitude ?? 0) * 2.5) : entity.type === 'satellite' ? 2_500_000 : entity.geometry && entity.geometry.type !== 'Point' ? 30_000 : 2500
    return flyToTarget(viewer, { ...entity.position, height: entity.type === 'aircraft' || entity.type === 'satellite' ? entity.position.altitude : undefined }, range, 0, -40)
  }

  const details = createDetailPanel({
    onClose: () => {
      details.hide()
      viewer.selectedEntity = undefined
    },
    onFocus: focus,
  })

  const select = (sel: Selection | undefined, cesiumEntity?: Entity) => {
    if (!sel) {
      details.hide()
      viewer.selectedEntity = undefined
      return
    }
    viewer.selectedEntity = cesiumEntity ?? sel.layer.dataSource.entities.getById(sel.entity.id)
    if (isMobile()) layerPanel.toggleOpen(false)
    details.show(sel)
  }

  const goPreset = async (p: CameraPreset) => {
    for (const id of p.layers ?? []) await manager.setEnabled(id, true)
    await flyToPreset(viewer, p)
  }

  const onSearch = (r: SearchResult) => {
    if (r.kind === 'preset') return goPreset(r.preset)
    select(r.selection)
    focus(r.selection)
  }

  const search = createSearch(manager, onSearch)
  const layerPanel = createLayerPanel(manager, {
    initialImagery: defaultImageryId(),
    onImagery: (id) => setImagery(viewer, id).then(() => viewer.scene.requestRender()),
    onPhotoreal: (on) => setPhotorealistic(viewer, on).then((r) => (viewer.scene.requestRender(), r)),
  })
  const topbar = createTopbar({ search: search.el, onStatus: () => openStatusPanel(manager), onLayers: () => layerPanel.toggleOpen() })
  root.append(topbar, layerPanel.el, details.el, createPresetBar(goPreset), createEnergyCard())

  // Picking → normalized entity → detail panel.
  const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
  handler.setInputAction((click: { position: { x: number; y: number } }) => {
    const picked = viewer.scene.pick(click.position as never)
    const entity = defined(picked) && picked.id && typeof picked.id === 'object' ? (picked.id as Entity) : undefined
    select(manager.resolvePick(entity), entity)
  }, ScreenSpaceEventType.LEFT_CLICK)

  // 1 Hz tick for layers that animate (satellite propagation, aircraft dead-reckoning).
  setInterval(() => manager.tick(new Date()), 1000)

  const tools = createAppTools(viewer, manager, (id) => {
    const sel = manager.allEntities().find((s) => s.entity.id === id)
    if (!sel) return false
    select(sel)
    focus(sel)
    return true
  })
  // Exposed for debugging and as the integration point for a future AI agent (see docs/ARCHITECTURE.md).
  Object.assign(window, { andorraView: { viewer, manager, tools, Cartesian3 } })

  await manager.start()
  const initial = new URLSearchParams(location.search).get('view')
  await flyToPreset(viewer, CAMERA_PRESETS.find((p) => p.id === initial) ?? CAMERA_PRESETS[0])
}
