import { getSource } from '../config/dataSources'
import type { Layer, LayerGroup } from '../core/layer'
import type { LayerManager } from '../core/layerManager'
import { timeAgo } from '../core/time'
import { IMAGERY_OPTIONS, ENV, type ImageryId } from '../map/basemaps'
import { clear, h } from './dom'
import { freshnessTag, pendingTag } from './freshness'

const GROUPS: Array<[LayerGroup, string]> = [
  ['mobility', 'Mobilitat'],
  ['weather', 'Meteo i neu'],
  ['environment', 'Medi ambient'],
  ['emergency', 'Emergències'],
  ['sky', 'Cel'],
  ['context', 'Context'],
]

export interface LayerPanelOptions {
  onImagery: (id: ImageryId) => void
  onPhotoreal?: (on: boolean) => Promise<boolean>
  initialImagery: ImageryId
}

export function createLayerPanel(manager: LayerManager, opts: LayerPanelOptions) {
  const root = h('aside', { class: 'layers panel', 'aria-label': 'Capes' })
  const rows = new Map<string, HTMLElement>()

  const renderRow = (layer: Layer, row: HTMLElement) => {
    clear(row)
    const s = layer.state
    const src = getSource(s.activeSource ?? layer.def.sources[0])
    const dotClass = !s.enabled ? '' : s.loading && !s.fetchedAt ? 'loading' : s.error ? 'bad' : s.stale || s.warning ? 'warn' : 'ok'
    const sw = h('span', { class: 'switch', role: 'switch', 'aria-checked': String(s.enabled), 'aria-label': layer.def.title })
    row.append(h('span', { class: 'name' }, h('span', { class: `dot ${dotClass}` }), layer.def.title), sw)
    const meta = h('div', { class: 'meta' })
    if (src) meta.append(freshnessTag(src.freshness, s.stale))
    if (layer.def.sources.some((id) => getSource(id)?.permissionPending)) meta.append(pendingTag())
    if (s.enabled) {
      if (s.error) meta.append(h('span', { class: 'err', title: s.error }, 'Error de la font'))
      else if (s.fetchedAt) {
        const text =
          src?.freshness === 'static'
            ? `${s.count} · carregat`
            : s.count === 0
              ? `cap actiu · consultat ${timeAgo(s.fetchedAt)}`
              : `${s.count} · última ${timeAgo(s.sourceUpdatedAt ?? s.fetchedAt)}`
        meta.append(h('span', {}, text))
        if (s.warning) meta.append(h('span', { class: 'warn', title: s.warning }, '⚠︎'))
      } else if (s.loading) meta.append(h('span', {}, 'carregant…'))
    } else if (layer.def.description) meta.append(h('span', {}, layer.def.description))
    row.append(meta)
  }

  const imagery = h('div', { class: 'basemap-switch', role: 'group', 'aria-label': 'Mapa base' })
  const setImageryPressed = (id: ImageryId) => imagery.querySelectorAll<HTMLButtonElement>('[data-imagery]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.imagery === id)))
  for (const o of IMAGERY_OPTIONS) {
    imagery.append(
      h('button', { class: 'chip', 'data-imagery': o.id, 'aria-pressed': 'false', onclick: () => { setImageryPressed(o.id); opts.onImagery(o.id) } }, o.name),
    )
  }
  if (ENV.googleMapsKey && opts.onPhotoreal) {
    const btn = h('button', { class: 'chip', 'aria-pressed': 'false', title: 'Google Photorealistic 3D Tiles (consumeix quota)' }, 'Fotorealista 3D')
    btn.addEventListener('click', async () => {
      const on = btn.getAttribute('aria-pressed') !== 'true'
      if (await opts.onPhotoreal!(on)) btn.setAttribute('aria-pressed', String(on))
    })
    imagery.append(btn)
  }
  setImageryPressed(opts.initialImagery)

  for (const [group, title] of GROUPS) {
    const layers = manager.layers.filter((l) => l.def.group === group)
    if (!layers.length) continue
    root.append(h('h3', {}, title))
    for (const layer of layers) {
      const row = h('div', { class: 'layer-row', tabindex: 0 })
      row.addEventListener('click', () => manager.setEnabled(layer.id, !layer.state.enabled))
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          manager.setEnabled(layer.id, !layer.state.enabled)
        }
      })
      rows.set(layer.id, row)
      renderRow(layer, row)
      root.append(row)
    }
  }
  root.append(h('h3', {}, 'Mapa base'), imagery)

  manager.changed.on((layer) => {
    const row = rows.get(layer.id)
    if (row) renderRow(layer, row)
  })
  // Keep "fa X s" labels current.
  setInterval(() => manager.layers.forEach((l) => l.state.enabled && rows.get(l.id) && renderRow(l, rows.get(l.id)!)), 5_000)

  return {
    el: root,
    toggleOpen(force?: boolean) {
      root.classList.toggle('open', force)
      return root.classList.contains('open')
    },
  }
}
