import type { Freshness } from '../core/types'
import { h } from './dom'

const LABELS: Record<Freshness, [string, string]> = {
  live: ['En directe', 'live'],
  'near-real-time': ['Quasi temps real', 'nrt'],
  periodic: ['Periòdic', 'periodic'],
  static: ['Estàtic', 'static'],
  simulated: ['Simulat', 'simulated'],
}

export function freshnessTag(f: Freshness, stale = false): HTMLElement {
  if (stale) return h('span', { class: 'tag pending', title: 'La font no respon: es mostra l’última còpia vàlida' }, 'Còpia antiga')
  const [label, cls] = LABELS[f]
  return h('span', { class: `tag ${cls}` }, label)
}

export function pendingTag(): HTMLElement {
  return h('span', { class: 'tag pending', title: 'Font pública sense llicència de reutilització publicada; permís sol·licitat' }, 'No oficial')
}
