// Build-time snapshot of static reference layers into public/data/.
// Run: npm run data:static   (re-run when upstream data changes; outputs are committed).
//
// Sources (see docs/DATA_SOURCES.md):
//   - Govern d'Andorra SIG (ArcGIS REST, CORS *, no licence published → attribution + permission pending)
//   - OpenStreetMap via Overpass (ODbL)
// Only geometry + public reference attributes are kept. No personal data is requested.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'data')
const UA = 'AndorraView/0.1 (static snapshot; https://github.com/jordiordonez/andorra-view)'
const SIG = 'https://sig.govern.ad/server/rest/services/Hosted'

/** Round coordinates to ~1 m to keep files small. */
function roundCoords(geom, digits = 5) {
  const f = 10 ** digits
  const r = (c) => (typeof c[0] === 'number' ? c.slice(0, 2).map((v) => Math.round(v * f) / f) : c.map(r))
  return geom ? { ...geom, coordinates: r(geom.coordinates) } : geom
}

async function getJson(url, init = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...init.headers } })
    if (res.ok) return res.json()
    console.warn(`  ${res.status} on ${url.slice(0, 90)}… retry ${attempt + 1}`)
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)))
  }
  throw new Error(`failed ${url}`)
}

/** `simplify` = maxAllowableOffset in degrees (~0.00003 ≈ 3 m). */
async function arcgis(service, layer, outFields, map, simplify = 0) {
  const url = `${SIG}/${encodeURIComponent(service)}/FeatureServer/${layer}/query?where=1%3D1&outFields=${encodeURIComponent(outFields)}&outSR=4326&f=geojson&resultRecordCount=2000${simplify ? `&maxAllowableOffset=${simplify}` : ''}`
  const fc = await getJson(url)
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => ({ type: 'Feature', geometry: roundCoords(f.geometry), properties: map(f.properties ?? {}) })),
  }
}

async function overpass(query) {
  const body = new URLSearchParams({ data: `[out:json][timeout:60];${query}` })
  return getJson('https://overpass-api.de/api/interpreter', { method: 'POST', body })
}

async function save(name, data, meta) {
  const out = { ...data, metadata: { generatedAt: new Date().toISOString(), ...meta } }
  await writeFile(join(OUT, name), JSON.stringify(out))
  console.log(`✓ ${name} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB, ${data.features?.length ?? data.items?.length} items)`)
}

await mkdir(OUT, { recursive: true })

const govern = { source: 'govern-sig', attribution: 'Base topogràfica cedida pel Govern d’Andorra' }

await save(
  'parishes.geojson',
  await arcgis('pol_parroquies', 0, 'parroquia,abrev,cod_postal', (p) => ({ name: p.parroquia, abbrev: p.abrev, postalCode: p.cod_postal }), 0.00004),
  { ...govern, note: 'Govern layer is labelled “no oficial” (non-official parish limits).' },
)

await save('border.geojson', await arcgis('frontera_andorra_linia', 0, 'acord', (p) => ({ agreement: p.acord }), 0.00003), govern)

await save(
  'roads.geojson',
  await arcgis('Carreteres_GS_Andorra', 0, 'designacio,nom_carret,descripcio', (p) => ({ ref: p.designacio, name: p.nom_carret, kind: p.descripcio }), 0.00004),
  govern,
)

// Bus network 2025 (static; no GTFS / live positions exist publicly).
{
  // Layer ids → line, from the service's layer names ("Parades LE", "Parades L1"…); the per-feature
  // route fields are inconsistently filled.
  const stopLayers = { 1: 'LE', 2: 'L1', 3: 'L2', 4: 'L3', 5: 'L4', 6: 'L5', 7: 'L6', 8: 'L7' }
  const features = []
  for (const [id, line] of Object.entries(stopLayers)) {
    const fc = await arcgis('linies_bus_2025', id, '*', (p) => ({
      name: p.name_and ?? p.name,
      code: p.parada_and ?? p.name,
      line,
    }))
    features.push(...fc.features)
  }
  await save('bus-stops.geojson', { type: 'FeatureCollection', features }, { ...govern, note: 'Govern “Línies autobús 2025” stop layers' })
  const lines = { type: 'FeatureCollection', features: [] }
  for (const id of [10, 11]) {
    const fc = await getJson(`${SIG}/linies_bus_2025/FeatureServer/${id}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson`)
    for (const f of fc.features) {
      const p = f.properties ?? {}
      const line = p.route_name ?? p.name ?? p.linia ?? p.Linia ?? p.nom ?? p.route ?? null
      lines.features.push({ type: 'Feature', geometry: roundCoords(f.geometry), properties: { line } })
    }
  }
  await save('bus-lines.geojson', lines, govern)
}

// Weather stations metadata (codes match meteo.ad DadesActuals). Govern layer + meteo.ad station list fallback.
{
  const fc = await arcgis('Estacions_meteorològiques_Andorra', 0, 'codi,nom,altitud,servei,variables_mesurades', (p) => ({
    code: String(p.codi),
    name: p.nom,
    altitude: p.altitud,
    season: p.servei,
    variables: p.variables_mesurades,
  }))
  const byCode = new Map(fc.features.map((f) => [f.properties.code, f]))
  // data/meteo-ad-stations.csv was compiled from public meteo.ad station pages during research (docs/research/03).
  const csv = await readFile(join(ROOT, 'data', 'meteo-ad-stations.csv'), 'utf8').catch(() => '')
  for (const line of csv.split('\n').slice(1)) {
    const m = line.match(/^(\d+),"([^"]*)",([\d.]+),([\d.]+),(\d+),"([^"]*)"/)
    if (!m || byCode.has(m[1])) continue
    byCode.set(m[1], {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [+m[4], +m[3]] },
      properties: { code: m[1], name: m[2], altitude: +m[5], variables: m[6] },
    })
  }
  await save('meteo-stations.geojson', { type: 'FeatureCollection', features: [...byCode.values()] }, {
    source: 'govern-sig',
    attribution: 'Estacions: Servei Meteorològic Nacional / Govern d’Andorra',
  })
}

// Places (towns/villages) from OSM.
{
  const data = await overpass(`area["ISO3166-1"="AD"][admin_level=2]->.a;node["place"~"^(town|village|city)$"](area.a);out;`)
  const features = data.elements.map((e) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [Math.round(e.lon * 1e5) / 1e5, Math.round(e.lat * 1e5) / 1e5] },
    properties: { name: e.tags.name, place: e.tags.place, population: e.tags.population ? Number(e.tags.population) : undefined, ele: e.tags.ele ? Number(e.tags.ele) : undefined },
  }))
  await save('places.geojson', { type: 'FeatureCollection', features }, { source: 'osm', attribution: '© OpenStreetMap contributors (ODbL)' })
}

// Points of interest for search (hospital, ski resorts, border crossings, peaks) from OSM.
{
  const data = await overpass(
    `area["ISO3166-1"="AD"][admin_level=2]->.a;(` +
      `nwr["amenity"="hospital"](area.a);` +
      `nwr["landuse"="winter_sports"]["name"](area.a);` +
      `nwr["barrier"="border_control"](area.a);` +
      `node["natural"="peak"]["name"]["ele"](area.a);` +
      `nwr["aerialway"="station"]["name"](area.a);` +
      `);out center tags;`,
  )
  const kindOf = (t) =>
    t.amenity === 'hospital' ? 'hospital' : t.landuse === 'winter_sports' ? 'ski' : t.barrier === 'border_control' ? 'border' : t.natural === 'peak' ? 'peak' : 'lift'
  const features = data.elements
    .map((e) => {
      const lon = e.lon ?? e.center?.lon
      const lat = e.lat ?? e.center?.lat
      if (lon == null || !e.tags?.name) return null
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5] },
        properties: { name: e.tags.name, kind: kindOf(e.tags), ele: e.tags.ele ? Number(e.tags.ele) : undefined },
      }
    })
    .filter(Boolean)
  await save('poi.geojson', { type: 'FeatureCollection', features }, { source: 'osm', attribution: '© OpenStreetMap contributors (ODbL)' })
}
