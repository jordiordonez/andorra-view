# Andorra View — Phase 0 research report

Date of research and tests: **2026-10-06**. This report summarises the raw evidence in `docs/research/01–04` and
records the decisions taken for the MVP. The per-source catalogue is in [DATA_SOURCES.md](DATA_SOURCES.md); the
legal position of each source is in [LICENSES_AND_ATTRIBUTIONS.md](LICENSES_AND_ATTRIBUTIONS.md); the resulting
design is in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Scope and method

| Item | Detail |
|---|---|
| Goal | Find every usable source for a near-real-time 3D map of Andorra (CesiumJS): base map, terrain, mobility, webcams, transport, parking, weather, snow, environment, energy, emergencies, and global feeds (aircraft, satellites, fires, earthquakes, alerts). |
| Dates | All requests on 2026-10-06, roughly 08:30–08:55 UTC. |
| Tools | `curl` and Python from a residential connection; a headed browser for checks that need rendering. CORS tested by sending `Origin: http://localhost:5173` and reading `Access-Control-Allow-Origin` (ACAO). Licence and terms pages read on the web. |
| God's Eye View audit | Shallow clone (`--depth 1`). Nothing was installed, built or executed from the repository. |
| Boxes | Andorra lat 42.42–42.66 / lon 1.40–1.79. Buffer for global feeds lat 41.9–43.2 / lon 0.7–2.5. Radial queries centred on 42.55, 1.6. |
| Rules followed | No authentication, CAPTCHA or anti-bot measure was bypassed. Only read operations (GET / ArcGIS `query`) were issued. Endpoints that could hold personal data (citizen-submission forms, cyclist tracking, accident layers, user photo galleries) were not queried. No personal data was collected, printed or stored. |
| Evidence level | Every endpoint was hit live unless it is marked **UNVERIFIED**. Samples (non-personal) were kept in a scratchpad, not in the repository. |

A security observation about some public ArcGIS services was made during the research. It was reported privately and
is deliberately not described in this document.

---

## 2. God's Eye View (GEV) analysis

### 2.1 Identification

| Field | Value |
|---|---|
| Canonical repository | https://github.com/bilawalsidhu/gods-eye-view (not a fork; owner account of Bilawal Sidhu) |
| Former name | "WorldView" |
| Activity | 48,094 stars / 9,791 forks; version 0.2.1 (2026-10-02); last commit 2026-10-05; PRs merged daily |
| Maintainers | Bilawal Sidhu and Sameh Khamis (Halfpixel) |
| Size | ~1,667 files |

Community forks (e.g. a fork with ~5,200 world camera packs, Android and launcher variants) are not needed, because
the official repository is open source. Whether that camera fork includes any Andorra/Pyrenees camera is UNVERIFIED.

### 2.2 Licence

- **Code: MIT**, "Copyright (c) 2026 Bilawal Sidhu". GitHub reports `NOASSERTION` only because the LICENSE file
  appends a data carve-out.
- The carve-out states that MIT covers the source code only. Bundled datasets and runtime third-party data are
  **not** MIT. Explicitly non-commercial items: TeleGeography submarine cables (**CC BY-NC-SA 3.0**) and the
  Bhote Koshi flood event pack (**CC BY-NC 4.0**). Other bundled data is ODbL 1.0; 3D models are CC BY 4.0; README
  media GIFs are not licensed for standalone reuse.
- Branding ("God's Eye View", logo) is not granted by MIT.

### 2.3 Architecture summary

| Aspect | GEV implementation |
|---|---|
| Frontend | Vanilla JS ES modules, CesiumJS (lockfile 1.138.0), Vite 6, no framework |
| Backend | No separate server: Node "providers" run as **Vite dev/preview middleware**; plus an MCP server |
| Basemap ladder | Google Photorealistic 3D (key or server token) → Cesium ion → keyless Esri World Imagery → OSM tiles |
| Terrain | Cesium World Terrain (ion) or keyless Re:Earth/Mapterhorn quantized mesh, then flat ellipsoid |
| Layers | `src/layers/<family>/` with source / record / controller / renderer split and an `init/enable/disable/update/destroy/getStats` lifecycle |
| Rendering | Interpolated motion with dead reckoning, glTF models on approach, SGP4 satellites, CCTV frames projected into 3D, CRT/NVG/FLIR post-process shaders |
| Attribution | Central credits registry fed into Cesium's credit display |
| Deployment | Local-first (localhost:4173), disk cache in the working directory, single instance; SECURITY.md says it is not a hardened production service |

### 2.4 Providers and Andorra coverage

GEV integrates 36 provider groups. Their usefulness over Andorra:

| Works over Andorra | Does not work / irrelevant |
|---|---|
| Esri World Imagery, OSM tiles, Re:Earth terrain, Cesium ion World Terrain, Google 3D (Andorra coverage UNVERIFIED) | AIS vessels (landlocked) |
| OpenSky and adsb.lol overflights; adsbdb enrichment | All CCTV packs (no Andorra, Catalonia or Occitanie cameras) |
| CelesTrak satellites; Launch Library 2 (global) | ALPR (US/Canada only) |
| NASA FIRMS (sparse detections) | Transit GTFS-RT feeds and GBFS bikeshare (none for Andorra) |
| USGS earthquakes (small Pyrenean events missing) | NOAA radar, lightning and GOES regional (outside coverage) |
| Open-Meteo, GFS/ECMWF wind (0.25°, coarse) | NHC cyclones, NIFC fire perimeters (US) |
| NASA GIBS/HLS imagery, OpenFreeMap roads + simulated traffic | Austin/SF/NYC presets and bundled US datasets |
| Nominatim, Photon, OSRM, Radio Browser, local ADS-B receiver | TomTom flow: Andorra coverage UNVERIFIED (key needed) |

Andorra-specific sources (Govern, Mobilitat, SMN, seismic networks) are absent from GEV and had to be researched
from scratch (sections 3–4).

### 2.5 Reuse assessment

- **Full fork: rejected.** Most of the 1,667 files are US-centric layers, launchers, an MCP server, SDR and QA
  harnesses tied to US presets. The codebase moves very fast, so a fork would be costly to keep in sync, and the
  "dev server as backend" model is not production-ready.
- **Valuable ideas:** the basemap fallback ladder, per-layer lifecycle, server-side proxies with caching, motion
  interpolation, credits registry, and the OMM/SGP4 satellite pipeline.
- **Runtime data terms are independent of the code** and matter more than the MIT licence (OpenSky non-profit only,
  Cesium ion Community non-commercial, Google Maps Platform no-caching rules, OSRM and Nominatim usage policies).

### 2.6 Decision

**Hybrid / clean reimplementation.** Andorra View is a new, lean TypeScript codebase. GEV was studied for its
patterns, but **no GEV code or data is copied in the MVP** — only ideas.

If GEV modules are copied later (for example the post-process shaders or flight smoothing):

1. Keep the MIT notice ("Copyright (c) 2026 Bilawal Sidhu" + permission notice) in each copied file.
2. Add a `THIRD_PARTY_NOTICES` entry.
3. Never copy `src/data/local_data/*`, the NC event packs, README media, or the GEV name and logo.

---

## 3. Andorran sources — findings by domain

### 3.1 Government GIS (Govern d'Andorra)

- **Main backend: `https://sig.govern.ad/server/rest/services`** (ArcGIS Enterprise 11.2, 60 folders). Folders
  `IDE`, `Hosted`, `Area_Carto`, `CARBURANTS`, `Servei_public` and `Mobilitat` are anonymous; others
  (`Cartografia_Base`, `Ortofotos`, `Edificis`, `TURISME`, `Frontera`, `Qualitat_Aire`, `Energia`, `Sanitat`,
  `Públics`, `Refugis`, `Aigua`, `Soroll`, `RiscosGeo`) return "Token Required" and were not attempted.
- The server sends **`ACAO: *`**, so the browser can call it directly.
- Key layers: parish polygons (`Hosted/pol_parroquies`, 7), roads (`Hosted/Carreteres_GS_Andorra`, 134 lines;
  INSPIRE `IDE/Transport_network`, 1,509 lines), buildings 2019 (21,529 polygons, **no height field**), addresses
  (11,571), POIs (1,301), official geocoders, annual average daily traffic (13,218 segments) and the national
  mobility model.
- **IDE Andorra OGC services** (`www.ideandorra.ad/Serveis`, GeoServer): about 45 WMS, a WMTS (incl. **orthophoto
  2025, 25 cm**), and a WFS with **927 feature types**. All are fast but send **no CORS header**.
- **No national open-data portal** was found (dadesobertes.ad, opendata.ad etc. fail). The download site needs a
  form with user details (UNVERIFIED, not submitted).
- **Licence:** no open licence. Portal `licenseInfo` is mostly empty. One layer requires the credit "Base topogràfica
  cedida pel Govern d'Andorra"; WMS cartogeneral states "Prohibit l'ús amb finalitats comercials sense autorització
  del govern". → Treat as **non-commercial with attribution**, permission requested.

### 3.2 Mobility and traffic (Mobilitat Andorra)

- `https://app.mobilitat.ad/api/v1/` is the public JSON API behind mobilitat.ad: incidents (works, closures, snow,
  accidents), **69 webcams**, points (71 car parks with capacity text, 27 EV charging sites, hospital, CAPs),
  seasonal snow-plan endpoints. No auth; `cache-control: max-age=120`.
- **CORS is locked to `https://www.mobilitat.ad`** → server-side proxy required.
- Undocumented internal API (v1) with no SLA. Legal notice: "Tots els drets estan reservats… només ús personal…
  ús comercial no permès" → **permission requested**.
- Not found: travel times, border queue times, live traffic counts or traffic state. The site's traffic layer is the
  Google Maps TrafficLayer (not reusable). Static traffic intensity (IMD) and the national model exist on SIG.
- `Mobilitat/Accidents_PRE` requires a token (not usable). Cyclist-location tracking was deliberately not used.

### 3.3 Webcams

- **Mobilitat** is the main live-image source: 69 cameras with coordinates, images at
  `imgs.mobilitat.ad/prod/{Name}.gif`. Each is an **animated GIF timelapse (470×320, ~25 frames, ~1.2 MB)**,
  refreshed every **~5–10 min** (Last-Modified measured). No ACAO, so WebGL use needs a proxy.
- meteo.ad's webcam map aggregates 66 markers: 50 Mobilitat GIFs, 10 **feratel** ski cams (curl → 404; embed-only via
  the official player, UNVERIFIED), 2 Naturland MP4 loops (private company, no framing), 3 Projecte 4 Estacions HLS
  cams (snapshot stale), 1 vision-environnement image (**stale**, not usable).
- **Windy Webcams API** needs a key (403 without); free-tier image tokens expire after 10 min.
- No Roundshot/Skaping installation found.

### 3.4 Public transport

- **No public GTFS or GTFS-RT for Andorra.** Mobility Database (6,591 feeds) has 0 `AD` feeds; transit.land has no
  Andorra feed (REST API needs a key). Neighbouring feeds: Catalonia NAP returns 401 without a key; Occitanie liO has
  0 stops inside the Andorra bbox.
- **No live vehicle positions** (no GTFS-RT, SIRI or anything in bus.ad JS). Parish buses and operators
  (Coopalsa, Autocars Nadal, Hispano Andorrana): no feeds found, UNVERIFIED.
- Static network: ArcGIS layers "Línies autobús 2025" (357 stops, 16 line shapes) and `linies_bus_2025` (stops per
  line). Field names (`stop_id`, `stop_code`, `route_name`) suggest an internal GTFS export exists → ask Mobilitat.
- `bus.ad/feed/` RSS carries service notices (POSSIBLE). Timetables exist only as HTML and a 12-page PDF.

### 3.5 Parking and EV charging

- **Andorra la Vella** (comú ArcGIS): `FREEOCCUPANCY`/`TOTALOCCUPANCY` on 13 of 36 car parks (1,709 spaces).
  Values were identical at 08:40, 08:45 and 08:50 UTC → **update frequency UNVERIFIED**.
- Other six comuns: no machine-readable occupancy (static pages, an app, or a citizen login portal). Escaldes and
  Ordino UNVERIFIED.
- Static parking: Mobilitat points (71 with capacity text), IDE WFS (205 points), IDE POI, OSM (417).
- EV chargers: Mobilitat points (27 sites with counts) is the best source. OSM has 11; OpenChargeMap needs a key;
  Endolla.ad does not resolve. **No live charger availability found.**

### 3.6 Weather

- **SMN Andorra (meteo.ad)** has no public open-data API. Official JSON forecast access is by request form (fixed IP
  required). The internal AJAX endpoint `home/DadesActuals` returns current observations for ~29 stations
  (temperature, precipitation, wind, humidity, pressure, snow depth…); positions are pixels on the site map, so it is
  joined to station metadata (Govern ArcGIS layer, 33 points, CORS `*`). No CORS → proxy. Update ~10 min (UNVERIFIED).
- meteo.ad radar is **RainViewer tiles**, not SMN radar. Its satellite view uses a Govern proxy of EUMETSAT MTG whose
  time extent ends 2025-02-11 (stale). That Govern app cannot be framed from other domains.
- meteo.ad widgets ("Ginys") can be iframed (no X-Frame-Options/CSP).
- FEDA publishes 3 stations at 10-min resolution (CORS `*`).
- **Open-Meteo** works (CORS `*`, multi-point, CC BY 4.0, free API non-commercial).
- Neighbour agencies (AEMET, Meteocat, Météo-France) all need keys or tokens.

### 3.7 Snow and avalanche

- **EAWS**: Andorra micro-regions AD-01…AD-03 (GeoJSON) and daily ratings JSON (CORS `*`) published by SMN Andorra.
  Seasonal (Dec–Apr/May). Region data CC BY 4.0; ratings-file licence UNVERIFIED.
- meteo.ad avalanche bulletin: HTML + PDF only (fallback).
- Ski resorts (Grandvalira Resorts): piste status is server-rendered HTML; the 2D map uses a private backend API (not
  used). Off-season during tests.
- Snow depth: meteo.ad tab 10 (one station reporting in October); Mobilitat snow endpoints empty in October.
- Static Govern layers: avalanche hazard zoning, cadastre and regulatory zones.

### 3.8 Environment

- **Air quality (aire.ad):** internal API (`/api/web/mapData`, `/stations`, `/latestData`, `/timeseries`) for 4–7
  stations, hourly, CORS reflects origin. No licence → permission requested. The **EEA** download API serves the
  same stations as open Parquet (~1–2 h lag). OpenAQ needs a key. Open-Meteo CAMS is model data.
- **Hydrology:** 10 river-station points (metadata only). **No live level/flow feed found**; the `Aigua` folder
  needs a token; most gauges belong to Protecció Civil (per AR+I reports). SAIH Ebro downstream not tested further.
- **Noise:** static noise cadastre only. **Other:** historical lightning, climate grids, geohazards (static).
- **AR+I:** research reports and PDFs, no live feed.

### 3.9 Energy (FEDA)

- `https://www.feda.ad/oficina-virtual/api/` (CORS `*`, undocumented): daily energy balance (consumption, imports
  from Spain/France, national production by plant type), history, record, hydro spill, planned outages, 3 weather
  stations. Granularity is **daily (D-1)**, not real-time generation. No licence → permission requested.

### 3.10 Emergency

- No public emergency feed was found. `ARI_INCENDIS` fire-danger services are print-only geoprocessing services;
  `incendis.ad` shows a default web-server page; `Sanitat`, `RiscosGeo` and `Públics` need a token; the accidents
  layer needs a token.
- Usable proxies for emergency awareness: Meteoalarm warnings, EAWS avalanche danger, Mobilitat incidents, FIRMS/EFFIS
  fires, EMSC earthquakes, and static hazard layers.

---

## 4. Global sources — findings

### 4.1 Aircraft

| Source | Result | Verdict |
|---|---|---|
| **adsb.lol** | 200, 13 aircraft in box (84 within 100 nm); no ACAO → proxy; ODbL 1.0 | Primary (best licence) |
| **OpenSky** | 200 anonymous; ACAO locked to opensky-network.org → proxy; 400 credits/day anon, 4,000 with OAuth2; non-profit/education/government use | Fallback |
| adsb.fi | 200, no ACAO; personal non-commercial only, 1 req/s | Possible |
| airplanes.live | **403**, requires contacting them | Not usable |

Coverage of low-altitude traffic inside the valleys depends on volunteer receivers (UNVERIFIED).

### 4.2 Satellites

- CelesTrak `gp.php?GROUP=…&FORMAT=json` (OMM) → 200, CORS `*`.
- **TLE catalogue issue:** `stations` returned 23 objects as OMM JSON but only 20 as TLE; three have **6-digit NORAD
  IDs** (e.g. 100882). CelesTrak states the 5-digit catalogue ran out on 2026-07-11, and TLE can only carry 5-digit
  numbers. → **Use OMM JSON, never TLE.** satellite.js 7 (MIT) reads OMM via `json2satrec`.
- Usage policy: data updates every 2 h; download once per update; error bursts or >100 MB/day can get an IP blocked
  → fetch server-side and cache, never per visitor.

### 4.3 Fires

- **NASA FIRMS** keyless Europe 24 h CSV files → 200 (no ACAO → proxy); 0 detections in the buffer on test day. The
  area API needs a free `MAP_KEY` (server-side only). WMS GetMap needs a key.
- **EFFIS** WMS (burnt areas, fire danger) → 200, CORS `*`, open incl. commercial with Copernicus credit. EFFIS WFS
  returned old hotspots; time filtering UNVERIFIED.

### 4.4 Earthquakes

| Source | 30-day events within ~100 km | Verdict |
|---|---|---|
| **EMSC FDSN** | **11** (M1.2–2.1; authors IGN ×7, ReNaSS ×2, EMSC ×2), CORS `*` | **Best** for the Pyrenees |
| USGS FDSN | **0** (and 0 over 365 days) | Not usable for local coverage |
| IGN Spain | FDSN 404; RSS works (CORS `*`, last few days) | Secondary |
| ICGC | FDSN event service returns 204; documented as unavailable | Not usable |

EMSC also offers a websocket for push updates (connected; no message in 25 s, as expected). Exact EMSC licence text
UNVERIFIED.

### 4.5 Weather alerts

- **Meteoalarm Andorra JSON** (`feeds-andorra`): CAP 1.2 in 4 languages with **polygons for zones nord / centre /
  sud**. Expired warnings are included, so filter on `expires`. No CORS → proxy. "Licensed under terms equivalent to
  CC BY 4.0" plus redistribution T&C (to review). Atom/RSS variants and Spain/France feeds also work.

---

## 5. Basemap and 3D evaluation

### 5.1 Candidates

| Option | Finding | Verdict |
|---|---|---|
| Govern DTM 5 m (`IDE/Andorra_DTM_5m_WGS84/ImageServer`) | Web Mercator **LERC** tile cache, LODs 0–16, ~5–6 m pixels, 774–2942 m, CORS `*`, <0.15 s; Andorra only | Best terrain inside Andorra |
| Govern Orto 2022 tile cache (`Hosted/Mapa_Base_IDE_Orto_2022_WM`) | Tiled 3857, 23 LODs, PNG, CORS `*` | Best imagery with CORS |
| IDE orthophoto 2025 25 cm WMTS | Fast but **no CORS** | Possible via proxy |
| Govern topo basemaps (`Mapa_Base_IDE_WM_Color`, `_Gris`, …) | Tiled 3857, CORS `*` | Topographic alternative |
| AWS / Mapzen Terrarium | Keyless, CORS `*`, plausible heights (960–2,312 m on test tile) | Global terrain fallback |
| Copernicus DEM GLO-30 | Free incl. commercial | Source for a future self-built quantized mesh |
| EOX Sentinel-2 cloudless 2024 | Keyless; 10 m; non-commercial licence (per-year licence UNVERIFIED on current page) | Context imagery outside Andorra |
| Esri World Imagery | Works keyless; terms normally require an ArcGIS account (grey area) | Needs review |
| OSM tiles / CARTO / MapTiler | Usage-policy or key limits | Possible |
| Google Photorealistic 3D Tiles | 1,000 free root requests/month, then billed; no caching; Andorra coverage **UNVERIFIED** | Optional |
| Cesium ion (World Terrain, Google 3D asset) | Community plan personal/non-commercial; quotas | Optional |

### 5.2 Chosen solution

- **Composite terrain:** Govern **5 m DTM** (ArcGIS LERC elevation tiles) **inside the border**, **AWS/Mapzen
  Terrarium** everywhere else.
- **Imagery:** Govern **orthophoto 2022** tile cache drawn over **EOX Sentinel-2 cloudless 2024**. The Govern tiles are
  filled with **rgb(248,248,248)** outside the border; that colour is keyed out to transparent so Sentinel-2 shows
  through. The Govern topographic basemap (`Mapa_Base_IDE_WM_Color`) is offered as an alternative.
- **Optional upgrades via environment keys:** Google Photorealistic 3D Tiles and Cesium ion World Terrain.
- Result: $0, no keys required, best available resolution inside Andorra, global fallback if Govern SIG is down.

### 5.3 Headless-browser caveat

`sig.govern.ad` returns **HTTP 500** to user agents containing "HeadlessChrome". Automated visual tests must use a
real (headed) browser. This has **no impact on users**.

---

## 6. Hosting evaluation

| Option | Findings | Fit |
|---|---|---|
| Vercel Hobby | Non-commercial personal use only; **cron at most once per day** (±59 min) | Poor for near-real-time polling |
| Cloudflare Workers Free | 100,000 requests/day, 10 ms CPU/request, 5 cron triggers, 50 subrequests; KV free only 1,000 writes/day (use Cache API instead); no non-commercial clause | Good for a cached API proxy |
| Google Cloud Run | Free tier reported as 2M requests/month (exact figures UNVERIFIED); needs billing account | Possible, more setup |
| Cloudflare Pages | Free static hosting, no non-commercial clause | Good (alternative) |

**Chosen:** static Vite build on **GitHub Pages** (owner's choice) + one **Cloudflare Worker** acting as a cached
`/api` proxy. Pull-through edge caching bounds the upstream request rate regardless of visitor count. Cloudflare Pages
also works without code changes (same origin).

---

## 7. Gaps and open questions

| Gap | Status |
|---|---|
| Reuse licence for Govern SIG, Mobilitat, meteo.ad, aire.ad, FEDA, Comú d'Andorra la Vella data | None published; permission requested (see below) |
| GTFS / GTFS-RT for national buses | None public; internal export likely exists |
| Live bus positions, travel times, border queues, live traffic state | Not found |
| Parking occupancy outside Andorra la Vella; freshness of ALV occupancy | Not found / UNVERIFIED |
| Live EV charger availability | Not found |
| Live river levels and flows | Not public (Protecció Civil) |
| Ski piste status as data | HTML only; private API not used |
| Google 3D coverage over Andorra | UNVERIFIED |
| Low-altitude ADS-B reception in the valleys | UNVERIFIED |
| Meteoalarm T&C redistribution terms; EMSC and EAWS ratings exact licences | To review / UNVERIFIED |
| EOX per-year licence; Cloud Run free-tier figures | UNVERIFIED |
| feratel webcams, Escaldes and Ordino parking, parish buses | UNVERIFIED |

### Recommended permission requests

1. **Àrea de Cartografia (Govern):** reuse of DTM, orthophoto, parishes, roads and bus layers; preferred attribution;
   expected tile load.
2. **Departament de Mobilitat:** reuse of `app.mobilitat.ad/api/v1` (incidents, cameras, points); whether a GTFS
   export exists.
3. **Servei Meteorològic Nacional:** observation data access (the official request form exists).
4. **Àrea de Medi Ambient (aire.ad), FEDA, Comú d'Andorra la Vella:** reuse terms; update frequency of parking
   occupancy.
5. Optional: **Grandvalira Resorts** (piste status, feratel embeds).

The owner decided (2026-10-06) to publish unlicensed Andorran sources with visible attribution and an "unofficial /
permission requested" label while these requests are pending. If a provider refuses, the layer is disabled or removed
and `permissionPending` is updated in `src/config/dataSources.ts`.

---

## 8. Implementation recommendation

1. **Build a new, lean TypeScript app** (Vite + CesiumJS, no UI framework). Do not fork GEV; reuse its ideas only. Keep
   the MIT notice if any GEV module is copied later.
2. **Base map:** composite terrain (Govern DTM 5 m + Terrarium) and Govern ortho 2022 over Sentinel-2 cloudless 2024,
   with Google 3D and Cesium ion as optional key-gated upgrades.
3. **One framework-free API handler deployed as a Cloudflare Worker**, used for every source without CORS, every
   secret, and every small Andorran server that must be protected: edge cache with TTL, last-known-good fallback,
   in-flight deduplication, timeouts and bounded retries.
4. **Browser-direct** only for CORS-open, keyless sources (EMSC, EAWS, ALV parking, Govern tiles).
5. **Build-time snapshots** for static reference layers (Govern SIG boundaries, roads, bus network, station
   metadata; OSM places and POIs) committed under `public/data/`.
6. **Live layers for the MVP:** aircraft (adsb.lol → OpenSky), satellites (CelesTrak OMM + satellite.js), fires (FIRMS
   VIIRS), earthquakes (EMSC), warnings (Meteoalarm), avalanche danger (EAWS), traffic incidents, webcams and car parks
   (Mobilitat), ALV parking occupancy, weather observations (meteo.ad), air quality (aire.ad), energy (FEDA).
7. **Transparency:** every value carries its source, source timestamp and ingestion time; unlicensed sources show a
   "No oficial" tag; stale fallbacks are labelled.
8. **Privacy:** never query personal-data endpoints (cyclist tracking, citizen forms, accidents); drop aircraft
   registrations in the adapter.
9. **Send the permission requests** in section 7 and track replies in the source registry.
