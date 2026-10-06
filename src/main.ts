// Cesium resolves its workers/assets relative to this global (copied by vite-plugin-static-copy).
;(window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/`

import './styles.css'
import { startApp } from './app/app'

startApp(document.getElementById('app')!).catch((err) => {
  console.error(err)
  document.body.insertAdjacentHTML('beforeend', `<div class="fatal">No s’ha pogut iniciar el mapa 3D: ${String(err?.message ?? err)}</div>`)
})
