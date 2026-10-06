type Attrs = Record<string, string | number | boolean | undefined | EventListener>

/** Minimal hyperscript helper. Text children are inserted as text nodes (never as HTML). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Array<Node | string | null | undefined | false>): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v)
    else if (k === 'class') el.className = String(v)
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c)
  return el
}

/** Inline SVG icons used by the chrome (stroke icons, 18 px). */
export function svgIcon(name: 'layers' | 'search' | 'close' | 'pulse' | 'target' | 'mountain' | 'globe' | 'cube'): SVGSVGElement {
  const paths: Record<string, string> = {
    layers: 'M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 17.5l10 5 10-5',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4',
    close: 'M6 6l12 12M18 6 6 18',
    pulse: 'M3 12h4l2-6 4 12 2-6h6',
    target: 'M12 3v4m0 10v4M3 12h4m10 0h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    mountain: 'M3 20 10 7l4 6 2-3 5 10z',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-9 9h18M12 3c2.5 2.6 3.5 5.6 3.5 9s-1 6.4-3.5 9c-2.5-2.6-3.5-5.6-3.5-9s1-6.4 3.5-9z',
    cube: 'M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5M12 12v10',
  }
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('width', '18')
  svg.setAttribute('height', '18')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.8')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  const p = document.createElementNS(ns, 'path')
  p.setAttribute('d', paths[name])
  svg.append(p)
  return svg
}

export function clear(el: Element) {
  while (el.firstChild) el.firstChild.remove()
}
