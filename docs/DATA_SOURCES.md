# Andorra View — Data sources

Catalogue of every source found during Phase 0 research (tests run on **2026-10-06**). Evidence and test commands are in
`docs/research/01–04`; the summary and decisions are in [RESEARCH.md](RESEARCH.md); legal classification and attribution
lines are in [LICENSES_AND_ATTRIBUTIONS.md](LICENSES_AND_ATTRIBUTIONS.md).

Conventions:

- Endpoints are given relative to the host named in the row. `SIG` = `https://sig.govern.ad/server/rest/services`,
  `IDE` = `https://www.ideandorra.ad/Serveis`, `MOB` = `https://app.mobilitat.ad/api/v1`,
  `FEDA` = `https://www.feda.ad/oficina-virtual/api`. Keys are never shown.
- **CORS** = result of sending `Origin: http://localhost:5173`. "none" means no `Access-Control-Allow-Origin` header,
  so the browser needs our proxy (or `<img>`/iframe use only).
- **UNVERIFIED** marks anything not confirmed by a live request or an official page.
- "—" = not tested / not applicable.

## Status legend

| Status | Meaning |
|---|---|
| **INTEGRATED** | Used by the MVP (live feed, tiles or build-time snapshot). |
| **READY** | Public, machine-readable, with a clear licence or clearly intended for reuse. Not yet used. |
| **POSSIBLE** | Works technically but has licence, key, CORS or quality caveats. |
| **NEEDS REVIEW** | Undocumented/internal endpoint or unclear licence: ask the owner before relying on it. |
| **NOT USABLE** | Needs a key or contract, is blocked, stale, empty for Andorra, or excluded for privacy. |

---

## 1. Basemaps and terrain

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Govern DTM 5 m | Àrea de Cartografia (Govern d'Andorra) | Digital terrain model, 5 m | Andorra only | Elevation tiles | `SIG/IDE/Andorra_DTM_5m_WGS84/ImageServer/tile/{z}/{y}/{x}` | LERC (F32), Web Mercator, LOD 0–16 | Static | Yes | None | No licence published; attribution + permission requested (NC) | `*` | High (<0.15 s) | **INTEGRATED** |
| Govern DTM 5 m (raster elevation) | Àrea de Cartografia | Same DTM, no tile cache confirmed | Andorra | Raster | `SIG/IDE/Andorra_DTM_5mRasterElevation/ImageServer` | ArcGIS ImageServer (F32) | Static | Yes | None | As above | `*` | — | POSSIBLE |
| Govern Ortho 2022 tile cache | Àrea de Cartografia | Orthophoto 2022 basemap | Andorra (rgb(248,248,248) fill outside) | Imagery tiles | `SIG/Hosted/Mapa_Base_IDE_Orto_2022_WM/MapServer/tile/{z}/{y}/{x}` | PNG, 3857, 23 LODs | Static | Yes | None | As above | `*` | High (~0.19 s) | **INTEGRATED** |
| Govern topo basemap (colour) | Àrea de Cartografia | Mapa_Base_IDE_WM_Color | Andorra | Imagery tiles | `SIG/Hosted/Mapa_Base_IDE_WM_Color/MapServer` | PNG tiles, 3857 | Static | Yes | None | As above | `*` | High | **INTEGRATED** |
| Govern topo basemap (grey / white bg) | Àrea de Cartografia | Mapa_Base_IDE_WM_Gris, _Color_blanc_fons | Andorra | Imagery tiles | `SIG/Hosted/Mapa_Base_IDE_WM_Gris/MapServer` (and `_Color_blanc_fons`) | PNG tiles, 3857 | Static | Yes | None | As above | `*` | High | READY (licence check) |
| Govern historical orthophotos | Àrea de Cartografia | Orto 1972–2025, IRC 2003/2025 | Andorra | Dynamic map | `SIG/IDE/ortofotos/MapServer` | ArcGIS export (no cache), SR 27563 | Static | Yes | None | As above | `*` | — | POSSIBLE |
| IDE Andorra WMTS | Àrea de Cartografia | Orthophoto 2025 (25 cm), orto 2012, `fons` | Andorra | Imagery tiles | `IDE/gwc/service/wmts` (EPSG:900913 set) | WMTS JPEG/PNG | Static | Yes | None | Non-commercial without permission | none | Fast (0.15 s) | POSSIBLE (proxy) |
| IDE Andorra WMS (≈45 services) | Àrea de Cartografia | orto 2025, cartogeneral, carrerer, mobilitat… | Andorra | Map images | `IDE/<name>/wms` | WMS | Static | Yes | None | cartogeneral: "Prohibit l'ús amb finalitats comercials sense autorització" | none | 0.15–2.1 s | POSSIBLE (proxy) |
| EOX Sentinel-2 cloudless 2024 | EOX IT Services | Cloudless mosaic, 10 m | Global | Imagery tiles | `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg` | JPEG WMTS | Yearly mosaic | Yes | None | CC BY-NC-SA 4.0 (per-year licence UNVERIFIED on current page); commercial needs EOX licence | Echoes origin | High | **INTEGRATED** |
| AWS Terrain Tiles (Terrarium) | AWS Open Data / Mapzen | Global DEM mosaic | Global | Elevation tiles | `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` | Terrarium PNG | Static | Yes | None | Open (EU-DEM © Copernicus, SRTM, per joerd attribution) | `*` | High (0.67 s) | **INTEGRATED** |
| Google Photorealistic 3D Tiles | Google | 3D mesh | Global (Andorra coverage UNVERIFIED) | 3D Tiles | `https://tile.googleapis.com/v1/3dtiles/root.json` | glTF 3D Tiles | — | Yes | API key + billing | Google Maps Platform ToS (no caching, logo + copyrights); 1,000 free root req/month | — | High | **INTEGRATED** (optional, key required) |
| Cesium ion World Terrain | Cesium GS | Asset 1 | Global | Quantized mesh | Cesium ion asset 1 | Quantized mesh | Static | Yes | ion token | Community plan: personal / non-commercial | `*` | High | **INTEGRATED** (optional, key required) |
| Copernicus DEM GLO-30 | ESA / Airbus / DLR | 30 m DEM | Global | Elevation COG | `s3://copernicus-dem-30m` (not fetched) | COG | Static | Yes | None | Free incl. commercial, attribution | — | — | READY (build own mesh) |
| Esri World Imagery | Esri | World imagery | Global | Imagery tiles | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | JPEG tiles | — | Yes | None technically (account normally required) | Esri Master Agreement / ToU (grey area keyless) | `*` | High (0.22 s) | NEEDS REVIEW |
| OSM standard tiles | OSM Foundation | Raster map | Global | Imagery tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | PNG | Continuous | Yes | Valid UA/Referer | ODbL data; tile usage policy (no heavy use) | `*` | No SLA | POSSIBLE (low traffic) |
| CARTO basemaps | CARTO | dark_all etc. | Global | Imagery tiles | `https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png` | PNG | — | Yes | Key now "required" (keyless still works) | 5M req/month non-commercial; OSM + CARTO attribution | `*` | — | POSSIBLE |
| MapTiler Cloud | MapTiler | Basemaps, terrain-rgb | Global | Tiles | — (not tested) | — | — | Yes | Key | Free: 5,000 loads/month, non-commercial | — | — | POSSIBLE |
| Re:Earth / Mapterhorn terrain | Re:Earth | Quantized mesh + heights | Global | Terrain | `https://terrain.reearth.land/cesium-mesh/ellipsoid` | Quantized mesh | — | Yes | None | CC BY 4.0 | — | — (from GEV, not tested) | POSSIBLE (UNVERIFIED) |
| NASA GIBS / CMR | NASA Earthdata | HLS Sentinel-2/Landsat, VIIRS recent imagery | Global | Imagery | `gibs.earthdata.nasa.gov`, `cmr.earthdata.nasa.gov/search` | WMTS / JSON | Daily | Yes | None | NASA open data | — | — (from GEV, not tested) | POSSIBLE (UNVERIFIED) |
| OpenFreeMap | OpenFreeMap | OpenMapTiles vector tiles | Global | Vector tiles | `https://tiles.openfreemap.org/planet` | MVT | — | Yes | None | ODbL (OSM) | — | — (from GEV, not tested) | POSSIBLE (UNVERIFIED) |

## 2. Government GIS — reference layers

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pol_parroquies | Govern d'Andorra (SIG) | Parish polygons (7) | Andorra | Polygons | `SIG/Hosted/pol_parroquies/FeatureServer/0/query?f=geojson` | GeoJSON | Static | Yes | None | No licence; attribution + permission requested (NC) | `*` | High | **INTEGRATED** (snapshot) |
| frontera_andorra_linia | Govern d'Andorra (SIG) | State border line | Andorra | Lines | `SIG/Hosted/frontera_andorra_linia/FeatureServer/0/query` | GeoJSON | Static | Yes | None | As above | `*` | High | **INTEGRATED** (snapshot) |
| Carreteres_GS_Andorra | Govern d'Andorra (SIG) | General + secondary roads (134) | Andorra | Lines | `SIG/Hosted/Carreteres_GS_Andorra/FeatureServer/0` | GeoJSON | Static | Yes | None | As above | `*` | High | **INTEGRATED** (snapshot) |
| Transport network (INSPIRE) | Govern d'Andorra (SIG) | Road axes (1,509), PK markers | Andorra | Lines / points | `SIG/IDE/Transport_network/MapServer/0` (PK 2/3); `IDE/Xarxa_de_transports/MapServer/187,188` | GeoJSON | Static | Yes | None | As above | `*` | High | READY |
| Xarxa viària 2022 | Govern d'Andorra (SIG) | Road network (126) | Andorra | Lines | `SIG/Hosted/Xarxa_vial_Andorra_2022_WFL1/FeatureServer/0` | GeoJSON | Static | Yes | None | As above | `*` | — | POSSIBLE |
| Administrative units (INSPIRE) | Govern d'Andorra (SIG) | AU levels, populated places (63), parish limits | Andorra | Polygons / points / lines | `SIG/IDE/Administrative_Units/MapServer/1-6`; `IDE/Limits_administratius_i_poblacions/MapServer` | GeoJSON | Static | Yes | None | As above | `*` | — | POSSIBLE |
| Edificis 2019 | Govern d'Andorra (SIG) | Building footprints (21,529), no height | Andorra | Polygons | `SIG/Hosted/Edificis_2019/FeatureServer/0` (paged, 2000/req) | GeoJSON | 2019 | Yes | None | As above | `*` | OK | POSSIBLE (no heights) |
| Addresses / POI | Govern d'Andorra (SIG) | Addresses (11,571), POIs (1,301) | Andorra | Points | `SIG/IDE/Adreces/FeatureServer/1`; `IDE/POI/MapServer/3` | GeoJSON | Irregular | Yes | None | As above | `*` | OK | POSSIBLE |
| Official geocoders | Govern d'Andorra (SIG) | LocatorIDE, nomenclator2025v2, POI_Locator, LocatorPK100m_ | Andorra | Geocoding | `SIG/IDE/LocatorIDE/GeocodeServer` etc. | JSON | Irregular | Yes | None | As above | `*` | Not load-tested | POSSIBLE |
| IDE WFS | Àrea de Cartografia | 927 feature types (e.g. `wms_carrerer:aparcaments`) | Andorra | Vector features | `IDE/ows?service=WFS` | GeoJSON | Static | Yes | None | Fees/AccessConstraints NONE | none | Fast (0.25 s) | POSSIBLE (proxy) |
| IDE download site | Àrea de Cartografia | Geodata downloads | Andorra | Files | `https://www.ideandorra.ad/geodades` | — | — | Form with user details | Form + terms | Terms not read | — | — | NEEDS REVIEW (UNVERIFIED, not submitted) |
| Govern ArcGIS portal | Govern d'Andorra | Public item search | Andorra | Metadata | `https://sig.govern.ad/portal/sharing/rest/search` | JSON | — | Yes | None | `licenseInfo` mostly empty | — | OK | POSSIBLE (metadata) |
| Estadística ArcGIS Hub | Departament d'Estadística | Statistical maps | Andorra | — | `https://www.estadistica.ad/portal/...` | — | — | Yes | — | — | — | — | NEEDS REVIEW (not explored) |
| National open-data portal | — | — | — | — | dadesobertes.ad / opendata.ad / opendata.govern.ad | — | — | DNS failure / 404 | — | — | — | — | NOT USABLE (none found) |

## 3. Mobility and traffic

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mobilitat incidents | Departament de Mobilitat (Govern) | Works, closures, snow, accidents, restrictions | Andorran roads | Points + text | `MOB/incidents/ca` | JSON | ~2 min (max-age 120) | Yes | None | All rights reserved, personal use (permission requested) | `www.mobilitat.ad` only | Undocumented, no SLA | **INTEGRATED** (proxy) |
| Mobilitat categories | Departament de Mobilitat | Incident / point / camera categories | Andorra | Lookup | `MOB/categories/ca` | JSON | Rare | Yes | None | As above | site only | Undocumented | NEEDS REVIEW |
| Mobilitat campaigns / extraordinaris | Departament de Mobilitat | Campaigns, special notices | Andorra | Notices | `MOB/campaigns/ca`, `MOB/extraordinaris` | JSON (empty on test day) | ~2 min | Yes | None | As above | site only | Undocumented | NEEDS REVIEW |
| Mobilitat cyclist locations | Departament de Mobilitat | Event cyclist tracking | Andorra | Positions | `MOB/localitzaciociclistes` (not queried) | JSON | 20 s, seasonal | Yes | None | As above + personal data check | site only | Empty | NEEDS REVIEW (deliberately not used: privacy) |
| IMD traffic intensity | Govern d'Andorra (SIG) | Annual average daily traffic (13,218 segments) | Andorra | Lines | `SIG/Hosted/IMD_Intensitat_Mitjana_Diària/FeatureServer/0` | GeoJSON | Annual (static) | Yes | None | No licence (NC, attribution) | `*` | OK | READY (static layer) |
| National mobility model | Govern d'Andorra (SIG) | Model flows veh/h, V/C (2,127) | Andorra | Lines | `SIG/Hosted/Model_nacional_Mobilitat/FeatureServer/0` | GeoJSON (SR 32631) | Static | Yes | None | As above | `*` | OK | READY (static layer) |
| Bike lanes | Govern d'Andorra | Comunal + general bike lanes | Andorra | Lines | `IDE/wms_mobilitat/wms`; `SIG/IDE/Mobilitat/MapServer`; `Hosted/Carrils_bici` | WMS / GeoJSON | Static | Yes | None | As above | WMS none / SIG `*` | — | POSSIBLE |
| Fuel prices | Govern d'Andorra (SIG) | 75 installations, reference prices (275 rows) | Andorra | Polygons + table | `SIG/CARBURANTS/CARBURANTS/FeatureServer/0,1,2` | JSON | Daily? (UNVERIFIED) | Yes | None | As above | `*` | OK | POSSIBLE |
| Accidents | Govern d'Andorra (SIG) | Accidents_PRE | Andorra | — | `SIG/Mobilitat/Accidents_PRE/FeatureServer` | — | — | No | Token (499) | — | — | — | NOT USABLE |
| Google Maps TrafficLayer | Google (used on mobilitat.ad) | Live traffic rendering | — | Map layer | — | — | Live | — | Google key | Google ToS | — | — | NOT USABLE (not reusable) |
| TomTom traffic flow | TomTom | Flow tiles | Global (Andorra UNVERIFIED) | Vector tiles | `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.pbf` | MVT | ~2 min | — | API key | Commercial API | — | — (from GEV, not tested) | POSSIBLE (key, UNVERIFIED) |
| DGT / Servei Català de Trànsit | Spanish / Catalan traffic authorities | Border-approach traffic | Spain / Catalonia | — | — | — | — | — | — | — | — | — | NEEDS REVIEW (UNVERIFIED, not researched) |

## 4. Webcams

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mobilitat cameras | Departament de Mobilitat (Govern) | 69 road cameras incl. Spanish/French borders | Andorra | Camera list + images | `MOB/cameras` → `https://imgs.mobilitat.ad/prod/{Name}.gif` | JSON + animated GIF (470×320, ~1.2 MB) | Images ~5–10 min; list max-age 120 | Yes | None | All rights reserved, personal use (permission requested) | none (list site-only) | Undocumented, heavy GIFs | **INTEGRATED** (list + GIF images via proxy) |
| meteo.ad webcam map | SMN Andorra | Aggregator, 66 markers | Andorra | Index | `https://www.meteo.ad/webcam/mapawebcams` | HTML (Leaflet) | — | Yes | None | No reuse licence | — | — | NEEDS REVIEW |
| feratel webTV | feratel / Grandvalira Resorts | 10 ski-resort cams (IDs 150xx, 76100) | Ski areas | Video player | `https://webtv.feratel.com/webtv/?design=v5&cam={id}&lg=ca` | Embed player | — | Embed only | curl → 404 | feratel / Grandvalira | — | UNVERIFIED | NEEDS REVIEW (embed-only, UNVERIFIED) |
| Naturland cams | Naturland (private) | 2 loop clips | Sant Julià de Lòria area | Video | `https://web.naturland.ad/cams/cam11.mp4`, `cam22.mp4` | MP4 (~5 min loop) | ~5 min | Yes | None | Private company | none; no framing | OK | NEEDS REVIEW |
| Projecte 4 Estacions | Projecte 4 Estacions | 3 cams (Canillo, La Massana, La Cortinada) | Andorra | HLS player | `app.projecte4estacions.com/js/load-p4e-cam.js` | HLS (Clappr) | Snapshot stale (2025-08-13) | Yes | None | Not stated | — | Stale snapshot | NEEDS REVIEW (embed their player) |
| vision-environnement | vision-environnement | Andorra la Vella timelapse | Andorra la Vella | Image | `s1.vision-environnement.com/live/modules/timelapse/capture/andorelavieille.jpg` | JPEG | Stale (2026-07-25) | Yes | None | Not stated | — | Stale | NOT USABLE |
| Windy Webcams API v3 | Windy | Webcams near Andorra | Global | Camera list | `api.windy.com/webcams/api/v3/webcams?nearby=42.5,1.55,30` | JSON | Image tokens expire 10 min (free) | Yes | API key (403 without) | Windy terms (UNVERIFIED) | — | — | POSSIBLE (key needed) |
| Roundshot / Skaping | — | — | — | — | none found | — | — | — | — | — | — | — | NOT USABLE (none found, UNVERIFIED) |
| Webcam aggregators (onthesnow, weski…) | Various | Re-embedded feratel | — | — | — | — | — | — | — | — | — | — | NOT USABLE |
| GEV CCTV packs | Various (US, UK, CA, FI, EE, AU, NO…) | Traffic cameras | No Andorra / Spain / France | Images / HLS | see `docs/research/01` | — | — | — | — | — | — | — | NOT USABLE (no coverage) |
| Google Street View Static | Google | Street-level imagery | Andorra (UNVERIFIED detail) | Images | `maps.googleapis.com/maps/api/streetview` | JPEG | — | Yes | Server API key | Google ToS | — | — | POSSIBLE (key, UNVERIFIED) |

## 5. Public transport

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| linies_bus_2025 | Govern d'Andorra (SIG) | Bus stops + lines (L1–L7, LE, "Línies Coopalsa juliol 2025") | Andorra | Points + lines | `SIG/Hosted/linies_bus_2025/FeatureServer/{id}/query` | GeoJSON | Ad hoc (2025) | Yes | None | No licence (NC, attribution, permission requested) | `*` | OK | **INTEGRATED** (snapshot: stops + lines) |
| Línies autobús 2025 | Govern d'Andorra (SIG) | 357 stops, 16 line shapes | Andorra | Points + lines | `SIG/Hosted/Línies_autobús_2025/FeatureServer/1,2` | GeoJSON | Ad hoc (2025) | Yes | None | As above | `*` | OK | READY (static) |
| Intercanviadors | Govern d'Andorra (SIG) | 5 interchange zones | Andorra | Polygons | `SIG/Hosted/Intercanviadors/FeatureServer/0` | GeoJSON | Static | Yes | None | As above | `*` | — | POSSIBLE |
| bus.ad service notices | Mou-te en Bus | Service-change RSS | Andorra | Notices | `https://bus.ad/feed/` | RSS | Ad hoc | Yes | None | Site terms (not read) | Not tested | OK | POSSIBLE |
| bus.ad timetables / PDF | Mou-te en Bus / Govern | Line timetables | Andorra | Timetables | `bus.ad` line pages; `govern.ad/documents/d/guest/bus_linies_nacionals` | HTML / PDF (12 p.) | Seasonal | Yes | None | — | — | — | NOT USABLE (no API) |
| GTFS / GTFS-RT / vehicle positions | — | National buses | Andorra | — | none found | — | — | — | — | — | — | — | NOT USABLE (ask Mobilitat for GTFS) |
| Mobility Database | MobilityData | Feed catalogue (6,591) | Global | Catalogue | `https://files.mobilitydatabase.org/feeds_v2.csv` | CSV | — | Yes | None | — | — | OK | NOT USABLE (0 AD feeds) |
| transit.land | Interline | Feed atlas | Global | Catalogue | atlas `feeds/`; REST API | — | — | Partly | REST API key (401) | — | — | — | NOT USABLE (no Andorra feed) |
| Catalonia intercity GTFS | Spanish NAP | mdb-2796/2926 | Catalonia | GTFS | NAP download | GTFS | — | — | Key (401) | — | — | — | NOT USABLE |
| Occitanie liO GTFS | Région Occitanie | tdg-81026 | Occitanie | GTFS | Mobility Database link | GTFS (25.6 MB) | — | Yes | None | — | — | — | NOT USABLE (0 stops in Andorra) |
| Bus operators / parish buses | Coopalsa, Autocars Nadal, Hispano Andorrana, comuns | — | Andorra | — | none found | — | — | — | — | — | — | — | NOT USABLE (UNVERIFIED) |
| OSM bus stops / routes | OpenStreetMap | 322 stops, 19 routes | Andorra | Points / relations | `https://overpass-api.de/api/interpreter` | JSON | Minutely | Yes | None | ODbL 1.0 | `*` | 504/429 frequent | READY |
| GEV GTFS-RT / GBFS feeds | MBTA, Entur, HSL…; Lyft/BCycle | Transit / bikeshare | US, Europe (not Andorra) | — | see `docs/research/01` | — | — | — | — | — | — | — | NOT USABLE (no coverage) |

## 6. Parking and EV charging

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ALV parking occupancy | Comú d'Andorra la Vella | 36 municipal car parks, 13 with `FREEOCCUPANCY`/`TOTALOCCUPANCY` (1,709 spaces) | Andorra la Vella | Points + counts | `https://sit.andorralavella.ad/server/rest/services/Aparcaments/AparcamentsComunals_SQLserver/FeatureServer/0/query` | GeoJSON | Claimed real-time; freshness UNVERIFIED | Yes | None | No licence (permission requested) | Echoes origin | Low (unchanged over 10 min) | **INTEGRATED** |
| Mobilitat points | Departament de Mobilitat (Govern) | 71 car parks (capacity text), 27 EV sites, 14 Cicland, 11 CAP, 1 hospital | Andorra | Points | `MOB/points/ca` | JSON | Rare | Yes | None | All rights reserved, personal use (permission requested) | site only | Undocumented | **INTEGRATED** (car parks + EV chargers, proxy) |
| IDE WFS aparcaments | Àrea de Cartografia | 205 parking points (type, no capacity) | Andorra | Points | `IDE/ows?…typeNames=wms_carrerer:aparcaments` | GeoJSON | Static | Yes | None | Fees/Access NONE | none | Fast | POSSIBLE (proxy) |
| IDE POI parkings | Govern d'Andorra (SIG) | POIs with `places` capacity text | Andorra | Points | `SIG/IDE/POI/MapServer/3` | GeoJSON | Irregular | Yes | None | No licence (NC) | `*` | OK | POSSIBLE |
| OSM parking | OpenStreetMap | 417 parkings (31 with capacity) | Andorra | Points / areas | Overpass `nwr[amenity=parking]` | JSON | Minutely | Yes | None | ODbL 1.0 | `*` | 504/429 frequent | READY |
| Escaldes-Engordany parking | Comú d'Escaldes-Engordany | — | Escaldes | — | no website reachable | — | — | — | — | — | — | — | NOT USABLE (UNVERIFIED) |
| Encamp parking | Comú d'Encamp | Static list; "Luclic" app | Encamp | — | `comuencamp.ad/serveis/mobilitat-i-aparcaments` | HTML | — | Yes | — | — | — | — | NOT USABLE (static only) |
| Canillo parking | Comú de Canillo | Citizen account portal | Canillo | — | `canillo.ad/parquing-i-abonaments` | — | — | Login | Login | — | — | — | NOT USABLE |
| La Massana parking | Comú / operator | Static pages | La Massana | — | `lamassana.ad/aparcaments` | HTML | — | Yes | — | — | — | — | NOT USABLE |
| Ordino parking | Comú d'Ordino | "app-parking" | Ordino | App | — | — | — | — | — | — | — | — | NOT USABLE (app only, UNVERIFIED) |
| Sant Julià de Lòria parking | Comú de Sant Julià de Lòria | Static page + Google Maps embeds | Sant Julià | — | `comusantjulia.ad/.../aparcaments-comunals/` | HTML | — | Yes | — | — | — | — | NOT USABLE (static only) |
| OSM EV charging | OpenStreetMap | 11 charging stations | Andorra | Points | Overpass `nwr[amenity=charging_station]` | JSON | Minutely | Yes | None | ODbL 1.0 | `*` | Incomplete | POSSIBLE (incomplete) |
| OpenChargeMap | OpenChargeMap | EV chargers | Global | Points | `api.openchargemap.io/v3/poi` | JSON | — | Yes | API key (403) | CC BY-SA | — | — | POSSIBLE (with key) |
| Endolla.ad | — | EV chargers | — | — | does not resolve | — | — | — | — | — | — | — | NOT USABLE |
| chargepulse / electromaps | Commercial apps | FEDA charger locations | — | — | — | — | — | — | — | Commercial | — | — | NOT USABLE |

## 7. Weather

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| meteo.ad DadesActuals | Servei Meteorològic Nacional (Govern) | Current observations (temp, precip 24 h, wind, RH, MSL pressure, snow depth…) | ~29 stations in Andorra | Station values | `https://www.meteo.ad/home/DadesActuals?idioma=0&pestanya={n}&privat=false` (+ `X-Requested-With`) | JSON arrays (strings + HTML) | ~10 min (UNVERIFIED cadence) | Yes | None | No reuse licence (permission requested) | none | Undocumented internal | **INTEGRATED** (proxy) |
| Estacions meteorològiques | Govern d'Andorra (SIG) | Station metadata (33 points) | Andorra | Points | `SIG/Hosted/Estacions_meteorològiques_Andorra/FeatureServer/0` | GeoJSON | Static | Yes | None | No licence (NC) | `*` | OK (some code typos) | **INTEGRATED** (metadata, snapshot) |
| meteo.ad station pages | SMN Andorra | Coordinates, altitude, variables (37 scraped) | Andorra | Metadata | `https://www.meteo.ad/estacions/{codi}` | HTML | Static | Yes | None | No reuse licence | — | OK | READY (scrape once) |
| meteo.ad JSON forecast | SMN Andorra | Coded forecast | Andorra | Forecast | request form at `https://www.meteo.ad/json` | JSON | — | On request | Form (fixed IP, contact) | By agreement | — | — | POSSIBLE (after access request) |
| meteo.ad widgets ("Ginys") | SMN Andorra | Embeddable forecast/station widgets | Andorra | Widget | `https://www.meteo.ad/ginys`, `content/js/ginys/giny1..10.js` | iframe / JS | — | Yes | None | Credit SMN | No X-Frame-Options/CSP | OK | READY (iframe) |
| meteo.ad warnings page | SMN Andorra | Avisos nord/centre/sud, 3-h slots | Andorra | Warnings | `https://www.meteo.ad/Alertes` | HTML (coloured cells) | Ad hoc | Yes | None | No reuse licence | — | — | NEEDS REVIEW (scraping only; use Meteoalarm) |
| sig.govern.ad meteopublic app | Govern d'Andorra | Radar / satellite viewer | Andorra | Web app | `https://sig.govern.ad/meteopublic/?datasource=…` | Experience Builder | — | Yes | None | — | X-Frame-Options SAMEORIGIN | — | NOT USABLE (cannot be framed) |
| Govern MTG satellite proxy | Govern d'Andorra / EUMETSAT | MTG `rgb_geocolour` | Europe | WMS | `https://sig.govern.ad/meteoradarproxy/api/GeoCoding/GetCapabilities` | WMS | Time extent ends 2025-02-11 | Yes | None | — | `*` | Stale | NOT USABLE (stale) |
| EUMETSAT view WMS | EUMETSAT | MSG RGB airmass | Europe | WMS imagery | `https://view.eumetsat.int/geoserver/mumi/wideareacoverage_rgb_airmass/wms` | WMS | — | Yes | None | — | — | — (seen in config, not tested) | POSSIBLE (UNVERIFIED) |
| Meteo radar export GP | Govern d'Andorra | ExportWebMapMeteoRadar | — | GP service | `SIG/Meteo_Andorra/ExportWebMapMeteoRadar/GPServer` | — | — | Yes | — | — | — | — | NEEDS REVIEW (not tested) |
| RainViewer | RainViewer | Radar mosaic (used by meteo.ad) | Global | Radar tiles | `https://api.rainviewer.com/public/weather-maps.json` → `tilecache.rainviewer.com/...` | JSON + PNG tiles | 13 past frames | Yes | None | Personal / educational / small-scale; attribution | `*` | OK | POSSIBLE (licence limits commercial use) |
| FEDA GetLastMeteo | FEDA | 3 stations (Encamp, Engolasters, Ransol) | Andorra | Station values | `FEDA/GetLastMeteo?format=json` | JSON | 10 min | Yes | None | No licence | `*` | Undocumented | NEEDS REVIEW |
| Open-Meteo forecast | Open-Meteo.com | Gridded forecast, multi-point, snow depth, freezing level | Global | Model | `https://api.open-meteo.com/v1/forecast` | JSON | 15 min | Yes | None | Data CC BY 4.0; free API non-commercial | `*` | High | READY (non-commercial) |
| Open-Meteo flood | Open-Meteo.com | GloFAS river discharge | Global (~5 km) | Model | `flood-api.open-meteo.com/v1/flood` | JSON | Daily | Yes | None | CC BY 4.0 | — | Meaningless for small rivers | NOT USABLE |
| AEMET OpenData | AEMET | Spanish observations | Spain | Station values | `opendata.aemet.es/opendata/api/...` | JSON | — | Yes | API key (Forbidden without) | AEMET terms | — | — | NOT USABLE (free key needed) |
| Meteocat XEMA | Servei Meteorològic de Catalunya | XEMA stations | Catalonia | Station values | `api.meteo.cat/xema/v1/estacions/metadades` | JSON | — | Yes | API key (403) | Meteocat terms | — | — | NOT USABLE (free key needed) |
| Météo-France | Météo-France | Observations | France | — | `portail-api.meteofrance.fr` (not tested) | — | — | Registration | Token | — | — | — | NOT USABLE (UNVERIFIED) |
| NOAA GFS / ECMWF IFS wind | NOAA / ECMWF | 0.25° wind | Global | Model GRIB | `noaa-gfs-bdp-pds.s3.amazonaws.com`, `data.ecmwf.int/forecasts` | GRIB2 | 1 h | Yes | None | Open | — | Coarse for Andorra (from GEV) | POSSIBLE (UNVERIFIED) |
| NOAA nowCOAST | NOAA | Radar / satellite / lightning | Americas (global IR only) | WMS | `nowcoast.noaa.gov/geoserver/observations/…` | WMS | 2–10 min | Yes | None | Public domain | — | — | NOT USABLE (no coverage) |

## 8. Weather alerts

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Meteoalarm Andorra JSON | EUMETNET / SMN Andorra | CAP 1.2 warnings, 4 languages, zone polygons (nord/centre/sud) | Andorra | Alerts + polygons | `https://feeds.meteoalarm.org/api/v1/warnings/feeds-andorra` | JSON (CAP) | Poll 5–10 min | Yes | None | "Equivalent to CC BY 4.0" + redistribution T&C (to review) | none | High | **INTEGRATED** (proxy) |
| Meteoalarm Andorra Atom / RSS | EUMETNET / SMN Andorra | Same warnings | Andorra | Alerts | `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-andorra` (and `-rss-`) | Atom / RSS | As above | Yes | None | As above | none | OK | POSSIBLE |
| Meteoalarm Spain / France | EUMETNET / AEMET / Météo-France | Warnings incl. Lleida, Ariège, Pyrénées-Orientales | Spain / France | Alerts | `.../meteoalarm-legacy-atom-spain`, `-france` | Atom | As above | Yes | None | As above | none | OK | POSSIBLE |
| NOAA NHC / CPHC | NOAA | Tropical cyclones | Atlantic / Pacific | Alerts | `nhc.noaa.gov/CurrentStorms.json` | JSON | 5 min | Yes | None | Public domain | — | — | NOT USABLE (no coverage) |

## 9. Snow and avalanche

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EAWS micro-regions | EAWS / SMN Andorra | AD-01, AD-02, AD-03 polygons | Andorra | Polygons | `https://regions.avalanches.org/micro-regions/AD_micro-regions.geojson.json` | GeoJSON | Static | Yes | None | CC BY 4.0 (eaws-regions repo) | — | High | **INTEGRATED** (snapshot) |
| EAWS danger ratings | EAWS / SMN Andorra | Daily max danger by region, elevation, am/pm | Andorra | Ratings | `https://static.avalanche.report/eaws_bulletins/{date}/{date}.ratings.json` | JSON | Daily, Dec–Apr/May | Yes | None | CC BY 4.0 stated (UNVERIFIED for ratings file) | `*` | Medium (seasonal) | **INTEGRATED** |
| meteo.ad avalanche bulletin (BPA) | SMN Andorra | Danger by zone | Andorra | Bulletin | `https://www.meteo.ad/estatneu`; `/uploads/neu/estatNeu{N}.pdf` | HTML / PDF | Daily in season | Yes | None | No reuse licence | — | — | NEEDS REVIEW (fallback) |
| Mobilitat snow endpoints | Departament de Mobilitat | Snow episodes, snow-plan flag, snowplough positions | Andorra | Status / positions | `MOB/nevades`, `MOB/nevadesactive`, `MOB/llevaneus` | JSON (empty in October) | 2 min, seasonal | Yes | None | All rights reserved | site only | Empty on test day | NEEDS REVIEW |
| Grandvalira Resorts piste status | Grandvalira Resorts | Snow depth, km open, lifts, car parks | Grandvalira, Pal Arinsal, Ordino Arcalís | Status | `www.grandvalira.com/ca/estacio/estat-de-pistes` etc. | HTML (server-rendered) | Cache 60 s | Yes | None | © Grandvalira Resorts | — | Off-season, not validated | NEEDS REVIEW (ask for feed) |
| Grandvalira resorts backend API | Grandvalira Resorts | 2D map backend | Ski areas | — | private backend (not tested) | — | — | No | — | Private | — | — | NOT USABLE (private) |
| Ski Andorra | Ski Andorra | Posts / pages | Andorra | — | `skiandorra.ad` `wp-json` | JSON | — | Yes | None | — | — | — | NOT USABLE (no snow data) |
| Govern avalanche GIS | Govern d'Andorra (SIG) | Allaus_PPRA, Allaus_Cadastre, Allaus_Zona_reglament | Andorra | Polygons | `SIG/IDE/Allaus_PPRA/MapServer` (etc.) | ArcGIS / GeoJSON | Static | Yes | None | Govern IDE terms (NEEDS REVIEW) | `*` | — | POSSIBLE |
| Snow stakes ERHIN 2020 | Govern d'Andorra (SIG) | pals_neu_ERHIN_2020 | Andorra | Points | `SIG/Hosted/pals_neu_ERHIN_2020/FeatureServer` (not queried) | — | — | Yes | — | As above | — | — | POSSIBLE (UNVERIFIED) |

## 10. Environment

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| aire.ad | Àrea de Medi Ambient (Govern) | AQI and pollutants (NO2, PM10, PM2.5, O3…), 4–7 stations | Andorra | Station values | `https://aire.ad/api/web/mapData`, `/stations`, `/latestData`, `/timeseries` (`lang` header) | JSON (HTML-encoded strings) | Hourly | Yes | None | No licence (permission requested) | Reflects origin | Undocumented internal | **INTEGRATED** (proxy) |
| EEA air quality download | European Environment Agency | Same AD stations (E2a up-to-date) | Andorra (and Europe) | Time series | `POST https://eeadmz1-downloads-api-appservice.azurewebsites.net/ParquetFile/urls` | Parquet | Hourly (~1–2 h lag) | Yes | None | EEA reuse with attribution (CC BY 4.0, UNVERIFIED for API) | — | OK | READY (backend) |
| OpenAQ v3 | OpenAQ | Likely mirrors EEA AD stations (UNVERIFIED) | Global | Station values | `api.openaq.org/v3/locations?iso=AD` | JSON | — | Yes | API key (401) | — | — | — | POSSIBLE (free key) |
| Open-Meteo air quality | Open-Meteo.com (CAMS) | European AQI, PM, NO2, O3 (model) | Global | Model | `https://air-quality-api.open-meteo.com/v1/air-quality` | JSON | Hourly | Yes | None | CC BY 4.0; non-commercial API | — | OK | READY (model) |
| Govern Qualitat_Aire folder | Govern d'Andorra | — | Andorra | — | `SIG/Qualitat_Aire` | — | — | No | Token | — | — | — | NOT USABLE |
| River stations | Govern d'Andorra (SIG) | 10 river-station points (metadata only) | Andorra | Points | `SIG/Hosted/Estacions_Rius/FeatureServer/0` | GeoJSON | Static | Yes | None | No licence (NC) | `*` | OK | POSSIBLE (metadata) |
| Live river levels / flows | Protecció Civil / Govern (`Aigua` folder) | Gauges | Andorra | — | `SIG/Aigua` | — | — | No | Token | — | — | — | NOT USABLE (not public, UNVERIFIED) |
| SAIH Ebro | Confederación Hidrográfica del Ebro | Real-time gauges incl. Valira at La Seu d'Urgell | Downstream Spain | Gauges | `https://www.saihebro.com/tiempo-real/...` | HTML | Real-time | Yes | — | — | — | Not tested | NEEDS REVIEW |
| FEDA hydro spill | FEDA | Hourly spill (desguàs) | FEDA hydro scheme | Time series | `FEDA/GetDailyDesguas?type=json&dia=YYYY-MM-DD` | JSON | Daily (hourly values) | Yes | None | No licence | `*` | Undocumented | NEEDS REVIEW |
| Hydrography | Govern d'Andorra (SIG) | Hidrografia; Torrents | Andorra | Lines | `SIG/IDE/Hidrografia/MapServer` (500 error); `Hydrografia/Torrents/MapServer` | ArcGIS | Static | Yes | None | No licence | `*` | Hidrografia failed | POSSIBLE (Torrents) |
| Noise cadastre | Govern d'Andorra (SIG) | 2003, 2008–2010, 2017–2018 | Andorra | Points / zones | `SIG/IDE/Cadastre_Sonor/MapServer` (`Soroll` folder: token) | ArcGIS | Static | Yes | None | No licence | `*` | — | POSSIBLE (static only) |
| Lightning (historical) | Govern d'Andorra (SIG) | 307 points + ellipses | Andorra | Points | `SIG/Hosted/Llamps/FeatureServer` | GeoJSON | Historical (2024-07-25) | Yes | None | No licence | `*` | Not live | POSSIBLE (historical) |
| Climatology | Govern d'Andorra (SIG) | Annual grids 2006–2010 | Andorra | Raster | `SIG/IDE/Climatologia/MapServer` | ArcGIS | Static | Yes | None | No licence | `*` | — | POSSIBLE |
| Geohazards | Govern d'Andorra (SIG) | Georisc_Andorra, Perillositat_geologica | Andorra | Polygons | `SIG/Hosted/Georisc_Andorra`; `SIG/IDE/Perillositat_geologica` | ArcGIS | Static | Yes | None | No licence | `*` | — | POSSIBLE |
| AR+I | Andorra Recerca + Innovació | Research reports (permafrost, seismicity, flows) | Andorra | Reports | `ari.ad` | PDF | — | Yes | — | — | — | No live feed | NOT USABLE (UNVERIFIED) |

## 11. Energy

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FEDA GetLastEnergy | FEDA | Latest energy balance (consumption, imports ES/FR, production by plant, exports) | National totals | Values | `FEDA/GetLastEnergy?format=json` | JSON | Daily (D-1; latest day may be partial) | Yes | None | No licence (permission requested) | `*` | Undocumented | **INTEGRATED** |
| FEDA GetEnergyHistory | FEDA | Daily MWh per series | National totals | Time series | `FEDA/GetEnergyHistory?from=…&to=…&id={series}&format=json` | JSON / CSV | Daily | Yes | None | No licence | `*` | Undocumented | **INTEGRATED** (used by the energy feed) |
| FEDA record / graph | FEDA | GetMaxEnergyHistory, GetEnergyGraph | National | Values | `FEDA/GetMaxEnergyHistory`, `FEDA/GetEnergyGraph` | JSON | Daily | Yes | None | No licence | `*` | Undocumented | NEEDS REVIEW |
| FEDA planned outages | FEDA | Planned outages (zone, times, affected installations) | Andorra | Notices | `FEDA/GetGeneralWarningOutage?format=json` | JSON | Ad hoc | Yes | None | No licence | `*` | Undocumented | NEEDS REVIEW (show zone only) |
| FEDA network (IDE) | Govern d'Andorra / FEDA | Coverage + distribution network 2010–2018 | Andorra | Lines | `SIG/IDE/FEDA/MapServer` | ArcGIS | Static | Yes | None | No licence | `*` | — | POSSIBLE (static; no chargers) |
| Govern Energia folder | Govern d'Andorra | — | Andorra | — | `SIG/Energia` | — | — | No | Token | — | — | — | NOT USABLE |
| OSM power | OpenStreetMap | 8 substations, 4 plants / hydro generators | Andorra | Points / areas | Overpass `power=substation`, plants | JSON | Minutely | Yes | None | ODbL 1.0 | `*` | 504/429 frequent | READY |

## 12. Emergency and civil protection

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fire danger bulletin services | Govern d'Andorra (ARI_INCENDIS) | Butlleti_Incendis_Avui / Dema | Andorra | Print GP | `SIG/ARI_INCENDIS/...` | Export Web Map only | Daily | Yes | None | — | — | Print-only | NOT USABLE |
| incendis.ad | — | — | — | — | `incendis.ad` | Default IIS page | — | — | — | — | — | — | NOT USABLE |
| Token-protected risk folders | Govern d'Andorra | Sanitat, RiscosGeo, Públics, Refugis, TURISME | Andorra | — | `SIG/<folder>` | — | — | No | Token | — | — | — | NOT USABLE |
| Hospitals / health centres | Mobilitat; OpenStreetMap | Hospital + 11 CAP (Mobilitat); 10 hospitals (OSM) | Andorra | Points | `MOB/points/ca`; Overpass `amenity=hospital` | JSON | Rare | Yes | None | Mobilitat: all rights reserved; OSM: ODbL | site only / `*` | OK | **INTEGRATED** via OSM POI snapshot (see §13) |

## 13. OpenStreetMap and geocoding

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OSM via Overpass (overpass-api.de) | OpenStreetMap contributors | Places (towns/villages), POIs (hospitals, ski areas, border controls, peaks, lift stations) | Andorra | Points | `https://overpass-api.de/api/interpreter` | JSON → GeoJSON | Build-time snapshot (data minutely) | Yes | None | ODbL 1.0 | `*` | ~50% first-try 504, 429 on bursts; retry succeeds | **INTEGRATED** (build-time snapshot) |
| Overpass mirror maps.mail.ru | Mail.ru | Same data | Global | — | `https://maps.mail.ru/osm/tools/overpass/api/interpreter` | JSON | Current | Yes | None | ODbL 1.0 | `*` | 15 s | POSSIBLE (fallback) |
| Overpass mirror kumi.systems | Kumi Systems | Same data | Global | — | `https://overpass.kumi.systems/api/interpreter` | JSON | Stale (2026-06-01) | Yes | None | ODbL 1.0 | — | 88 s query | NOT USABLE (stale) |
| Overpass mirror private.coffee | private.coffee | — | Global | — | `https://overpass.private.coffee` | — | — | Yes | None | ODbL 1.0 | — | 502 after 116 s | NOT USABLE |
| Geofabrik extract | Geofabrik | `andorra-latest.osm.pbf` | Andorra | Extract | Geofabrik download | PBF | Daily | Yes | None | ODbL 1.0 | — | — | POSSIBLE (UNVERIFIED) |
| Nominatim | OSM Foundation | Geocoding | Global | Geocoding | `nominatim.openstreetmap.org` | JSON | — | Yes | UA required | ODbL; max 1 req/s, cache, no bulk | Yes | Policy-limited | POSSIBLE (light use only) |
| Photon | Komoot | Geocoding | Global | Geocoding | `photon.komoot.io/api/` | JSON | — | Yes | None | — | — | — (from GEV) | POSSIBLE (UNVERIFIED) |
| OSRM (FOSSGIS) | FOSSGIS | Routing | Global | Routing | `routing.openstreetmap.de/routed-{profile}` | JSON | — | Yes | None | Commercial use restricted | — | — (from GEV) | POSSIBLE (UNVERIFIED) |

## 14. Aircraft

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| adsb.lol | adsb.lol community network | ADS-B positions | Global (receiver-dependent); radius around Andorra | Moving points | `https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{nm}` | JSON (readsb) | Live (poll 5–10 s) | Yes | None | ODbL 1.0 | none | Medium (dynamic rate limits) | **INTEGRATED** (primary, proxy) |
| OpenSky Network | OpenSky Network association | State vectors | Global; bbox around Andorra | Moving points | `https://opensky-network.org/api/states/all?lamin&lomin&lamax&lomax` | JSON arrays | Live (anon 10 s / auth 5 s resolution) | Yes | Anonymous (400 credits/day) or OAuth2 (4,000) | Non-profit research / education / government; for-profit needs permission | opensky-network.org only | Medium | **INTEGRATED** (fallback, proxy) |
| adsb.fi | adsb.fi | ADS-B positions | Global | Moving points | `https://opendata.adsb.fi/api/v2/lat/{lat}/lon/{lon}/dist/{nm}` | JSON | Live (1 req/s) | Yes | None | Personal, non-commercial; attribution + link | none | OK | POSSIBLE (non-commercial) |
| airplanes.live | airplanes.live | ADS-B positions | Global | Moving points | `https://api.airplanes.live/v2/point/{lat}/{lon}/{nm}` | JSON | — | No | Requires contact (403) | Non-commercial (per search summaries) | — | — | NOT USABLE |
| adsbdb | adsbdb | Aircraft / callsign enrichment | Global | Lookup | `api.adsbdb.com/v0/aircraft/…`, `/v0/callsign/…` | JSON | — | Yes | None | Route data has redistribution restriction | — | — (from GEV) | POSSIBLE (UNVERIFIED) |
| Local ADS-B receiver | Own receiver (option) | `aircraft.json` from a receiver in Andorra | Local | Moving points | LAN feed | JSON | 1 s | — | — | Own data | — | — (from GEV) | POSSIBLE (hardware needed) |

## 15. Satellites and space

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CelesTrak GP (OMM JSON) | CelesTrak | Orbital elements (`stations`, `visual`) | Global (propagated with satellite.js) | Orbital elements | `https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=json` | OMM JSON | Every 2 h (download once per update) | Yes | None | Public data; CelesTrak usage policy | `*` | High | **INTEGRATED** (proxy, cached) |
| CelesTrak GP (TLE) | CelesTrak | Same groups as TLE | Global | Orbital elements | `...gp.php?GROUP={group}&FORMAT=tle` | TLE text | Every 2 h | Yes | None | As above | `*` | Misses 6-digit catalogue objects | NOT USABLE (use OMM) |
| Launch Library 2 | The Space Devs | Launches | Global | Events | `https://ll.thespacedevs.com/2.3.0/launches/` | JSON | 15 min cache | Yes | Optional token | — | — | — (from GEV) | POSSIBLE (UNVERIFIED) |

## 16. Fires

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NASA FIRMS Europe 24 h CSV (VIIRS) | NASA LANCE / FIRMS | VIIRS SNPP, NOAA-20, NOAA-21 active fires | Europe, filtered to 150 km around Andorra | Hotspots | `https://firms.modaps.eosdis.nasa.gov/data/active_fire/{sensor}/csv/{FILE}_Europe_24h.csv` | CSV | ~3 h latency; poll 15 min | Yes | None | NASA open data (acknowledgement requested) | none | High | **INTEGRATED** (proxy) |
| NASA FIRMS area API | NASA LANCE / FIRMS | VIIRS SNPP / NOAA-20 / NOAA-21 NRT, bbox | Andorra bbox | Hotspots | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{bbox}/1` | CSV | NRT | Yes | Free MAP_KEY (server-side) | NASA open data | — | 5,000 transactions / 10 min | **INTEGRATED** (when `FIRMS_MAP_KEY` is set) |
| NASA FIRMS MODIS 24 h CSV | NASA LANCE / FIRMS | MODIS C6.1 | Europe | Hotspots | `.../data/active_fire/modis-c6.1/csv/MODIS_C6_1_Europe_24h.csv` | CSV | 24 h file | Yes | None | NASA open data | none | OK | READY (proxy) |
| NASA FIRMS WMS | NASA LANCE / FIRMS | Fire map layers | Global | Map images | `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/` | WMS | — | Yes | MAP_KEY for GetMap | NASA open data | `*` | — | POSSIBLE (key) |
| EFFIS WMS | Copernicus EMS / JRC | Hotspots, burnt areas, fire danger (FWI) | Europe | Map images | `https://maps.effis.emergency.copernicus.eu/effis?service=WMS` | WMS PNG | Daily | Yes | None | Free, open incl. commercial with Copernicus credit | `*` | High (0.35 s) | READY (overlay) |
| EFFIS WFS | Copernicus EMS / JRC | Hotspots | Europe | Features | same host `service=WFS` | GeoJSON | — | Yes | None | As above | `*` | Returned 2019–2021 data; time filter UNVERIFIED | NEEDS REVIEW |
| NIFC WFIGS / InciWeb | US NIFC | Fire perimeters | US only | Polygons | `services3.arcgis.com/...`, `inciweb.wildfire.gov` | — | 5 min | Yes | None | Public | — | — | NOT USABLE (no coverage) |

## 17. Earthquakes

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EMSC FDSN | European-Mediterranean Seismological Centre | Events incl. IGN and ReNaSS solutions (11 in 30 days, M1.2–2.1) | Euro-Mediterranean; ~100 km around Andorra | Events | `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&lat&lon&maxradius&starttime` | JSON | Near-real-time (max-age 15) | Yes | None | Free with attribution (exact licence UNVERIFIED) | `*` | High (0.16 s) | **INTEGRATED** (direct) |
| EMSC websocket | EMSC | Push of new/updated events | Global | Events | `wss://www.seismicportal.eu/standing_order/websocket` | JSON over WebSocket | Push | Yes | None | As above | — | Connected; no message in 25 s | READY |
| USGS FDSN | USGS | Earthquake catalogue | Global | Events | `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson…` | GeoJSON | 60 s | Yes | None | Public domain | `*` | 0 events within 100 km in 365 days | NOT USABLE (for local coverage) |
| IGN Spain RSS | Instituto Geográfico Nacional | Recent Spanish-network events | Spain + surroundings (last few days) | Events | `https://www.ign.es/ign/RssTools/sismologia.xml` | RSS (mag in text) | Recent days | Yes | None | — | `*` | OK | POSSIBLE |
| IGN Spain FDSN | Instituto Geográfico Nacional | — | — | — | `https://www.ign.es/fdsnws/event/1/query` | — | — | — | — | — | — | 404 | NOT USABLE |
| ICGC FDSN | Institut Cartogràfic i Geològic de Catalunya | Event service | Catalonia | Events | `https://ws.icgc.cat/fdsnws/event/1/` | — | — | Yes | None | — | `*` | Every query 204; documented as unavailable | NOT USABLE |

## 18. Other providers from the God's Eye View inventory

| Source | Organization | Dataset | Geographic coverage | Data type | Endpoint | Format | Update frequency | Public | Authentication | License | CORS | Reliability | Integration status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AISStream | AISStream | Vessel positions | Global seas | Moving points | `wss://stream.aisstream.io/v0/stream` | WebSocket | Live | Yes | API key | — | — | — | NOT USABLE (landlocked) |
| DeFlock ALPR | OSM / DeFlock | ALPR cameras | US / Canada | Points | `tiles.dontgetflocked.com/...` | JSON | 1 h | Yes | None | — | — | — | NOT USABLE (no coverage) |
| Google Places / Geocoding | Google | Places, geocoding | Global | Search | `places.googleapis.com/v1/places`, `maps.googleapis.com/maps/api/geocode/json` | JSON | — | Yes | API key | Google ToS | — | — | POSSIBLE (key, UNVERIFIED) |
| Radio Browser | Radio Browser | Radio stations | Global (Andorran stations UNVERIFIED) | Directory | `all.api.radio-browser.info/json/servers` | JSON | 45 min | Yes | None | — | — | — | POSSIBLE (UNVERIFIED) |
| Google News RSS / GDELT | Google / GDELT | News | Global | Articles | `news.google.com/rss/search`, `api.gdeltproject.org/api/v2/doc/doc` | RSS / JSON | 5 min | Yes | None | Google News personal / non-commercial | — | — | POSSIBLE (UNVERIFIED) |
| OpenAI (voice / HUD) | OpenAI | Realtime voice, summaries | — | API | `api.openai.com/v1/...` | JSON / WebRTC | — | Paid | API key | Commercial API; screenshots sent to provider | — | — | NOT USABLE (not a data source; out of scope) |

---

## Notes per source

- **ALV parking occupancy:** `FREEOCCUPANCY` values were identical across three reads over 10 minutes, so the real
  update frequency is **UNVERIFIED**. The layer is shown with a low-reliability rating and its source timestamp; ask the
  Comú about the update frequency.
- **Mobilitat cameras:** each image is an animated GIF of ~1.2 MB (470×320, ~25 frames), refreshed every ~5–10 min.
  Images are fetched only through the proxy for known camera ids (never an open proxy). The list API is CORS-locked to mobilitat.ad.
- **Mobilitat API (all endpoints):** undocumented v1 internal API with no SLA; legal notice reserves all rights.
  Published with "No oficial" tag while permission is requested. Cyclist tracking is never queried.
- **meteo.ad DadesActuals:** values are strings with units and the timestamp is inside HTML; positions are pixels, so
  the adapter joins on station `codi` with the metadata layer (which has a few code typos). Official access is via the
  `/json` request form.
- **meteo.ad radar is RainViewer:** the "radar" on meteo.ad is RainViewer tiles, not an SMN radar product. Use
  RainViewer directly if a radar layer is added (licence limits commercial use).
- **EUMETSAT satellite proxy (sig.govern.ad):** its advertised time extent ends 2025-02-11 (stale). Use EUMETSAT
  directly instead.
- **feratel webcams:** embed-only through the official feratel player; direct requests returned 404 and nothing was
  circumvented. Licence belongs to feratel / Grandvalira Resorts.
- **Meteoalarm:** the JSON feed includes expired warnings; filter on `expires`. Redistribution T&C still to review.
- **EAWS:** seasonal (roughly December–May); outside the season the ratings file may be empty or old.
- **CelesTrak:** only OMM JSON carries 6-digit catalogue numbers (5-digit catalogue exhausted 2026-07-11). Fetch at most
  once per 2 h update, server-side.
- **NASA FIRMS:** thermal anomalies are not all wildfires; keep `MAP_KEY` server-side only.
- **OpenSky:** non-profit use only; anonymous 400 credits/day, OAuth2 4,000/day. Used only as fallback.
- **Govern SIG (all layers):** no general reuse licence; some layers forbid commercial use without authorisation.
  Credit "Base topogràfica cedida pel Govern d'Andorra". `sig.govern.ad` returns HTTP 500 to "HeadlessChrome" user
  agents; this only affects automated headless testing.
- **Google 3D / Cesium ion:** loaded only when `VITE_GOOGLE_MAPS_API_KEY` / `VITE_CESIUM_ION_TOKEN` is set; browser keys
  must be referrer-restricted. Google tiles must not be cached.
- **Overpass:** never queried from clients; snapshots are built with retry/backoff (`npm run data:static`).

---

The machine-readable registry used by the app (ids, endpoints, licence status, freshness, attribution,
`permissionPending`) is **[`src/config/dataSources.ts`](../src/config/dataSources.ts)**. Keep it and this document in
sync when a source is added, removed or its permission status changes.
