import { DATA_SOURCES, getSource, type DataSource } from '../config/dataSources'
import { health } from '../core/health'
import type { LayerManager } from '../core/layerManager'
import { formatDuration, timeAgo } from '../core/time'
import { h, svgIcon } from './dom'
import { freshnessTag, pendingTag } from './freshness'

/** Source health & transparency panel (the in-app equivalent of a /status page). */
export function openStatusPanel(manager: LayerManager) {
  const backdrop = h('div', { class: 'modal-backdrop', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Estat de les fonts' })
  const close = () => backdrop.remove()
  backdrop.addEventListener('click', (e) => e.target === backdrop && close())
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      close()
      document.removeEventListener('keydown', esc)
    }
  })
  const table = h('table')
  table.append(h('thead', {}, h('tr', {}, ...['Font', 'Tipus', 'Estat', 'Última dada', 'Latència', 'Elements', 'Llicència'].map((t) => h('th', {}, t)))))
  const body = h('tbody')
  const used = new Set(manager.layers.flatMap((l) => l.def.sources))
  const sources = (Object.values(DATA_SOURCES) as DataSource[]).filter((s) => used.has(s.id) || s.access === 'tiles')
  for (const s of sources) {
    const hs = health.get(s.id)
    const statusText =
      s.access === 'tiles' ? 'tessel·les' : hs.status === 'ok' ? 'correcte' : hs.status === 'stale' ? 'còpia antiga' : hs.status === 'error' ? `error: ${hs.lastError ?? ''}` : hs.status === 'loading' ? 'carregant' : hs.status === 'disabled' ? 'capa desactivada' : 'no consultada'
    const dot = hs.status === 'ok' ? 'ok' : hs.status === 'error' ? 'bad' : hs.status === 'stale' ? 'warn' : ''
    body.append(
      h(
        'tr',
        {},
        h('td', {}, h('strong', {}, s.name), h('div', { class: 'faint' }, s.organization)),
        h('td', {}, freshnessTag(s.freshness), ' ', s.permissionPending ? pendingTag() : ''),
        h('td', {}, h('span', { class: `dot ${dot}`, style: 'display:inline-block;margin-right:6px' }), statusText),
        h('td', { class: 'mono' }, hs.sourceUpdatedAt || hs.lastSuccess ? timeAgo(hs.sourceUpdatedAt ?? hs.lastSuccess) : '—'),
        h('td', { class: 'mono' }, hs.latencyMs !== undefined ? `${hs.latencyMs} ms` : '—'),
        h('td', { class: 'mono' }, hs.entityCount !== undefined ? String(hs.entityCount) : '—'),
        h('td', { class: 'dim' }, s.license),
      ),
    )
  }
  table.append(body)
  const refreshNote = (id: string) => {
    const s = getSource(id)
    return s?.refreshInterval ? formatDuration(s.refreshInterval / 1000) : 'estàtic'
  }
  backdrop.append(
    h(
      'div',
      { class: 'status-panel panel' },
      h('button', { class: 'icon-btn close', 'aria-label': 'Tancar', onclick: close }, svgIcon('close')),
      h('h2', {}, 'Fonts de dades i estat'),
      h('div', { class: 'dim' }, `Cada valor del mapa prové d’una d’aquestes fonts. Les dades amb l’etiqueta “No oficial” són públiques però sense llicència de reutilització publicada. Refresc de l’avió: ${refreshNote('adsb-lol')}.`),
      table,
    ),
  )
  document.getElementById('app')!.append(backdrop)
}
