import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { apiDevServer } from './server/vitePlugin'

// Cesium ships prebuilt workers, assets and widget CSS that must be served as static files.
const cesiumSource = 'node_modules/cesium/Build/Cesium'
const cesiumBaseUrl = 'cesium'

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; set BASE_PATH=/andorra-view/ in that build.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    apiDevServer(),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl, rename: { stripBase: 4 } },
        { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl, rename: { stripBase: 4 } },
        { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl, rename: { stripBase: 4 } },
        { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl, rename: { stripBase: 4 } },
      ],
    }),
  ],
  // satellite.js 7 ships optional WASM workers that use top-level await (needs ES-module workers).
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 6000,
  },
})
