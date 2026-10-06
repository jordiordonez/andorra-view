# Phase 0 — God's Eye View (GEV) source audit for "Andorra View"

Audit date: 2026-10-06. Clone: `scratchpad/gev/repo` (shallow, `--depth 1`). Nothing was installed, built or executed from the repo.
All file paths below are relative to `scratchpad/gev/repo/`.

## 1. Canonical repository — identification

| Field | Value | Evidence |
|---|---|---|
| URL | https://github.com/bilawalsidhu/gods-eye-view | `gh repo view` |
| Owner | GitHub user `bilawalsidhu` (id 106619546, name "Bilawal Sidhu", blog `https://spatialintelligence.ai`) | `gh api users/bilawalsidhu` |
| Is fork? | No (`isFork: false`, `parent: null`) | `gh repo view` |
| Stars / forks | 48,094 stars / 9,791 forks (2026-10-06) | `gh repo view` |
| Created | 2026-06-22 | `gh api` |
| Last commit (HEAD of main) | `9542a5e` 2026-10-05 22:50:34 -0700, "Merge pull request #947 … fix/near-view-recovery-uses-app-search" (merged by Sameh Khamis) | `git log -1` |
| Last push | 2026-10-06T05:50:37Z | `gh api` |
| Homepage | https://maptheworld.ai/ (Bilawal's newsletter) | repo metadata; README footer |
| Version | 0.2.1 (released 2026-10-02 per `CHANGELOG.md`) | `package.json`, `CHANGELOG.md` |
| Maintainers | Bilawal Sidhu + Sameh Khamis "at Halfpixel" (`.github/CODEOWNERS`: `* @bilawalsidhu @samehkhamis`) | `README.md` L536, `CONTRIBUTING.md` |
| Former name | "WorldView" — README L19: *"From the project behind the viral God's Eye View series _(formerly WorldView)_"*; repo topic `worldview` | `README.md` |

Ownership verification: the repo lives under Bilawal's own GitHub account (which has only 2 public repos: `gods-eye-view` and `see-through-walls`), README links to his X account (`x.com/bilawalsidhu/status/2093798887815348521`) and YouTube channel, and third-party press (digg, ossinsight, aitoolly) describes it as Bilawal Sidhu open-sourcing God's Eye View V1 under MIT. I did NOT fetch his X post or bilawal.ai directly (X requires login) — the cross-link from X → repo is therefore UNVERIFIED by me first-hand, but the evidence from the owner account is strong. Conclusion: **this is the canonical, official repository.**

Note README L532 itself: *"This is the canonical live 3D client from the project that kicked off the recent wave of spatial-intelligence tools."*

### Forks / clones / community derivatives (NOT canonical)
From `gh search repos "gods eye view"`:
- `uhrichsam4/gods-eye-view` (370★) — self-described "Fork with world camera packs (~5,200 cameras, 20 countries)". Community fork; cameras list not inspected (UNVERIFIED whether any Andorra/Pyrenees cams).
- `WorldPixelMap/android-gods-eye-view` (35★) — Web + Android variant.
- `larrywcox/omarchy-gods-eye-view`, `asabino2/gods_eye_view_pinokio` — launchers.
- `ianborders/gods-eye-view`, `jazzjabu1939/gods-eye-view-teaching`, `moneyman281994/GODS-EYE`, etc. — mirrors/copies.
- `KamalDevelopers/GodsEyeView` — unrelated ("operating system").
None of these are needed: the official repo is open source.

## 2. License (exact)

- `LICENSE`: **MIT** — "Copyright (c) 2026 Bilawal Sidhu" — standard MIT text. `package.json`: `"license": "MIT"`.
- GitHub's detector reports `NOASSERTION`/"Other" because the LICENSE file appends a data carve-out. SPDX for the code = **MIT**.
- Attribution requirement (MIT): keep the copyright + permission notice in all copies/substantial portions.
- Carve-out quoted from `LICENSE`: *"THE MIT LICENSE ABOVE COVERS THE SOURCE CODE ONLY. The datasets bundled under src/data/local_data/, and all data fetched from third-party providers at runtime, are owned by their respective sources and are NOT licensed under MIT."*
- Non-commercial items explicitly flagged:
  - TeleGeography submarine cables (`src/data/local_data/telegeography_submarine_cables/`) — **CC BY-NC-SA 3.0**.
  - Bhote Koshi flood event pack (`public/events/bhote-koshi-2026/`, `src/data/bhoteKoshiFloodPath.js`) — **CC BY-NC 4.0** (Vantor/GeoPera).
- ODbL 1.0 bundled data: datacenters, dams, military names (OSM/Overture).
- 3D models `public/models/*.glb` — **CC BY 4.0** Sketchfab authors (see `public/models/README.md`), commercial OK with credit + modification notice.
- README media GIFs: *"aren't licensed for standalone reuse"* (`README.md` L538).
- Third-party npm: `@jtarrio/webrtlsdr`, `@jtarrio/signals` Apache-2.0 (`THIRD_PARTY_NOTICES.md`).
- CONTRIBUTING: *"By contributing, you agree your contributions are licensed under the project's MIT License."*
- Ethics line (README L530): no named-person search, face recognition, or tracking individuals — consistent with the user's own personal-data rule.

## 3. Tech stack

| Item | Value | Evidence |
|---|---|---|
| Framework | **None** — vanilla JS ES modules | README L378 "No framework. Vanilla JavaScript, CesiumJS, and Vite" |
| CesiumJS | `cesium ^1.124.0` in package.json; **lockfile resolves 1.138.0** (`@cesium/engine` 22.3.0) | `package-lock.json` |
| Bundler | Vite `^6.0.0` (lock 6.4.3) + `vite-plugin-cesium ^1.2.23` | `package.json` |
| Backend | No separate server: Node "providers" mounted as **Vite dev/preview middleware plugins** (`server/standalone/vite.config.js` → `localProviderPlugins()` from `server/providers/local.js`), plus an MCP server (`server/mcp/`, `npm run mcp`) | files listed |
| Node | `>=24.14.0 <25 || >=26 <27` | `package.json` engines |
| Other deps | satellite.js 6 (SGP4), hls.js (live HLS cams), mgrs, egm96-universal (geoid), pbf + @mapbox/vector-tile (OpenFreeMap/TomTom MVT), eccodes-wasm (GRIB2 wind), webrtlsdr (WebUSB SDR) | `package.json` |
| Tests | Custom node runner + puppeteer QA gates (`scripts/qa-*.mjs`) | `CONTRIBUTING.md` |
| Distribution | Pinokio launcher (`pinokio/`) or `git clone && npm ci && npm run dev` on localhost:4173 | README |

## 4. Architecture

### 4.1 Map init — `src/app/viewer.js` (L109–141), `src/main.js`, `src/maps/*`
- `new Cesium.Viewer(container, { timeline:false, animation:false, baseLayerPicker:false, geocoder:false, … baseLayer:false, msaaSamples:4, contextOptions:{webgl:{preserveDrawingBuffer:true}} })`; `targetFrameRate=60`; `scene.globe.show=false` (Google 3D tiles carry the surface); sky atmosphere tweaked; Metal atmosphere workaround (`app/atmosphereCompat.js`).
- `src/main.js` → `createStandaloneApplication({ googleApiKey: import.meta.env.GOOGLE_MAPS_API_KEY, cesiumToken: import.meta.env.CESIUM_ION_TOKEN })`.
- Basemap ladder (`src/maps/google3d.js`, `src/maps/defaultSources.js`, `src/mapStackController.js`):
  1. Google key → `Cesium.createGooglePhotorealistic3DTileset({ key, onlyUsingWithGoogleGeocoder: true })`.
  2. Server-minted short-lived Google token → `Cesium3DTileset.fromUrl(GoogleMaps.mapTilesApiEndpoint + 'v1/3dtiles/root.json', Bearer)`.
  3. Cesium ion token → `IonResource.fromAssetId(2275207)` (ion-hosted Google Photorealistic 3D).
  4. Keyless → Esri World Imagery (`https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer`, `src/maps/imagery.js`), auto-fallback to OSM `https://tile.openstreetmap.org/`.
- Terrain (`src/maps/terrain.js`): ion asset 1 (Cesium World Terrain) if ion token; else keyless **Re:Earth/Mapterhorn** quantized mesh `https://terrain.reearth.land/cesium-mesh/ellipsoid` (CC BY 4.0), fallback flat ellipsoid.
- Height alignment: `/api/terrain/heights` proxy → `https://terrain.reearth.land/heights.json` (30-day disk cache), EGM96 geoid (`src/data/geoid.js`).

### 4.2 Camera / navigation
- `src/camera.js`: presets (Austin, SF, NYC) and `flyToAustin` cinematic intro (setView 25 km nadir → flyTo 600 m, pitch −30°, CUBIC_IN_OUT).
- Larger systems: `src/cameraVerbs.js`, `src/navigationPolicy.js`, `src/cameraGroundGuard.js`, `src/orbit.js`, `src/cockpitTracking.js` (cockpit ride-along), `src/director/` (scene director/camera tours), `src/ui/navigationController.js`, share links (`src/sharelink.js`).

### 4.3 Layer architecture
- CONTRIBUTING: *"Layer factories live in `src/layers/<family>/`, with source, record, controller and renderer owners implementing the layer interface (`init/enable/disable/update/destroy/getStats`, optional `getDetectableObjects`)."* *"Sources acquire records; renderers own Cesium resources."*
- Families: aircraft, alpr, awareness, bikeshare, cctv, cyclones, directions, earthquakes, firms, flights, installations, launches, localAdsb, military, perimeters, radio, recentImagery, satellites, submarineCables, traffic, transit, vessels, weather, wind.
- Assembly in `src/app/` (`constructCatalog.js`, `catalog.js`), lifecycle `src/data/lifecycle.js`, manager `src/data/manager.js`.
- Attribution registry: `src/data/dataCredits.js` → `viewer.creditDisplay.addStaticCredit(...)`.
- Package `exports` in `package.json` expose many modules individually (e.g. `./layers/earthquakes/source`, `./layers/satellites/source`, `./ui/effects`) — designed for component reuse.

### 4.4 Entity rendering
- Interpolated motion one interval behind real time + dead reckoning (`src/data/motionModel.js`, `FLEET_DR_INTERVAL_MS = 80` in `src/layers/flights/policy.js`).
- Screen-projected true heading for icons (`src/data/iconOrientation.js`).
- Per-class glTF models swap in on approach (`public/models/*.glb`, `src/data/modelEligibility.js`).
- Satellites: SGP4 via satellite.js with orbit rings GMST-realigned (`src/layers/satellites/rendering.js`).
- CCTV: frames projected as planes into the 3D scene with viewshed volumes and drag-calibration gizmo (`src/data/cctvViewshed.js`, `src/data/cctvGizmo.js`).
- Detection overlay: screen-space boxes (`src/data/detection*.js`).
- Label arbitration (`src/data/labelArbiter.js`); test `src/noCesiumLabels.test.mjs` suggests custom labels rather than Cesium labels.

### 4.5 Shaders / visual modes — `src/styles/*.js`, pipeline `src/ui/visualEffects.js` (`new PostProcessStage`), presets `src/ui/visualPresets.js`, bloom `src/bloom.js`
- `retro.js` — **CRT** terminal (pixelation, Bayer dither, barrel distortion, scanlines, chromatic aberration, phosphor ghosting).
- `surveillance.js` — **NVG** PVS-14 (P43 green, tube bloom, honeycomb, scintillation).
- `thermal.js` — **FLIR** white-hot/black-hot + Ironbow palette, uniforms sensitivity/bloom/mode/pixelation/palette.
- `noir.js`, `snow.js`, `anime.js`; plus sharpen shader and cyber-sonar (`src/cyberSonar*.js`), scope mask, cockpit cloud effects.
- Keys `1`–`7` switch styles (README L216).

## 5. Data providers (complete inventory)

Legend: **Proxy** = fetched server-side via the Vite middleware route; **Direct** = browser fetches upstream.

| # | Provider | Endpoint (from source) | Auth / env var | Refresh / cache | Proxied? | Files | Andorra (42.43–42.66 N, 1.41–1.79 E)? |
|---|---|---|---|---|---|---|---|
| 1 | **Google Photorealistic 3D Tiles** | Cesium `createGooglePhotorealistic3DTileset` / `tile.googleapis.com` `v1/3dtiles/root.json` | `GOOGLE_MAPS_API_KEY` (client-exposed) | streaming tiles | Direct (key in bundle) or server token | `src/maps/google3d.js` | Global product; actual photogrammetry coverage over Andorra la Vella/Escaldes **UNVERIFIED** (must test) |
| 2 | **Cesium ion** (Google 3D asset 2275207; World Terrain asset 1; Bing imagery) | `api.cesium.com`, `assets.ion.cesium.com` | `CESIUM_ION_TOKEN` (client-exposed) | — | Direct | `src/maps/google3d.js`, `src/maps/terrain.js`, `src/maps/imagery.js` | Global; Community plan is **personal/non-commercial** |
| 3 | Esri World Imagery | `services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer` | none | tiles | Direct | `src/maps/imagery.js` | Global ✅ |
| 4 | OSM raster tiles | `tile.openstreetmap.org` | none | tiles | Direct | `src/maps/imagery.js` | Global ✅ (OSMF tile usage policy) |
| 5 | Re:Earth / Mapterhorn terrain + heights | `terrain.reearth.land/cesium-mesh/ellipsoid`, `/heights.json` | none | heights 30-day disk cache | mesh Direct, heights Proxy `/api/terrain/heights` | `src/maps/terrain.js`, `server/providers/terrain.js` | Global ✅ (important for Pyrenees relief) |
| 6 | **OpenSky** (aircraft) | `https://opensky-network.org/api/states/all?extended=1` (global snapshot); OAuth `auth.opensky-network.org/.../token`; tracks `opensky-network.org/api/tracks/all` | `OPENSKY_AUTH_MODE` (oauth/basic/auto/anon), `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`, `OPENSKY_CREDENTIALS_FILE` | client poll 30 s (`src/layers/flights/queries.js` `updateInterval: 30000`); server cache 9 s | Proxy `/api/flights` | `server/providers/aircraft/opensky.js`, `tracks.js` | Global ✅ for overflights; low-altitude ADS-B reception in the valleys **UNVERIFIED**. **Non-commercial license.** |
| 7 | adsb.lol (fallback + military + traces) | `api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{nm}`, `api.adsb.lol/v2/mil`, `adsb.lol/data/traces/...` | none | military client 15 s; server cache 12 s | Proxy `/api/flights`, `/api/military`, `/api/military/track` | `server/providers/aircraft/adsb-lol.js`, `opensky.js`, `tracks.js` | Global ✅ (ODbL) |
| 8 | adsbdb enrichment | `api.adsbdb.com/v0/aircraft/…`, `/v0/callsign/…` | none | 24 h disk cache | Proxy `/api/adsbdb` | `server/providers/aircraft/enrichment.js` | Global; route data has redistribution restriction |
| 9 | AISStream (vessels) | `wss://stream.aisstream.io/v0/stream` | `AISSTREAM_API_KEY`, `AISSTREAM_BOUNDING_BOXES`, `VITE_AIS_LIVE_API_URL`, … | client 60 s | Proxy `/api/vessels` (server websocket) | `server/providers/vessels/ais-live.js` | ❌ irrelevant (landlocked) |
| 10 | **CelesTrak** (satellites) | `https://celestrak.org/NORAD/elements/gp.php?GROUP=<group>&FORMAT=tle` | none | server TLE disk cache 6 h; client catalog ~5 min; SGP4 every frame | Proxy `/api/celestrak/<group>` | `server/providers/space/celestrak.js`, `src/layers/satellites/source.js` | Global ✅ (passes over Andorra) |
| 11 | Launch Library 2 | `https://ll.thespacedevs.com/2.3.0/launches/` | `LL2_API_TOKEN` optional | 15 min cache | Proxy `/api/launches` | `server/providers/space/launch-library.js` | Global (not Andorra-specific) |
| 12 | **NASA FIRMS** (fires) | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{KEY}/{SOURCE}/world/2` (VIIRS NOAA-20/21/SNPP + MODIS) | `FIRMS_MAP_KEY` (server only) | client 10 min (`src/layers/firms/policy.js`); server 30 min | Proxy `/api/firms` | `server/providers/firms.js`, `src/data/firmsCsv.js` | Global ✅ (Andorra: rare detections; area API could be bbox-limited instead of `world`) |
| 13 | NIFC WFIGS perimeters + InciWeb | `services3.arcgis.com/T4QMspbfLg3qTGWY/...`, `inciweb.wildfire.gov` | none | 5 min | Proxy `/api/fire-perimeters` | `server/providers/firePerimeters.js` | ❌ US only |
| 14 | **USGS earthquakes** | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson` | none | 60 s (`src/layers/earthquakes/index.js`) | **Direct** (browser) | `src/layers/earthquakes/source.js` | Global, but M<2.5 outside US often missing → Pyrenees microseismicity under-represented; IGC/IGN Spain would be better (not in repo) |
| 15 | **TomTom traffic flow** | `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.pbf` | `TOMTOM_API_KEY`, `TOMTOM_DAILY_TILE_BUDGET` (6000) | 120 s tile cache | Proxy `/api/tomtom` | `server/providers/traffic.js`, `src/data/tomtomTiles.js` | Andorra flow coverage **UNVERIFIED**. Without key: simulated cars on OSM roads (global) |
| 16 | OpenFreeMap / OpenMapTiles vector tiles | `https://tiles.openfreemap.org/planet` | none | — | Direct | `src/sources/openFreeMap.js`, `src/layers/traffic/source.js` | Global ✅ (roads for traffic sim, military polygons) |
| 17 | Overpass (OSM) | operator-configured only | `OVERPASS_UPSTREAMS` (empty by default; README says public servers now refuse old versions) | 24 h mem / 7 d disk | Proxy `/api/overpass` | `server/providers/overpass/*` | Global if you run/pay an instance |
| 18 | OSM ALPR (DeFlock) | `https://tiles.dontgetflocked.com/cameras-${country}-hourly.json` | none | 1 h | Direct | `src/layers/alpr/source.js` | ❌ US/Canada only (DATA_SOURCES: "Other regions show no ALPR data") |
| 19 | **CCTV packs** | Austin `data.austintexas.gov/api/views/b4k4-adkb/rows.json` + `cctv.austinmobility.io/image/…`; TxDOT `its.txdot.gov`; Caltrans `cwwp2.dot.ca.gov/data/d{n}/cctv/…`; TfL `api.tfl.gov.uk/Place/Type/JamCam` + S3; Ontario `511on.ca/api/v2/get/cameras`; Fintraffic `tie.digitraffic.fi/api/weathercam/v1/stations`; DriveBC `drivebc.ca/api/webcams/`; Tallinn `ristmikud.tallinn.ee`; Tarktee `tarktee.transpordiamet.ee/api/v1/datex/…`; Warendorf `webcam.warendorf.de`; NSW `data.livetraffic.com/cameras/traffic-cam.json`; Calgary `data.calgary.ca/resource/k7p9-kppz.json`; DelDOT `tmc.deldot.gov/json/videocamera.json` (HLS); Statens vegvesen `ogckart-sn1.atlas.vegvesen.no/...` (HLS) | `CCTV_*` env vars (see .env.example) ; Street View fallback uses `GOOGLE_MAPS_SERVER_API_KEY` | catalog 15 min; active frame 10 s; idle 60 s | Proxy `/api/cctv`, `/api/cctv/frame/`, `/api/cctv/media/` (only server-registered URLs) | `server/providers/cctv/constants.js`, `sources.js`, `config/cctv_sources.*.json` | ❌ **No Andorra / Spain / France source.** Need a new pack (pattern reusable) |
| 20 | Google Street View Static (CCTV fallback) | `maps.googleapis.com/maps/api/streetview` | `GOOGLE_MAPS_SERVER_API_KEY` | — | Proxy | `server/providers/cctv.js` | Andorra Street View coverage exists (UNVERIFIED in detail) |
| 21 | Google Places / Geocoding | `places.googleapis.com/v1/places`, `maps.googleapis.com/maps/api/geocode/json` | `GOOGLE_MAPS_SERVER_API_KEY`/`GOOGLE_MAPS_API_KEY`, `GEV_RATELIMIT_GOOGLE_PER_MIN` | — | Places Proxy; Geocode Direct | `server/providers/places/google.js`, `src/search/*` | Global ✅ |
| 22 | Photon / Nominatim geocoding | `photon.komoot.io/api/`, `nominatim.openstreetmap.org/search` | none | 5 min, ≤1 req/s | Photon Direct; Nominatim Proxy `/api/geocode` | `src/keylessGeocoder.js`, `server/providers/regional/place.js` | Global ✅ |
| 23 | OSRM (FOSSGIS) routing | `routing.openstreetmap.de/routed-${profile}` | none | 10 min | Proxy `/api/route` | `server/providers/places/routes.js` | Global ✅ (commercial use restricted) |
| 24 | Wind NOAA GFS / ECMWF IFS | `noaa-gfs-bdp-pds.s3.amazonaws.com`, `data.ecmwf.int/forecasts` | none | 1 h | Proxy `/api/wind` | `server/providers/wind/*` | Global ✅ (0.25° ≈ 25 km, coarse for Andorra) |
| 25 | NOAA nowCOAST radar/satellite/lightning | `nowcoast.noaa.gov/geoserver/observations/…` | none | metadata 2–10 min | Proxy `/api/weather` | `server/providers/weather.js` | Radar ❌ CONUS only; GOES regional ❌; global IR ✅ (coarse); lightning ❌ (coverage 110°E→0° Americas/Pacific, Andorra is east of 0°) |
| 26 | NOAA NHC/CPHC cyclones | `nhc.noaa.gov/CurrentStorms.json` + `mapservices.weather.noaa.gov/...` | none | 5 min | Proxy `/api/cyclones` | `server/providers/cyclones.js` | ❌ |
| 27 | Open-Meteo (cockpit weather) | `api.open-meteo.com/v1/forecast` | none | 5 min, 0.1° cells | Proxy `/api/weather-effects`, `/api/regional-brief` | `server/providers/regional/weather*.js` | Global ✅ (CC BY 4.0) |
| 28 | Google News RSS / GDELT | `news.google.com/rss/search`, `api.gdeltproject.org/api/v2/doc/doc` | none | 5 min | Proxy `/api/regional-brief` | `server/providers/regional/news.js` | Global; Google News = personal/non-commercial |
| 29 | NASA GIBS / CMR (Recent Imagery: HLS Sentinel-2/Landsat, VIIRS) | `gibs.earthdata.nasa.gov`, `cmr.earthdata.nasa.gov/search`, `wvs.earthdata.nasa.gov/api/v1/snapshot` | none | on demand | Direct | `src/layers/recentImagery/*` | Global ✅ (30 m HLS useful for Andorra) |
| 30 | Transit GTFS-RT | MBTA, CapMetro, Metro Transit, OVapi, Entur, TransLink, HSL | none | 15 s | Proxy `/api/transit` | `src/data/transitFeeds.js`, `server/providers/transit.js` | ❌ none for Andorra (pattern reusable if a GTFS-RT exists — UNVERIFIED) |
| 31 | GBFS bikeshare | Lyft/BCycle/publicbikesystem (US/CA cities) | none | 60 s | Proxy `/api/gbfs` | `src/layers/bikeshare/registry.js` | ❌ |
| 32 | Radio Browser | `all.api.radio-browser.info/json/servers`, `de1/de2/nl1.api.radio-browser.info` | none | 45 min | Proxy `/api/radio` | `server/providers/radio/*` | Global; Andorran stations likely present (UNVERIFIED) |
| 33 | Military installations | OpenFreeMap + bundled Overture/OSM names; optional Overpass/Places | — | 5 min | Proxy `/api/military-installations` | `server/providers/military-installations/*` | Global (marginal for Andorra) |
| 34 | **OpenAI** (voice + HUD summary) | `api.openai.com/v1/realtime/client_secrets` (server mints ephemeral token), browser → `api.openai.com/v1/realtime/calls` (WebRTC); `api.openai.com/v1/responses` for HUD | `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL=gpt-realtime-2`, `OPENAI_REALTIME_MODEL_MINI`, `OPENAI_REALTIME_VOICE`, `OPENAI_REALTIME_REASONING_EFFORT`, `OPENAI_REALTIME_CONTEXT_TOKENS`, `OPENAI_REALTIME_CONTEXT_RETENTION`, `OPENAI_HUD_SUMMARY_MODEL=gpt-5-nano`, `GEV_RATELIMIT_OPENAI_PER_MIN` | HUD every 15 s; $2 warn / $5 hard cap | Proxy `/api/realtime/token`, `/api/openai/hud-summary` | `server/providers/openai/*`, `src/voice/*` | Global ✅ (language/cost; and NB: screenshots may be sent to OpenAI) |
| 35 | Local ADS-B receivers / WebUSB RTL-SDR | `LOCAL_RECEIVER_FEEDS` (LAN `aircraft.json`) | — | 1 s | Proxy `/api/local-receivers/aircraft` | `server/providers/local-receivers.js`, `src/sdr/` | ✅ — interesting option: own receiver in Andorra |
| 36 | Bundled static: datacenters, dams, submarine cables, Natural Earth, US counties, SF neighborhoods | `src/data/local_data/*` | — | — | — | — | Natural Earth ✅ (Andorra admin-0 polygon); others mostly irrelevant |

### Environment variables (complete, from `.env.example` + README)
`GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_SERVER_API_KEY`, `GEV_RATELIMIT_GOOGLE_PER_MIN`, `CESIUM_ION_TOKEN`, `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_MODEL_MINI`, `OPENAI_REALTIME_VOICE`, `OPENAI_REALTIME_REASONING_EFFORT`, `OPENAI_REALTIME_CONTEXT_TOKENS`, `OPENAI_REALTIME_CONTEXT_RETENTION`, `OPENAI_HUD_SUMMARY_MODEL`, `GEV_RATELIMIT_OPENAI_PER_MIN`, `OPENSKY_AUTH_MODE`, `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`, `OPENSKY_CREDENTIALS_FILE`, `LL2_API_TOKEN`, `PORT`, `HOST`, `GEV_ALLOWED_HOSTS`, `FIRMS_MAP_KEY`, `VITE_AIS_LIVE_API_URL`, `VITE_AIS_LIVE_MAX_ROWS`, `VITE_AIS_LIVE_LABEL_MAX_ROWS`, `AISSTREAM_API_KEY`, `AISSTREAM_BOUNDING_BOXES`, `AISSTREAM_MESSAGE_TYPES`, `AISSTREAM_SILENCE_TIMEOUT_MS`, `LOCAL_RECEIVER_FEEDS`, `TOMTOM_API_KEY`, `TOMTOM_DAILY_TILE_BUDGET`, `CCTV_SOURCES_FILE`, `CCTV_SOURCES_JSON`, `CCTV_AUSTIN_ROWS_URL`, `CCTV_AUSTIN_MAX_SOURCES`, `CCTV_CALTRANS_DISTRICTS`, `CCTV_CALTRANS_MAX_SOURCES`, `CCTV_TFL_ENABLED`, `CCTV_TFL_MAX_SOURCES`, `CCTV_ONTARIO_ENABLED`, `CCTV_ONTARIO_MAX_SOURCES`, `CCTV_FINTRAFFIC_ENABLED`, `CCTV_FINTRAFFIC_MAX_SOURCES`, `CCTV_DRIVEBC_MAX_SOURCES`, `CCTV_DRIVEBC_ENABLED`, `CCTV_TXDOT_ENABLED`, `CCTV_TXDOT_DISTRICTS`, `CCTV_TXDOT_MAX_SOURCES`, `CCTV_TALLINN_ENABLED`, `CCTV_TALLINN_MAX_SOURCES`, `CCTV_TARKTEE_ENABLED`, `CCTV_TARKTEE_MAX_SOURCES`, `CCTV_WARENDORF_ENABLED`, `CCTV_NSW_ENABLED`, `CCTV_NSW_MAX_SOURCES`, `CCTV_CALGARY_ENABLED`, `CCTV_CALGARY_MAX_SOURCES`, `CCTV_CALGARY_ROWS_URL`, `CCTV_VEGVESEN_ENABLED`, `CCTV_VEGVESEN_MAX_SOURCES`, `CCTV_VEGVESEN_VIDEO`, `CCTV_VEGVESEN_URL`, `CCTV_MAX_SOURCES`, `CCTV_PREFER_AUSTIN`, `CCTV_FORCE_AUSTIN`, `CCTV_DELDOT_ENABLED`, `TFL_APP_KEY` (DATA_SOURCES), `OVERPASS_UPSTREAMS`, `GEV_EMBED_FRAME_ANCESTORS`.
Client-exposed by design: `GOOGLE_MAPS_API_KEY`, `CESIUM_ION_TOKEN` (and `VITE_*`). All others server-side.

## 6. Deployment assumptions
- Local-first: binds localhost:4173; providers run inside the **Vite dev or preview server** (`server/standalone/vite.config.js`). SECURITY.md L3: *"not as a hardened production service."* CONTRIBUTING: *"Vite preview is for checking a local build; it is not a production server."*
- No Dockerfile / Vercel / Netlify config. LAN share opt-in (`HOST=0.0.0.0`) warns that it brokers keys to anyone. Pinokio LAN/Cloudflare sharing disabled.
- Caches on local disk under `.gev-cache/` (process.cwd()) — assumes a persistent single-instance host; *"concurrent replicas behind one origin are out of scope"* (docs/CURRENT-STATE.md L3283).
- Strict CSP in `build/vite.js` (`BROWSER_CSP`); host check plugin; per-IP in-memory rate limits.
- Hosted version planned by Halfpixel (README L559) — not part of the repo.
- Implication for Andorra View: a public web deployment requires extracting the `server/providers/*` handlers into a real server (Node/Express, serverless functions or Supabase Edge Functions) — they are written as Connect-style middleware so this is feasible but is new work.

## 7. Andorra applicability summary
Works well over Andorra: Esri/OSM basemaps, Re:Earth terrain (or ion world terrain), Google 3D (coverage to verify), OpenSky/adsb.lol overflights, CelesTrak satellites, FIRMS (sparse), USGS (sparse; small Pyrenean quakes likely missing), Open-Meteo, GFS/ECMWF wind (coarse), NASA GIBS/HLS imagery, OpenFreeMap roads + simulated traffic, Nominatim/Photon/OSRM, Radio Browser, local ADS-B receiver.
Does not work / irrelevant: AIS vessels, all CCTV packs (no Andorra/Catalonia/Occitanie cams), ALPR (US/CA), transit GTFS-RT, GBFS bikeshare, NOAA radar/lightning/GOES regional, NHC cyclones, NIFC perimeters, Austin/SF/NYC presets, bundled US datasets.
Andorra-specific sources must be added from scratch (out of scope here; all UNVERIFIED): Govern d'Andorra / Mobilitat webcams and traffic, ski-resort webcams, Meteo Andorra, IGN/ICGC seismic, DGT/Servei Català de Trànsit feeds for border approaches.

## 8. Reuse — legal view
- **Code**: MIT → can fork, copy modules, modify, use commercially, relicense the combined work, provided the MIT notice (Copyright (c) 2026 Bilawal Sidhu) is kept in copies/substantial portions (e.g. a `THIRD_PARTY_NOTICES` entry + header in copied files).
- **Do NOT carry over**: TeleGeography folder (NC), Bhote Koshi pack + `bhoteKoshiFloodPath.js` (NC), README media GIFs, any branding ("God's Eye View", logo `public/logo.svg`) — trademarks/branding aren't granted by MIT; avoid implying endorsement.
- **3D models**: CC BY 4.0 — reusable with credit + modification notes (copy `public/models/README.md` rows).
- **Runtime data terms are independent of the code** and matter more: OpenSky (non-commercial; operational use may need written agreement), Cesium ion Community (personal/non-commercial), Google Maps Platform ToS (no caching; attribution; billing), Google News RSS (personal/non-commercial), FOSSGIS OSRM (commercial restricted), Nominatim/OSM tile usage policies (no heavy use), adsbdb route data restriction. If Andorra View is ever commercial or public-facing, these need replacements/agreements.
- Privacy: the project's "no tracking individuals" line aligns with the user's personal-data rule; note the voice feature sends viewport screenshots to OpenAI.

## 9. Recommendation: **Hybrid — new lean app, selectively porting MIT modules**
Rationale:
- A full **fork** imports ~1,667 files of US-centric layers, Pinokio launcher, MCP server, Director, SDR, QA harness tied to Austin etc.; most layers are dead weight for Andorra and the codebase moves extremely fast (merged PRs daily, v0.2.1 four days ago) — keeping a fork in sync would be costly, and the dev-server-as-backend model isn't production-ready.
- Pure **reimplementation** would throw away high-value, tricky, permissively-licensed pieces.
- **Port (with MIT attribution)**: `src/maps/google3d.js` + `terrain.js` + imagery fallback ladder; `src/app/viewer.js` viewer options; `src/styles/*.js` (CRT/NVG/FLIR shaders) + `src/ui/visualEffects.js`; SGP4 satellite layer (`src/layers/satellites/*`, `server/providers/space/celestrak.js`); flight pipeline (OpenSky/adsb.lol proxy with OAuth + caching, motion interpolation, `iconOrientation.js`); FIRMS CSV parser/proxy (restrict to Andorra bbox instead of `world`); USGS source; Open-Meteo regional weather; `server/providers/common/*` (SSRF-safe fetch, caps, rate-limit); CCTV projection/viewshed rendering as the template for an Andorra webcam pack; `dataCredits.js` attribution pattern.
- **Build new**: Andorra camera framing/bounds, Andorra data packs (webcams, traffic, meteo, ski, seismic), a real backend (e.g. Supabase Edge Functions or a small Node server) hosting the ported proxy handlers, Catalan UI.
- Pin to CesiumJS ~1.138 to match ported code.
