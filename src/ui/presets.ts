import { CAMERA_PRESETS, type CameraPreset } from '../config/geo'
import { h } from './dom'

export function createPresetBar(onPreset: (p: CameraPreset) => void) {
  const bar = h('nav', { class: 'presets', 'aria-label': 'Vistes' })
  for (const p of CAMERA_PRESETS) {
    bar.append(h('button', { class: `chip ${p.group === 'theme' ? 'theme' : ''}`, onclick: () => onPreset(p) }, p.name))
  }
  return bar
}
