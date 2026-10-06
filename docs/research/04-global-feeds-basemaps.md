# Andorra View — Phase 0: global feeds & basemaps (tested 2026-10-06, ~08:30–08:40 UTC)

Method: `curl` from macOS with `Origin: http://localhost:5173`, recording status, latency, size, CORS and rate-limit headers. Docs/terms read via web. Samples in `scratchpad/samples/` (shared with the other agent's samples). Anything not confirmed by a request or an official page is marked **UNVERIFIED**.

Boxes: Andorra lat 42.42–42.66 / lon 1.40–1.79. Buffer lat 41.9–43.2 / lon 0.7–2.5 (≈2.3 sq°). Radial queries centred 42.55, 1.6.

Privacy note: none of these feeds contain personal data about private individuals in the sense of the user's rules (aircraft ICAO hex/callsign/registration, satellite catalog, events). Nothing personal was printed.

---

## 1. Aircraft

| Source | Endpoint tested | HTTP / latency | CORS (Origin localhost) | Auth | Count in buffer box |
|---|---|---|---|---|---|
| OpenSky | `https://opensky-network.org/api/states/all?lamin=41.9&lomin=0.7&lamax=43.2&lomax=2.5` | 200 / 0.21 s / 1.2 KB | `access-control-allow-origin: https://opensky-network.org` → **browser blocked**, needs proxy | anonymous works | 9 (first run), 14 (second) |
| adsb.lol | `https://api.adsb.lol/v2/lat/42.55/lon/1.6/dist/{nm}` | 200 / 0.29 s / 12 KB (60 nm) | **no ACAO header**; OPTIONS → 405 → browser blocked, needs proxy | none (key "planned in future" for feeders) | 13 in box (84 within 100 nm) |
| adsb.fi | `https://opendata.adsb.fi/api/v2/lat/42.55/lon/1.6/dist/{nm}` (docs list `/v3/lat/.../dist/` too) | 200 / 0.22 s / 12 KB | **no ACAO**; OPTIONS 405 → needs proxy | none | 13 in box (77 within 100 nm) |
| airplanes.live | `https://api.airplanes.live/v2/point/42.55/1.6/60` | **403** `{"error":"Please contact us at contact@airplanes.live..."}` | n/a | now requires contacting them | — |

Details:
- **OpenSky**: Basic auth no longer accepted; OAuth2 client-credentials (client_id/secret → bearer token, 30-min expiry) for authenticated use. Credits/day (separate buckets per endpoint family): anonymous 400, authenticated 4,000, active feeder 8,000; licensed 14,400/h. `/states/all` cost: ≤25 sq° = 1 credit → our box = 1 credit. Header `x-rate-limit-remaining: 399` confirmed. Resolution: anon 10 s, auth 5 s. 4,000 credits/day ≈ one poll every 21.6 s 24/7 (anon 400 ≈ every 3.6 min). Fields: array rows `[icao24, callsign, origin_country, time_position, last_contact, lon, lat, baro_alt_m, on_ground, velocity, true_track, vertical_rate, sensors, geo_alt, squawk, spi, position_source, category]`. **Terms**: licence "solely for the purpose of non-profit research, non-profit education, or for government purposes"; for-profit entities need written permission; commercial live use → contact them. → NEEDS REVIEW for a public site (OK if strictly non-profit + attribution; get written OK to be safe).
- **adsb.lol**: data ODbL 1.0 (attribution + share-alike for derived databases), code BSD-3. Rate limits "dynamic based on load"; no published number. Fields readsb/tar1090 JSON (`hex, flight, r, t, lat, lon, alt_baro, alt_geom, gs, track, baro_rate, squawk, category, seen, seen_pos, ...`). → **READY via server proxy** (best licence of the group).
- **adsb.fi**: 1 req/s public; terms "personal, non-commercial use only", attribution + link required, no resale. → POSSIBLE (non-commercial only).
- **airplanes.live**: 403 without prior contact; terms (per third-party/search summaries) non-commercial, 1 req/s. → NOT USABLE now (needs email agreement).

Recommendation: server-side poller (Worker/edge function) hitting adsb.lol every 5–10 s with one radial query (~100 nm, filter to box), cache response 5 s at edge, client polls cache. OpenSky as fallback.

Samples: `opensky.json`, `adsblol.json`, `adsbfi.json`, `airplaneslive.json` (+ `.hdr`).

---

## 2. Satellites (CelesTrak + satellite.js)

- `https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json` → 200, 0.85 s, 9.7 KB, `access-control-allow-origin: *`; OPTIONS preflight 204. **Browser-direct OK.**
- `FORMAT=tle` → 200, 3.4 KB. `GROUP=visual&FORMAT=json` → 200, 156 objects, 65 KB.
- **Important finding**: JSON (OMM) returned 23 objects in `stations`, TLE only 20; 3 objects have 6-digit NORAD IDs (e.g. 100882). CelesTrak states the 5-digit catalogue ran out on 2026-07-11; TLE only covers 5-digit objects. **Use OMM JSON**, not TLE.
- Usage policy: data updates every 2 h; download once per update; >50 HTTP errors (301/403/404) in 2 h → firewall; >100 MB/day per IP may be blocked. → Fetch server-side every 2 h (or at build) and cache; never per-visitor.
- **satellite.js** npm 7.1.0, **MIT**, supports OMM via `json2satrec(omm)`.
- CesiumJS can render propagated positions as `SampledPositionProperty` / point primitives.
- Status: **READY** (attribution "Orbital data: CelesTrak").

Samples: `celestrak_stations.json`, `celestrak_tle.txt`, `celestrak_visual.json`.

---

## 3. Fires

| Source | Endpoint | Result | CORS | Auth |
|---|---|---|---|---|
| FIRMS area API | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/0.7,41.9,2.5,43.2/1` | with fake key: 400 `Invalid MAP_KEY.` | not checked (keyed) | free MAP_KEY by email; 5,000 transactions / 10 min |
| FIRMS public 24 h CSV (keyless) | `https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Europe_24h.csv` | 200, 1.1 s, 104 KB, 1,292 rows Europe, **0 in buffer** today; last-modified 07:51 UTC | **no ACAO** → proxy | none |
| FIRMS MODIS 24 h CSV | `https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Europe_24h.csv` | 200, 25 KB, 325 rows, 0 in buffer | no ACAO | none |
| FIRMS WMS | `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/?...` | GetCapabilities 200 keyless (ACAO `*`), but **GetMap keyless returns an image "MAP_KEY is invalid"** | `*` | MAP_KEY |
| EFFIS WMS | `https://maps.effis.emergency.copernicus.eu/effis?service=WMS&request=GetCapabilities` | 200, 0.35 s, ACAO `*`; layers incl. `viirs.hs`, `modis.hs`, `all.hs`, `effis.nrt.ba.poly`, `modis.ba.*.today/week/month`, `mf010.fwi` (fire danger); `Fees none`, `AccessConstraints None`; GetMap PNG 200 | `*` | none |
| EFFIS WFS | same host `service=WFS` | 200, GeoJSON output works (`outputformat=geojson`), but bbox query returned **2019–2021 hotspots**; `TIME=` param ignored on WFS → needs OGC Filter on `acq_at` (UNVERIFIED that it works) | `*` | none |

Fields (FIRMS VIIRS CSV): `latitude, longitude, bright_ti4, scan, track, acq_date, acq_time, satellite, confidence, version, bright_ti5, frp, daynight`.
Licence: NASA open data, no restrictions; requested acknowledgment to FIRMS/EOSDIS. EFFIS/CEMS: free, full, open incl. commercial with "Generated using Copernicus Emergency Management Service information [year]".

Status: FIRMS Europe 24 h CSV **READY (via proxy, keyless)**; FIRMS area API **READY with free key** (server-side only, keep key secret); EFFIS WMS **READY** as overlay (burnt areas, fire danger); EFFIS WFS NEEDS REVIEW (time filter).

Samples: `firms_europe_24h_head.csv`, `firms_area_nokey.txt`, `firms_getmap.png` (error image), `effis_getmap.png`, `effis_wfs_viirs.xml`, `effis_wfs_json.txt`.

---

## 4. Earthquakes (≈100 km radius around 42.55, 1.6)

| Source | Endpoint | Result | CORS | Events 30 d |
|---|---|---|---|---|
| USGS FDSN | `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=42.55&longitude=1.6&maxradiuskm=100&starttime=2026-09-06` | 200, 0.66 s | `*`, `max-age=60` | **0** (and `count` for last 365 d = **0**) |
| EMSC FDSN | `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&lat=42.55&lon=1.6&maxradius=0.9&starttime=2026-09-06&limit=500` | 200, 0.16 s, version 1.2.1 | `*`, `max-age=15` | **11** (M1.2–2.1; authors IGN ×7, ReNaSS ×2, EMSC ×2) |
| EMSC websocket | `wss://www.seismicportal.eu/standing_order/websocket` | connected in 126 ms (Node 22 native WebSocket); no message in 25 s (expected: one per new/updated event, global) | — | push |
| IGN Spain | No FDSN found: `https://www.ign.es/fdsnws/event/1/query` → 404 (Tomcat). RSS works: `https://www.ign.es/ign/RssTools/sismologia.xml` → 200, ACAO `*`, 22 items (recent days, `geo:lat/geo:long`, mag in description text) | `*` | (last few days only) |
| ICGC | `https://ws.icgc.cat/fdsnws/event/1/` exists (version 1.2.4, WADL) but every query → **204 No Content**; ICGC docs state fdsnws-event is not available (only station/dataselect). `sismocat.icgc.cat/fdsnws/...` → 404 | `*` | — |

Conclusion: **EMSC is the best feed for the Pyrenees** — it already ingests IGN (and French ReNaSS) small-magnitude solutions, has CORS `*`, JSON/GeoJSON-like output, and a websocket for push. USGS has nothing for this region at small magnitudes. IGN RSS is a useful secondary source (Spanish national network). Licence: EMSC data free with attribution (exact licence text **UNVERIFIED**); USGS public domain.
Status: EMSC **READY** (browser-direct possible), IGN RSS POSSIBLE, USGS READY-but-useless, ICGC NOT USABLE.

Samples: `emsc.json`, `usgs.json`, `ign_rss.xml`, `ign_fdsn.txt`, `icgc2.txt`.

---

## 5. Weather alerts — Meteoalarm

- `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-andorra` → 200, 0.54 s, Atom + CAP namespace, **0 entries now** (no active warnings). Andorra is in the feed (`tag:meteoalarm.org,2025-05-08:AD`).
- `...-atom-spain` (396 entries, includes Lleida ES187) and `...-atom-france` (126 entries, includes Ariège FR008, Pyrénées-Orientales FR006) → 200.
- **No CORS header** → proxy. Rights: "Licensed under terms equivalent to CC BY 4.0, with additional requirements for redistributing outlined in our Terms and Conditions." → NEEDS REVIEW of T&C, otherwise POSSIBLE.
- Samples: `meteoalarm_andorra.xml`, `meteoalarm_spain_head.xml`, `meteoalarm_france_head.xml`.

---

## 6. Basemaps / 3D

Test tile: z12 x=2065 y=1512 (Andorra la Vella area).

| Provider | Test | CORS | Key | Terms / cost | Verdict |
|---|---|---|---|---|---|
| **CesiumJS** | npm `cesium` 1.146.0, Apache-2.0 | — | — | free | use |
| **Cesium ion** | `assets.ion.cesium.com` 401 without token | `*` | ion token | Community (free): "personal and non-commercial" + exploratory commercial dev only; orgs ≥ $50K revenue/funding must pay. 10 GB storage, 15 GB/month streaming, 1,000 global-imagery sessions/month, 1,000 Google P3DT root tiles/month. Commercial $149/mo (individual). Bing via ion kept until 2028; Google Maps 2D tiles assets now in ion. Default token = evaluation only. | POSSIBLE for non-commercial; cost risk if it becomes commercial |
| **Google Photorealistic 3D Tiles** | not testable without key | — | Google Maps key, billing account | 1,000 free root-tile requests/month, then $6.00 per 1,000 (to 100k), $5.10 (to 500k)…; one root request ≈ ≥3 h of tile fetching (≈ one per visitor session). Must show Google logo + aggregated glTF `asset.copyright`; no caching/prefetch; no deriving data from tiles. CesiumJS ≥1.91. Andorra coverage: **UNVERIFIED** (no public coverage list; Google says "2000+ cities"; check Google Earth 3D layer). Outside photogrammetry areas it falls back to textured elevation mesh. | NEEDS REVIEW — cost scales with visitors (10k sessions/month ≈ $54) and key exposure in browser must be restricted by referrer |
| **OSM standard tiles** | 200, 0.08 s, ACAO `*`, cache ~27 h | `*` | none | No heavy/bulk use, mandatory attribution, valid UA/Referer, no SLA; commercial tolerated but can be cut | POSSIBLE for low traffic only |
| **Esri World Imagery** | `server.arcgisonline.com/.../World_Imagery/MapServer/tile/12/1512/2065` 200, 0.22 s, ACAO `*`; copyright "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community" | `*` | none technically | Use outside Esri software is governed by Esri Master Agreement/ToU; normally needs ArcGIS (Location Platform) account/API key. Keyless use = grey area | NEEDS REVIEW |
| **EOX Sentinel-2 cloudless** | `tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/12/1512/2065.jpg` 200; `s2cloudless_3857` (2016) 200 | echoes Origin | none | Commercial use needs "EOX Commercial Attribution-RestrictedUse 1.2" licence; attribution mandatory ("EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data YEAR)"). Historically 2016 = CC BY 4.0, 2018+ = CC BY-NC-SA 4.0 — **per-year licence not confirmed on current page (UNVERIFIED)**. 10 m resolution: too coarse at street level. | POSSIBLE (non-commercial), low-res |
| **CARTO basemaps** | `a.basemaps.cartocdn.com/dark_all/12/2065/1512.png` 200 keyless, ACAO `*` | `*` | repo now says "API key is required" (keyless still works today) | free: 5M req/month non-commercial, 1M commercial; attribution OSM + CARTO | POSSIBLE (get free key) — good dark style for overlay |
| **MapTiler Cloud** | not tested (needs key) | — | key | Free: 5,000 map loads/month, logo required, "testing/personal/non-commercial"; Flex $30/mo 25k loads; terrain-rgb included | POSSIBLE |
| **AWS Terrain Tiles (Mapzen/Tilezen terrarium)** | `s3.amazonaws.com/elevation-tiles-prod/terrarium/12/2065/1512.png` 200 0.67 s; `elevation-tiles-prod.s3.amazonaws.com/v2/terrarium/...` 200; decoded heights **960–2,312 m** (plausible for Andorra la Vella tile) | `*` | none | Open, attribution per joerd (Europe: "Produced using Copernicus data and information funded by the European Union - EU-DEM layers"; SRTM USGS) | **READY** keyless terrain via custom provider |
| **Copernicus DEM GLO-30** | not fetched (COG on `s3://copernicus-dem-30m`, eu-central-1, no account) | — | none | free incl. commercial, attribution "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the EU and ESA" | READY as source to build own quantized-mesh (e.g. cesium-terrain-builder / ctb-quantized-mesh) |
| **Andorran official orthophoto / DTM** | other agent's samples present: `ideandorra_wmts_orto2025_z15.jpg`, `sig_orto2022_tile.jpg`, `dtm_andorra_lavella_256.tif` | see other report | — | see other report | likely best imagery for Andorra |

**Keyless terrain in Cesium**: CesiumJS has `CustomHeightmapTerrainProvider` (callback returning a Float32Array per tile; no water mask/normals/availability) — decode terrarium PNG (`h = R*256 + G + B/256 − 32768`) in the callback. Caveat: it uses `GeographicTilingScheme` by default while terrarium is WebMercator → resample or subclass `TerrainProvider`; normals missing → flatter lighting. Better quality option: pre-build quantized-mesh tiles for the Andorra region only (small, ~500 km² + buffer) from Copernicus GLO-30 or the Andorran DTM and serve them as static files (Cloudflare R2/Pages) via `CesiumTerrainProvider.fromUrl` — zero runtime cost, no third-party key. **POSSIBLE (needs a small build step).**

---

## 7. Hosting

- **Vercel Hobby**: "restricted to non-commercial personal use only"; commercial = any financial gain for anyone involved (ads, sales, paid dev). Donations OK. Monthly: 100 GB Fast Data Transfer, 1M function invocations, 4 h Active CPU, 360 GB-h memory, 10 GB origin transfer. **Cron: once per day max, ±59 min precision** → unusable for near-real-time polling. Pro needed for minute crons.
- **Cloudflare Workers Free**: 100,000 requests/day (reset 00:00 UTC, error 1027 beyond), 10 ms CPU/request, **5 Cron Triggers/account** (minimum 1-minute interval), 50 subrequests/request. **KV Free**: 100k reads/day, **1,000 writes/day**, 1 GB → a 1-minute cron writing to KV = 1,440 writes/day > limit; use Cache API (`caches.default`) or fewer keys / longer intervals, or Workers Paid ($5/mo). Pages static hosting free with no non-commercial clause (Pages functions count against Workers quota).
- **Cloud Run**: free tier reported as 2M requests/month (+ vCPU-s / GiB-s allowances; exact figures **UNVERIFIED** — page fetch failed); needs billing account; Cloud Scheduler 3 free jobs.
- Best fit: **Cloudflare Pages (static Vite build) + one Worker** acting as cached proxy (`/api/aircraft`, `/api/fires`, `/api/alerts`, `/api/sats`) with edge cache TTLs (aircraft 5–10 s, fires 15 min, alerts 5 min, sats 2 h). Pull-through caching means upstream request rate is bounded regardless of visitors; Worker requests are the only quota (100k/day free ≈ 1,000 visitors × 100 polls).

---

## Sources
- OpenSky REST docs: https://openskynetwork.github.io/opensky-api/rest.html ; terms (via search summary of OpenSky terms/licence text)
- adsb.lol: https://github.com/adsblol/api ; ODbL statement via search (adsb.lol site)
- adsb.fi: https://github.com/adsbfi/opendata
- airplanes.live: https://airplanes.live/api-guide (403 to fetcher; terms from search snippets)
- CelesTrak: https://celestrak.org/NORAD/documentation/gp-data-formats.php
- FIRMS MAP_KEY: https://firms.modaps.eosdis.nasa.gov/api/map_key/
- CEMS terms: https://ewds.climate.copernicus.eu/licences/terms-of-use-cems
- EMSC: https://seismicportal.eu/realtime.html , https://seismicportal.eu/webservices.html
- ICGC FDSN: https://www.icgc.cat/en/Thematic-areas/Riscos-i-emergencies/Earthquakes/EIDA-Node/FDSN-Web-Services
- Cesium ion pricing: https://cesium.com/platform/cesium-ion/pricing/ ; Google 2D in ion: https://cesium.com/blog/2025/10/02/introducing-google-maps-2d-tiles/
- Google pricing: https://developers.google.com/maps/billing-and-pricing/pricing ; 3D tiles: https://developers.google.com/maps/documentation/tile/3d-tiles ; policies: https://developers.google.com/maps/documentation/tile/policies
- OSM tile policy: https://operations.osmfoundation.org/policies/tiles/
- CARTO: https://github.com/CartoDB/basemap-styles
- EOX: https://cloudless.eox.at/documentation/license
- MapTiler: https://www.maptiler.com/cloud/pricing/
- Terrain tiles: https://registry.opendata.aws/terrain-tiles/ , https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- Copernicus DEM: https://registry.opendata.aws/copernicus-dem/
- Cesium CustomHeightmapTerrainProvider: https://cesium.com/learn/cesiumjs/ref-doc/CustomHeightmapTerrainProvider.html
- Vercel: https://vercel.com/docs/limits/fair-use-guidelines , https://vercel.com/docs/cron-jobs/usage-and-pricing
- Cloudflare: https://developers.cloudflare.com/workers/platform/limits/ , https://developers.cloudflare.com/kv/platform/limits/
