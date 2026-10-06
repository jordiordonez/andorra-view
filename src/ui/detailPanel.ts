import { getSource } from '../config/dataSources'
import type { EntityDetails } from '../core/details'
import type { Selection } from '../core/layerManager'
import { formatLocalTime, timeAgo } from '../core/time'
import { clear, h, svgIcon } from './dom'
import { freshnessTag, pendingTag } from './freshness'

export function createDetailPanel(opts: { onClose: () => void; onFocus: (sel: Selection) => void }) {
  const root = h('section', { class: 'details panel hidden', 'aria-live': 'polite', 'aria-label': 'Detalls' })
  let current: Selection | undefined
  let imageTimer: ReturnType<typeof setInterval> | undefined
  let refreshTimer: ReturnType<typeof setInterval> | undefined

  const render = () => {
    clearInterval(imageTimer)
    if (!current) return
    const { layer, entity } = current
    let d: EntityDetails
    try {
      d = layer.describe(entity)
    } catch (err) {
      d = { title: entity.label, fields: [], note: `No s’han pogut mostrar els detalls (${String(err)})` }
    }
    const sourceId = entity.source || layer.def.sources[0]
    const src = getSource(sourceId)
    clear(root)
    root.append(h('button', { class: 'icon-btn close', 'aria-label': 'Tancar', onclick: () => opts.onClose() }, svgIcon('close')))
    root.append(h('h2', {}, d.title))
    if (d.subtitle) root.append(h('div', { class: 'subtitle' }, d.subtitle))
    const badges = h('div', { class: 'badges' })
    if (src) badges.append(freshnessTag(src.freshness, layer.state.stale))
    for (const b of d.badges ?? []) badges.append(h('span', { class: 'tag estimated' }, b))
    if (src?.permissionPending) badges.append(pendingTag())
    root.append(badges)
    if (d.image) {
      const img = h('img', { src: d.image.url, alt: d.image.alt, loading: 'lazy', referrerpolicy: 'no-referrer' })
      img.addEventListener('error', () => img.replaceWith(h('div', { class: 'note' }, 'Imatge no disponible ara mateix.')))
      root.append(h('figure', {}, img, d.image.caption ? h('figcaption', {}, d.image.caption) : null))
      if (d.image.refreshMs) {
        const base = d.image.url
        imageTimer = setInterval(() => (img.src = `${base}${base.includes('?') ? '&' : '?'}t=${Date.now()}`), d.image.refreshMs)
      }
    }
    if (d.fields.length) {
      const dl = h('dl')
      for (const f of d.fields) dl.append(h('dt', {}, f.label), h('dd', { class: f.tone ?? '' }, f.value))
      root.append(dl)
    }
    if (d.links?.length) root.append(h('div', { class: 'links' }, ...d.links.map((l) => h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, `${l.label} ↗`))))
    root.append(h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => opts.onFocus(current!) }, 'Centrar al mapa')))
    if (d.note) root.append(h('p', { class: 'note' }, d.note))

    const box = h('div', { class: 'source-box' })
    box.append(h('div', {}, 'Font: ', h('strong', {}, src ? `${src.name}` : sourceId), src ? ` — ${src.organization}` : ''))
    if (entity.timestamp) box.append(h('div', {}, `Observació: ${formatLocalTime(entity.timestamp)} (${timeAgo(entity.timestamp)})`))
    if (layer.state.fetchedAt && src?.freshness !== 'static') box.append(h('div', {}, `Actualitzat: ${timeAgo(layer.state.fetchedAt)}`))
    if (src) box.append(h('div', {}, `Llicència: ${src.license}`))
    if (src?.permissionPending) box.append(h('div', { class: 'pending' }, 'Dades públiques sense llicència de reutilització publicada. Ús no oficial, permís sol·licitat a la font.'))
    if (layer.state.warning) box.append(h('div', { class: 'pending' }, layer.state.warning))
    if (src) box.append(h('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer' }, `${new URL(src.url).host} ↗`))
    root.append(box)
  }

  return {
    el: root,
    show(sel: Selection) {
      current = sel
      root.classList.remove('hidden')
      render()
      clearInterval(refreshTimer)
      // Re-render with fresh data when the layer refreshes (same id), and keep "fa X s" current.
      refreshTimer = setInterval(() => {
        if (!current) return
        const fresh = current.layer.findEntity(current.entity.id)
        if (fresh) current = { layer: current.layer, entity: fresh }
        if (!d_imageActive()) render()
      }, 10_000)
    },
    hide() {
      current = undefined
      clearInterval(imageTimer)
      clearInterval(refreshTimer)
      root.classList.add('hidden')
    },
    get current() {
      return current
    },
  }

  // Avoid resetting an image the user is looking at; timers handle image refresh.
  function d_imageActive() {
    return !!root.querySelector('figure img')
  }
}
