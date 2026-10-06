import { CAMERA_PRESETS, type CameraPreset } from '../config/geo'
import type { LayerManager, Selection } from '../core/layerManager'
import { clear, h, svgIcon } from './dom'

export type SearchResult =
  | { kind: 'preset'; preset: CameraPreset; label: string; detail: string }
  | { kind: 'entity'; selection: Selection; label: string; detail: string }

/** Accent/case-insensitive normalization (Lòria → loria, CG-2 → cg2). */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/(\D)\s+(\d)/g, '$1$2')
    .trim()
}

export function searchAll(manager: LayerManager, query: string, limit = 12): SearchResult[] {
  const q = normalize(query)
  if (!q) return []
  const terms = q.split(' ')
  const score = (text: string) => {
    const t = normalize(text)
    if (!terms.every((term) => t.includes(term))) return 0
    return t.startsWith(q) ? 3 : t.split(' ').some((w) => w.startsWith(terms[0])) ? 2 : 1
  }
  const results: Array<SearchResult & { score: number }> = []
  for (const preset of CAMERA_PRESETS) {
    const s = score(preset.name)
    if (s) results.push({ kind: 'preset', preset, label: preset.name, detail: preset.group === 'theme' ? 'Vista temàtica' : 'Lloc', score: s + 1 })
  }
  for (const sel of manager.allEntities()) {
    const s = score(sel.layer.searchText(sel.entity))
    if (s) results.push({ kind: 'entity', selection: sel, label: sel.entity.label, detail: sel.layer.def.title, score: s })
  }
  return results.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, limit)
}

export function createSearch(manager: LayerManager, onPick: (r: SearchResult) => void) {
  const input = h('input', { type: 'search', placeholder: 'Cerca: Pas de la Casa, CG-2, hospital…', 'aria-label': 'Cerca', autocomplete: 'off', enterkeyhint: 'search' })
  const list = h('div', { class: 'search-results panel hidden', role: 'listbox' })
  const root = h('div', { class: 'search' }, svgIcon('search'), input, list)
  let results: SearchResult[] = []
  let active = 0

  const draw = () => {
    clear(list)
    list.classList.toggle('hidden', !results.length)
    results.forEach((r, i) =>
      list.append(
        h('button', { class: i === active ? 'active' : '', role: 'option', onclick: () => pick(r) }, h('span', {}, r.label), h('span', { class: 'kind' }, r.detail)),
      ),
    )
  }
  const pick = (r: SearchResult) => {
    results = []
    draw()
    input.blur()
    onPick(r)
  }
  input.addEventListener('input', () => {
    results = searchAll(manager, input.value)
    active = 0
    draw()
  })
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') active = Math.min(active + 1, results.length - 1)
    else if (e.key === 'ArrowUp') active = Math.max(active - 1, 0)
    else if (e.key === 'Enter' && results[active]) return pick(results[active])
    else if (e.key === 'Escape') results = []
    else return
    e.preventDefault()
    draw()
  })
  input.addEventListener('blur', () => setTimeout(() => list.classList.add('hidden'), 200))
  input.addEventListener('focus', () => results.length && list.classList.remove('hidden'))
  return { el: root, focus: () => input.focus() }
}
