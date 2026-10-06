import { getSource } from '../config/dataSources'
import { fetchFeed } from '../core/api'
import { health } from '../core/health'
import { timeAgo } from '../core/time'
import type { EnergySummary } from '../providers/feda'
import { clear, h } from './dom'
import { pendingTag } from './freshness'

const mwh = (v?: number) => (v === undefined ? '—' : `${Math.round(v).toLocaleString('ca-AD')} MWh`)

/** National energy summary (FEDA, daily). Not a map layer: FEDA publishes totals, not geolocated data. */
export function createEnergyCard() {
  const el = h('section', { class: 'energy panel hidden', 'aria-label': 'Energia' })
  const src = getSource('feda')!
  const load = async () => {
    const started = performance.now()
    try {
      const res = await fetchFeed('energy')
      const e = res.meta?.energy as EnergySummary | undefined
      health.update('feda', { status: res.stale ? 'stale' : 'ok', lastSuccess: new Date().toISOString(), fetchedAt: res.fetchedAt, latencyMs: Math.round(performance.now() - started), entityCount: 0 })
      if (!e?.lastComplete) return el.classList.add('hidden')
      const d = e.lastComplete
      const prod = d.productionMWh ?? 0
      const imp = Math.max(0, d.netImportMWh ?? 0)
      const total = prod + imp || 1
      clear(el)
      el.append(
        h('header', {}, h('strong', {}, 'Energia elèctrica'), h('span', { class: 'dim' }, new Date(d.date).toLocaleDateString('ca-AD', { day: '2-digit', month: 'short' }))),
        h('div', { class: 'row' }, h('span', { class: 'dim' }, 'Consum'), h('span', { class: 'mono' }, mwh(d.consumptionMWh))),
        h('div', { class: 'bar', title: 'Producció nacional vs importació' }, h('span', { style: `width:${(prod / total) * 100}%;background:#22c55e` }), h('span', { style: `width:${(imp / total) * 100}%;background:#64748b` })),
        h('div', { class: 'row' }, h('span', {}, h('span', { style: 'color:#22c55e' }, '■ '), 'Producció ', h('span', { class: 'mono' }, mwh(d.productionMWh))), h('span', {}, h('span', { class: 'dim' }, '■ '), 'Importació ', h('span', { class: 'mono' }, mwh(d.netImportMWh)))),
        h('div', { class: 'row faint', style: 'margin-top:6px' }, h('span', {}, `${src.attribution} · dades diàries · consultat ${timeAgo(res.fetchedAt)}`), pendingTag()),
      )
      el.classList.remove('hidden')
    } catch (err) {
      health.update('feda', { status: 'error', lastError: String(err), lastErrorAt: new Date().toISOString() })
      el.classList.add('hidden')
    }
  }
  load()
  setInterval(load, src.refreshInterval)
  return el
}
