import { health } from '../core/health'
import { h, svgIcon } from './dom'

export function createTopbar(opts: { search: HTMLElement; onStatus: () => void; onLayers: () => boolean }) {
  const clock = h('span', { class: 'clock', title: 'Hora d’Andorra' })
  const tickClock = () => {
    clock.textContent = new Date().toLocaleString('ca-AD', { timeZone: 'Europe/Andorra', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  tickClock()
  setInterval(tickClock, 1000)

  const dot = h('span', { class: 'dot loading' })
  const label = h('span', { class: 'label' }, 'Fonts')
  const status = h('button', { class: 'status-pill', title: 'Estat de les fonts de dades', onclick: opts.onStatus }, dot, label)
  const updateStatus = () => {
    const all = health.all().filter((s) => s.status !== 'disabled' && s.status !== 'idle')
    const bad = all.filter((s) => s.status === 'error').length
    const warn = all.filter((s) => s.status === 'stale').length
    const ok = all.filter((s) => s.status === 'ok').length
    dot.className = `dot ${bad ? 'bad' : warn ? 'warn' : ok ? 'ok' : 'loading'}`
    label.textContent = bad ? `${ok} fonts OK · ${bad} amb error` : `${ok} fonts actives`
  }
  health.changed.on(updateStatus)

  const layersBtn = h('button', { class: 'icon-btn mobile-only', 'aria-label': 'Capes', 'aria-pressed': 'false' }, svgIcon('layers'))
  layersBtn.addEventListener('click', () => layersBtn.setAttribute('aria-pressed', String(opts.onLayers())))

  const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  logo.setAttribute('width', '22')
  logo.setAttribute('height', '22')
  logo.setAttribute('viewBox', '0 0 32 32')
  logo.innerHTML = '<path d="M3 26 13 8l5 9 3-5 8 14z" fill="none" stroke="#38bdf8" stroke-width="2.4" stroke-linejoin="round"/><circle cx="21" cy="7" r="2.5" fill="#38bdf8"/>'

  return h(
    'header',
    { class: 'topbar panel' },
    layersBtn,
    h('div', { class: 'brand' }, logo, h('span', {}, 'ANDORRA VIEW'), h('small', {}, 'vista 3D en temps real')),
    opts.search,
    h('div', { class: 'spacer' }),
    clock,
    status,
  )
}
