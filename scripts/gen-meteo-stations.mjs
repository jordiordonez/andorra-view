// Regenerates src/data/meteoStations.ts from public/data/meteo-stations.geojson.
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const fc = JSON.parse(await readFile(join(ROOT, 'public/data/meteo-stations.geojson'), 'utf8'))
const rows = fc.features
  .map((f) => ({
    code: String(f.properties.code),
    name: f.properties.name ?? '',
    lon: Math.round(f.geometry.coordinates[0] * 1e5) / 1e5,
    lat: Math.round(f.geometry.coordinates[1] * 1e5) / 1e5,
    altitude: typeof f.properties.altitude === 'number' && f.properties.altitude ? Math.round(f.properties.altitude) : undefined,
  }))
  .sort((a, b) => (a.code < b.code ? -1 : 1))
const lines = rows.map(
  (r) => `  { code: ${JSON.stringify(r.code)}, name: ${JSON.stringify(r.name)}, lon: ${r.lon}, lat: ${r.lat}${r.altitude ? `, altitude: ${r.altitude}` : ''} },`,
)
const src = `// Generated from public/data/meteo-stations.geojson (Govern d'Andorra layer + meteo.ad station pages).
// Regenerate after \`npm run data:static\`: node scripts/gen-meteo-stations.mjs
// Kept as a TS module so the Worker can bundle it (no fs access at runtime).

export interface MeteoStationMeta {
  code: string
  name: string
  lon: number
  lat: number
  altitude?: number
}

export const METEO_STATIONS: MeteoStationMeta[] = [
${lines.join('\n')}
]
`
await writeFile(join(ROOT, 'src/data/meteoStations.ts'), src)
console.log(`✓ src/data/meteoStations.ts (${rows.length} stations)`)
