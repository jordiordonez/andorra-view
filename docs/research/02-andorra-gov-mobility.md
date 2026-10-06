# Andorra View — Phase 0: Government GIS, Mobility, Transport, Parking & OSM sources

Tested 2026-10-06 (08:30–08:55 UTC) from a residential connection with `curl`/Python only. No auth, CAPTCHA, or anti-bot measures were bypassed. Every endpoint below was hit live unless it is marked **UNVERIFIED**. CORS was tested by sending `Origin: http://localhost:5173` and reading `Access-Control-Allow-Origin` (ACAO).
Samples are in `scratchpad/samples/`. None of them contain personal data.

Andorra bbox used: lat 42.42–42.66, lon 1.40–1.79.

---

## 0. Key takeaways

1. **The main GIS backend is `https://sig.govern.ad/server/rest/services` (ArcGIS Enterprise 11.2, Govern d'Andorra).** Many folders are anonymous (`IDE`, `Hosted`, `Area_Carto`, `CARBURANTS`, `Servei_public`, `Mobilitat`). Others need a token (`Cartografia_Base`, `Ortofotos`, `Edificis`, `TURISME`, `Frontera`, `Qualitat_Aire`, `Energia`, `Sanitat`, `Públics`, `Refugis`). The server sends **`ACAO: *`**, so the browser can call it directly with no proxy.
2. **Terrain:** `IDE/Andorra_DTM_5m_WGS84/ImageServer` is a Web Mercator tile cache of **LERC** elevation tiles (levels 0–16, about 5–6 m pixels, F32, 774–2942 m) with `ACAO: *`. CesiumJS `ArcGISTiledElevationTerrainProvider` reads this format.
3. **Orthophoto 2025 (25 cm) WMTS:** `https://www.ideandorra.ad/Serveis/gwc/service/wmts` (GeoServer/GWC, EPSG:900913 matrix set). It sends **no CORS header**. sig.govern.ad also has a cached Orto 2022 Web Mercator tile service with `ACAO: *`.
4. **Real-time road information:** `https://app.mobilitat.ad/api/v1/*` is a public JSON API used by mobilitat.ad. It covers incidents, 69 webcams, points (parkings, EV chargers, hospitals) and snow status, with a 120 s cache. **CORS is locked to `https://www.mobilitat.ad`**, so we need a server-side proxy. The site terms say "Tots els drets reservats… només ús personal… ús comercial no permès", so **we need permission before reusing it**.
5. **Real-time parking (Andorra la Vella only):** the comú's ArcGIS layer exposes `FREEOCCUPANCY`/`TOTALOCCUPANCY` for 13 car parks (1,709 spaces). CORS reflects the requesting origin. The values did not change across three reads over 10 minutes, so **freshness is unverified**. [security finding removed from the public copy: reported privately]
6. **Public transport:** there is **no public GTFS or GTFS-RT for Andorra.** Mobility Database (6,591 feeds) has no `AD` feeds, and the transit.land atlas has no Andorra file. Static stops (357) and line shapes (16) are published as an ArcGIS layer, "Línies autobús 2025". The stop fields (`stop_id`, `stop_code`, `route_name`) look like they come from a GTFS export, so it may be worth asking for it. No live vehicle positions were found.
7. **OSM/Overpass works for Andorra.** The `overpass-api.de` data was current. It often returns 504/429 errors, so use retry with backoff. The `kumi.systems` mirror was about 4 months stale.

---

## 1. Govern d'Andorra — IDE / Cartografia / SIG

### 1.1 Portals found
| URL | Result |
|---|---|
| `https://www.ideandorra.ad` | 200 → redirects to `https://www.cartografia.ad/geoportal` (IDE Andorra, Àrea de Cartografia) |
| `https://www.cartografia.ad/serveis-ogc` | Lists about 45 WMS services under `https://www.ideandorra.ad/Serveis/<name>/wms`, plus WMTS `.../Serveis/gwc/service/wmts`, CSW, WFS, OpenLS |
| `https://www.cartografia.ad/web-de-descarregues` → `https://www.ideandorra.ad/geodades` | Download site. Free, but requires a form with user details and accepting terms. **UNVERIFIED** (not submitted) |
| `https://sig.govern.ad/server/rest/services?f=json` | 200, ArcGIS 11.2, 60 folders |
| `https://sig.govern.ad/portal/sharing/rest/search` | Portal works anonymously. Item search returns public items, with `licenseInfo` mostly empty |
| `https://www.estadistica.ad/portal/...` | Estadística ArcGIS Hub (not explored further) |
| dadesobertes.ad / opendata.ad / opendata.govern.ad / govern.ad/ca/dades-obertes | DNS failure or 404. **No national open-data portal found.** `transparencia.ad` exists (not a data API) |

### 1.2 IDE Andorra OGC services (GeoServer, `www.ideandorra.ad/Serveis`)
All of these return 200 in about 0.15–0.4 s. **ACAO header: none** on every one, so the browser needs a proxy unless it only uses `<img>`-style imagery. CRS offered: EPSG:27563 (native, NTF Lambert Sud), 25831, 23031, 4258, 4326, 900913/3857, CRS:84.

| Service | Command | Notes |
|---|---|---|
| WMTS | `curl "https://www.ideandorra.ad/Serveis/gwc/service/wmts?REQUEST=GetCapabilities"` | 142 KB. Layers: `wmsorto2025:Andorra_orto_25cmGSD_2025` (only `EPSG:900913` matrix set, png/jpeg), `wmsorto2012:orto2012`, `fons` (sets Andorra_3857/4326/25831/27563…) |
| WMTS tile test | `...?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=wmsorto2025:Andorra_orto_25cmGSD_2025&STYLE=&TILEMATRIXSET=EPSG:900913&TILEMATRIX=EPSG:900913:15&TILEROW=12101&TILECOL=16522&FORMAT=image/jpeg` | 200, 30 KB JPEG, 0.15 s (sample `ideandorra_wmts_orto2025_z15.jpg`) |
| WMS orto 2025 | `.../Serveis/wmsorto2025/wms?REQUEST=GetCapabilities&SERVICE=WMS` | Layer `Andorra_orto_25cmGSD_2025`. GetMap 256 px took 2.1 s (uncached) |
| WMS mobilitat | `.../Serveis/wms_mobilitat/wms` | Bike lanes only: `CB_Comunals_*`, `CB_Generals_*` |
| WMS carrerer | `.../Serveis/wms_carrerer/wms` | Street map + POI classes (`aparcaments`, `farmacies`, `bombers`, `correus`, `estacions_servei`…) |
| WMS cartogeneral | `.../Serveis/wms_cartogeneral/wms` | `CarreteresG_S`, `PK`, `Lim_parroquies_5000`, `limit_andorra_pol`, `punt_poblacions`, rivers. **AccessConstraints: "Dades propietat del govern d'Andorra. Prohibit l'ús amb finalitats comercials sense autorització del govern"** |
| WFS | `.../Serveis/ows?service=WFS&request=GetCapabilities` | 544 KB, **927 feature types**, Fees/AccessConstraints NONE |
| WFS GetFeature test | `.../Serveis/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=wms_carrerer:aparcaments&outputFormat=application/json&srsName=EPSG:4326` | 200, 107 KB, 0.25 s, **205 parking points**. Fields: `id_poi, categoria, subcategoria, nom, adr_geocod, tipus` (Descobert/Cobert…). No capacity (sample `ideandorra_wfs_aparcaments_sample.geojson`) |

### 1.3 ArcGIS REST `sig.govern.ad/server/rest/services` (anonymous, `ACAO: *`, `Access-Control-Allow-Credentials: true`)
Query pattern: `<svc>/<layer>/query?where=1=1&outFields=*&outSR=4326&f=geojson`. Most layers have `maxRecordCount` 2000; some have 20000 or 50000.

| Service/layer | Geom | Count | Key fields | Notes |
|---|---|---|---|---|
| `Hosted/pol_parroquies/FeatureServer/0` | Polygon | 7 | `parroquia, cod_postal, abrev, id1, lat, lon` | **Parish polygons.** GeoJSON 349 KB, 0.25 s. Best choice for boundaries |
| `IDE/Administrative_Units/MapServer/1-6` | INSPIRE AU | 7 | `NAME_1, NATIONALCODE, NATIONALLEVEL…` | INSPIRE model, native SR 27563 |
| `IDE/Limits_administratius_i_poblacions/MapServer` | 0 = Poblacions (63 multipoints, `Nom_poblac`); 1 = parish limits (9 lines); 2 = state boundary | | | |
| `IDE/Transport_network/MapServer/0` "Eixos vies" | Line | 1509 | `ROADNAME, NATIONALROADCODE, FUNTIONALROADCLASS, LOCALROADCODE, EUROPEANROUTENUMBER` | INSPIRE road network. Layers 2/3 are PK (km markers) |
| `IDE/Xarxa_de_transports/MapServer/187` | Line | – | Carreteres Generals i Secundàries | Layer 188 = PK every 100 m |
| `Hosted/Carreteres_GS_Andorra/FeatureServer/0` | Line | 134 | `designacio, nom_carret, descripcio` | CG/CS roads, simple |
| `Hosted/Xarxa_vial_Andorra_2022_WFL1/FeatureServer/0` | Line | 126 | `designacio, nom_carret, dist` | Titled "Xarxa viària Andorra 2026" |
| `Hosted/Edificis_2019/FeatureServer/0` | Polygon | **21,529** | `fea_name, fea_catego, level, parròquia` | Building footprints (2019). Needs paging (2000/req). **No height field.** Heights would need the DTM or `level` |
| `IDE/Adreces/FeatureServer/1` | Point | 11,571 | INSPIRE AD fields (`THOROUGHFARENAME, LD_ADDRESSNUMBER, POSTALDESCRIPTOR…`) | Postal addresses (no person data) |
| `IDE/POI/MapServer/3` | Point | 1,301 | `nom, categoria_poi_id, places, carretera, pk, web, parroquia_nom` | POIs incl. parkings (`places` = capacity text) |
| `IDE/LocatorIDE/GeocodeServer`, `IDE/nomenclator2025v2/GeocodeServer`, `IDE/POI_Locator`, `IDE/LocatorPK100m_` | Geocoders | | | Official geocoding as an alternative to Nominatim (not load-tested) |
| `IDE/Andorra_DTM_5m_WGS84/ImageServer` | Raster | | F32, 1 band, min 774 / max 2942 m, pixel ~5.88 m (3857) | **Tile cache LERC (`CntZImage`), LODs 0–16 used (minLOD 0, maxLOD 16)**. `tile/{z}/{y}/{x}` z10: 46 KB/0.06 s, z14: 75 KB/0.09 s, ACAO `*`. `exportImage` (tiff F32) 256² in 1.4 s. `identify` at Andorra la Vella → 1008 m ✔ |
| `IDE/Andorra_DTM_5mRasterElevation/ImageServer` | Raster | | 5 m, F32 | Same DTM, no tile cache confirmed |
| `IDE/ortofotos/MapServer` | Dynamic | | Orto 1972, 1995, 2003, 2008, 2012, 2018, 2019, 2022, **2025**, IRC 2003/2025 | Dynamic export (no cache), SR 27563 |
| `Hosted/Mapa_Base_IDE_Orto_2022_WM/MapServer` | **Tiled** 3857, 23 LODs | | | `tile/15/12101/16522` → 200, 58 KB **PNG** (format PNG8 per tileInfo), 0.19 s, ACAO * |
| `Hosted/Mapa_Base_IDE_WM_Color` / `_Gris` / `_Color_blanc_fons` | **Tiled** 3857 | | | Official topographic basemap tiles (sample `sig_basemap_color_tile.png`) |
| `Hosted/Línies_autobús_2025/FeatureServer` | 1 = 357 stops, 2 = 16 line shapes | | stops: `stop_code, stop_name, route_name, line, interchange, stop_id, stop_lat/lon` (lat/lon fields often null, so use the geometry); lines: `linia, name, trip_heads` | National bus L1–L7 + Lé (exprés). **Static only** |
| `Hosted/linies_bus_2025/FeatureServer` | Stops per line (L1…L7, LE), "Línies Coopalsa juliol 2025" | | | Older or variant version |
| `Hosted/Intercanviadors/FeatureServer/0` | Polygon | 5 | `name, description` | Bus interchange zones |
| `Hosted/IMD_Intensitat_Mitjana_Diària/FeatureServer/0` | Line | 13,218 | `nomvia, ab_flow, ba_flow, tot_flow, any_` | **Annual average daily traffic (static).** Good for a "traffic heat" layer |
| `Hosted/Model_nacional_Mobilitat/FeatureServer/0` | Line | 2,127 | `flow_v_h, lanes, vcrat__` | Model flows (veh/h, V/C ratio), SR 32631. Static |
| `IDE/Mobilitat/MapServer`, `Hosted/Carrils_bici` | Bike lanes | | | |
| `CARBURANTS/CARBURANTS/FeatureServer` | 0 = 75 installations, 1/2 = fuel reference prices (275 rows) | | 0: `NOM, CARRER, CESI, DESCINSTALACIO, POTENCIA…` and also a **`Titular`** field (owner, may be a person; we did not print it); 1: `Parroquia, Denominacio_distribuidor, PREU, Tipus_carburant, DataInici, DataFi` | Fuel prices. Polygon geometry |
| `Hosted/Estacions_meteorològiques_Andorra/FeatureServer/0` | Point | 33 | `nom, codi, servei, altitud, variables_mesurades, freqüència_mesura, dades` | Station metadata only |
| `Mobilitat/Accidents_PRE/FeatureServer` | – | – | – | **499 Token Required** (not usable) |
| `Meteo_Andorra/ExportWebMapMeteoRadar/GPServer` | GP | | | Not tested |

**Avoid:** the `Hosted/survey123_*` services. They are form or citizen-submission layers that may hold personal data and were not queried. Only read (GET/query) operations are ever used. [security finding removed from the public copy: reported privately]

**Licence / ToS (Govern):** no open licence was found. The portal item `licenseInfo` is empty for almost everything. Two exceptions: `bta5c1m2019` says *"S'ha de mencionar la font de les dades com a 'Base topogràfica cedida pel Govern d'Andorra'"*, and WMS cartogeneral says *"Prohibit l'ús amb finalitats comercials sense autorització"*. The general `cartografia.ad/avis-legal` has no reuse licence. → Treat it as **non-commercial use with attribution "Font: Govern d'Andorra – IDE Andorra / Àrea de Cartografia"** and email the Àrea de Cartografia to confirm. That makes this **NEEDS REVIEW** for a public product, though technically READY.

---

## 2. Mobilitat Andorra (`www.mobilitat.ad`)

Site: ASP.NET behind Cloudflare. The homepage (117 KB) contains jQuery `$.ajax` GETs with **no auth headers or tokens**. It polls every **120 s** (incidents, cameras, snow, campaigns, extraordinaris) and every **20 s** for cyclist locations. The traffic layer is the **Google Maps TrafficLayer** (not reusable).

Base: `https://app.mobilitat.ad/api/v1/`. All requests returned 200, about 0.07–0.5 s. Headers: `cache-control: max-age=120`, `server: cloudflare`, and **`Access-Control-Allow-Origin: https://www.mobilitat.ad`**. With `Origin: http://localhost:5173` there is no ACAO, **so a server-side proxy is required.**

| Endpoint | Size / count | Structure (field names) |
|---|---|---|
| `incidents/ca` (also es/fr/en likely, **UNVERIFIED**) | 6.8 KB, 6 items | `{success, result:[{id, language, category_id, category:{id,classification,language,title,icon,participacio}, title, text(HTML), init_date, final_date ("9999-12-31…" = open-ended), important, has_gps, lat(str), lng(str), image}]}` |
| `categories/ca` | 4.8 KB | `categories_incidents` (Accidents, Obres, Retencions, Neu, Pluja, Talls, Restricció 19t/3,5t, Color de la neu groc/taronja/vermell/negra, Vent, Tempesta, Risc Incendi, Informació, Desperfectes, Obstacles, Temperatura alta), `categories_points` (Hospital, CAP, Punts de càrrega VE, Aparcaments, Cicland), `categories_camares` (9 zones incl. Frontera Espanya / França) |
| `cameras` | 20.6 KB, **69 cams** | `{id, category_order, camera_order, title, lat, lng, url_gif, category_id, icon}`. `url_gif` = `https://imgs.mobilitat.ad/prod/<Name>.gif?t=<yyyymmddHHMMSS>` |
| `cameras?important=true` | 3 KB | Subset (border cams etc.) |
| `points/ca` | 45.6 KB, 124 | `{id, category_id, language, title, text(HTML), lat, lng, category}`: **71 Aparcaments** (text = "NN places", capacity only), **27 EV charging points** ("Punts de càrrega: N"), 14 Cicland, 11 CAP, 1 Hospital |
| `campaigns/ca`, `extraordinaris`, `llevaneus`, `localitzaciociclistes`, `nevades` | `{success:true,result:[]}` today | Seasonal. `llevaneus` = snowplough positions (polling commented out in JS). `localitzaciociclistes` = event cyclist tracking. **Inspect fields for personal data before using; they were empty during the test** |
| `nevadesactive` | `{success:true,result:false}` | Snow-plan active flag |

Webcam images: `https://imgs.mobilitat.ad/prod/NacionsUnides.gif` → 200, **1.2 MB animated GIF**, `last-modified` about 1 min before the request, `max-age=120`, **no ACAO**. It shows fine in an HTML `<img>` overlay. A Cesium billboard or WebGL texture would need a proxy.

Not found: travel times, border queue times, traffic counts, or a real-time traffic state. Cameras are the only border signal. No GTFS.
Pages `/previsions` (DET seasonal forecast text) and `/ocupacions-via-rases` (PDF forms) are editorial and have no API.

**ToS** (`/avis-legal`): *"Tots els drets estan reservats… Només està autoritzat l'ús personal de les imatges i arxius que es poden descarregar de la web. El seu ús comercial no està permès. No està permesa la modificació del web ni dels seus continguts."*
**Stability risk:** this is an undocumented internal API (v1), unchanged since jQuery 3.6. Field names are stable but the API carries no SLA.
→ **Recommendation: NEEDS REVIEW.** It is technically trivial (server proxy with 120 s cache, attribution, no image modification). Ask the Departament de Mobilitat for written permission before going public.

---

## 3. Public transport

| Item | Finding |
|---|---|
| `bus.ad` (Mou-te en Bus, WordPress/LiteSpeed) | Line pages with timetables as HTML text. `https://bus.ad/feed/` RSS of service changes (200, `application/rss+xml`) is usable for "avisos" (service notices). `wp-json` exists. No API with timetables or vehicles |
| `govern.ad/documents/d/guest/bus_linies_nacionals` | 200, PDF, 12 pages, 2 MB (timetables) |
| Official experience app | `sig.govern.ad/portal/apps/experiencebuilder/experience/?id=71014fcc07ed49dcb05230c95784aab1`, backed by `Hosted/Línies_autobús_2025` (section 1.3) |
| Mobility Database (`https://files.mobilitydatabase.org/feeds_v2.csv`, 6,591 rows) | **0 feeds with country AD.** Feeds whose bbox overlaps Andorra: Catalonia intercity (mdb-2796/2926, NAP download returned **401** without a key) and Occitanie liO (tdg-81026, 25.6 MB, **0 stops inside the Andorra bbox**) |
| transit.land | Atlas `feeds/` has 818 files, none for Andorra (filename check). REST API needs a key (401) |
| Live vehicle positions | **None found** (no GTFS-RT, no SIRI, nothing in bus.ad JS). Parish buses (bus comunal): **UNVERIFIED**, no data source found |
| Operators (Coopalsa, Autocars Nadal, Hispano Andorrana) | No public feeds found. **UNVERIFIED** |

→ Static network: **POSSIBLE/READY** via the ArcGIS layer. GTFS: **NOT AVAILABLE**. The `stop_id/stop_code/route_name` fields suggest an internal GTFS exists, so ask Mobilitat or the operators. Real-time: **NOT USABLE**.

---

## 4. Parking & EV chargers

| Comú | Source | Real-time? | Status |
|---|---|---|---|
| **Andorra la Vella** | `https://sit.andorralavella.ad/server/rest/services/Aparcaments/AparcamentsComunals_SQLserver/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson` (also `AparcamentsComunals`). Used by the public app `sit.andorralavella.ad/aparcaments/` (Esri WAB, webmap `9d6e23bf…`) | **Yes (claimed):** `FREEOCCUPANCY`, `TOTALOCCUPANCY` on 13 of 36 car parks (1,709 spaces). Other fields: `NOM, POBLACIO, PREU_HORA, PROPI, DESCRIPTION ("Contador A.Limitado - Parking …"), COORDX/Y` | 200, 18.7 KB, 0.29 s, ACAO echoes the origin. **The values were identical at 08:40, 08:45 and 08:50 UTC**, so the update rate is unknown and the feed may be stale. **NEEDS REVIEW**: monitor it for a day and contact the comú. [security finding removed from the public copy: reported privately] |
| Escaldes-Engordany | No website reachable (escaldes.ad, e-escaldes.ad, comuescaldes.ad, escaldes-engordany.ad all failed DNS/TLS). OSM shows 2 parkings with operator Comú d'Escaldes | – | **UNVERIFIED** |
| Encamp | `comuencamp.ad/serveis/mobilitat-i-aparcaments`, `encamp.ad/ca/informacio-practica/aparcaments` (static list); "Luclic" app | No public feed | NOT USABLE (static only) |
| Canillo | `canillo.ad/parquing-i-abonaments` → `e-canillo.com/pk/…` is a **citizen account portal** (personal data, login) | No | NOT USABLE |
| La Massana | `lamassana.ad/aparcaments` → operator `aparcamentsgavsa.com` (WordPress), static pages | No | NOT USABLE |
| Ordino | Homepage advertises an "app-parking" | App only | **UNVERIFIED** |
| Sant Julià de Lòria | `comusantjulia.ad/ca/lauredia-practica/on-aparcar/aparcaments-comunals/` with Google Maps embeds | No | Static only |

Country-wide static parking: IDE WFS `wms_carrerer:aparcaments` (205 points, type), mobilitat `points/ca` (71 with capacity text), `IDE/POI` (`places`), OSM (417, of which 31 have a `capacity` tag summing to 3,538).

EV chargers: mobilitat `points/ca` category 5 (**27 sites with number of points**, the best source). OSM `amenity=charging_station` has 11 (operators incl. FEDA, "mou-te amb", Circutor). OpenChargeMap needs an API key (`403 You must specify an API key`). Endolla.ad does not resolve. FEDA's IDE layer (`IDE/FEDA/MapServer`) is only the distribution network for 2010–2018 and has no chargers. Live charger availability: **none found**.

---

## 5. OpenStreetMap

### Overpass
| Instance | Result |
|---|---|
| `https://overpass-api.de/api/interpreter` | Data timestamp **2026-10-06T08:41Z (current)**, ACAO `*`. Small queries take 1–5 s, but about 50% of first attempts returned **504** and burst calls returned **429**. Retrying after 15 s always succeeded |
| `https://maps.mail.ru/osm/tools/overpass/api/interpreter` | 200, current data, 15 s, ACAO `*` |
| `https://overpass.kumi.systems/api/interpreter` | 200, but **data from 2026-06-01 (stale)**. A 13-count query took 88 s |
| `https://overpass.private.coffee` | 502 after 116 s |

Counts (area `["ISO3166-1"="AD"][admin_level=2]`):

| Feature | Query | Count | Timing |
|---|---|---|---|
| Parishes | `rel[boundary=administrative][admin_level=7]` | **7** (rel 2804753–2804759, `ref` 1–7) | tags 3 s. `out geom` 196 KB, 2.1 s |
| Places | `node[place~city|town|village|hamlet]` | 68 (7 town, 34 village, 27 hamlet) | 1.6 s |
| CG roads | `way[highway][ref~^CG-?[1-6]$]` (bbox) | 841 ways (CG-2 336, CG-3 231, CG-1 192, CG-4 44, CG-5 26, CG-6 12) | `out geom` 741 KB, 2.7 s |
| Parking | `nwr[amenity=parking]` | 417 (31 with capacity, 49 named. Types: surface 167, multi-storey 18, underground 17) | 1.2 s |
| Bus stops | `nwr[highway=bus_stop]` | 322 (315 named, 222 with `ref`, 268 with `network`) | 2.2 s |
| Bus routes | `rel[route=bus]` | 19 | – |
| Hospitals | `nwr[amenity=hospital]` | 10 (incl. Hospital Nostra Senyora de Meritxell, clinics, 6 unnamed nodes) | 2.9 s |
| EV charging | `nwr[amenity=charging_station]` | 11 | 4.9 s |
| Buildings | `way[building]` | 7,415 (760 with `building:levels`, 5 with `height`) | – |

Licence: ODbL. Attribution "© OpenStreetMap contributors" is required, and share-alike applies to derived databases. → **READY**. Snapshot it at build time (or use a Geofabrik `andorra-latest.osm.pbf` extract, **UNVERIFIED** in this run) rather than querying Overpass live from clients.

### Nominatim (osm.org policy, fetched from operations.osmfoundation.org)
Maximum 1 request per second. Requests need an identifying User-Agent or Referer. Attribution is required. Results must be cached. No bulk or periodic geocoding. Apps must be able to switch service without a software update. → For geocoding inside Andorra prefer **`sig.govern.ad … IDE/LocatorIDE/GeocodeServer`** or `nomenclator2025v2`. Their rate limits are untested, so they are **POSSIBLE**.

---

## 6. Summary table

| # | Org | Dataset | Endpoint | Format | Update | Auth | Licence | CORS | Reliability | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Govern (IDE) | DTM 5 m terrain | `sig.govern.ad/server/rest/services/IDE/Andorra_DTM_5m_WGS84/ImageServer/tile/{z}/{y}/{x}` | LERC tiles 3857 | static (2025 item) | none | none stated → attribution + ask | `*` | fast (<0.15 s) | **READY** (licence check) |
| 2 | Govern (IDE) | Orthophoto 2025 25 cm | `www.ideandorra.ad/Serveis/gwc/service/wmts` (EPSG:900913) | WMTS JPEG/PNG | static | none | non-commercial without permission | **none** | fast | **POSSIBLE** (proxy) |
| 3 | Govern (SIG) | Orto 2022 / topo basemaps tiled | `sig.govern.ad/.../Hosted/Mapa_Base_IDE_Orto_2022_WM/MapServer/tile/{z}/{y}/{x}` and `Mapa_Base_IDE_WM_Color` | ArcGIS tiles PNG | static | none | as above | `*` | fast | **READY** (licence check) |
| 4 | Govern (SIG) | Parish polygons | `.../Hosted/pol_parroquies/FeatureServer/0/query?f=geojson` | GeoJSON | static | none | as above | `*` | fast | **READY** |
| 5 | Govern (SIG) | Roads (INSPIRE / CG-CS), PK | `IDE/Transport_network`, `Hosted/Carreteres_GS_Andorra` | GeoJSON | static | none | as above | `*` | fast | **READY** |
| 6 | Govern (SIG) | Buildings 2019 (21.5 k) | `Hosted/Edificis_2019/FeatureServer/0` | GeoJSON (paged) | 2019 | none | as above | `*` | ok | **POSSIBLE** (no heights) |
| 7 | Govern (SIG) | Addresses / POI / geocoders | `IDE/Adreces`, `IDE/POI`, `IDE/LocatorIDE` | JSON | irregular | none | as above | `*` | ok | **POSSIBLE** |
| 8 | Govern (SIG) | Traffic IMD + national model | `Hosted/IMD_…`, `Hosted/Model_nacional_Mobilitat` | GeoJSON | static (annual) | none | as above | `*` | ok | **READY** (static layer) |
| 9 | Govern (SIG) | Bus lines & stops 2025 | `Hosted/Línies_autobús_2025/FeatureServer/1,2` | GeoJSON | ad hoc (2025) | none | as above | `*` | ok | **READY** (static) |
| 10 | Govern (SIG) | Fuel prices | `CARBURANTS/CARBURANTS/FeatureServer/1` | JSON | daily? (**UNVERIFIED**) | none | as above | `*` | ok | **POSSIBLE** |
| 11 | Govern (IDE) | WFS 927 types (incl. aparcaments 205) | `www.ideandorra.ad/Serveis/ows?service=WFS` | GeoJSON | static | none | Fees/Access NONE | **none** | fast | **POSSIBLE** (proxy) |
| 12 | Mobilitat | Incidents (works, closures, snow, accidents) | `app.mobilitat.ad/api/v1/incidents/ca` | JSON | ~2 min | none | all rights reserved, personal use only | `www.mobilitat.ad` only | undocumented | **NEEDS REVIEW** |
| 13 | Mobilitat | 69 webcams (incl. borders) | `app.mobilitat.ad/api/v1/cameras` + `imgs.mobilitat.ad/prod/*.gif` | JSON + GIF | ~2 min | none | same | none / site-only | undocumented, heavy GIFs | **NEEDS REVIEW** |
| 14 | Mobilitat | Points (71 parkings with capacity, 27 EV sites, hospital, CAP) | `app.mobilitat.ad/api/v1/points/ca` | JSON | rare | none | same | site-only | undocumented | **NEEDS REVIEW** |
| 15 | Mobilitat | Snow plan / snowploughs / cyclists | `nevadesactive`, `llevaneus`, `localitzaciociclistes` | JSON | 20 s–2 min, seasonal | none | same (+ check personal data) | site-only | empty today | **NEEDS REVIEW** |
| 16 | Comú Andorra la Vella | Parking occupancy (13 car parks) | `sit.andorralavella.ad/server/rest/services/Aparcaments/AparcamentsComunals_SQLserver/FeatureServer/0` | GeoJSON | claimed real-time, **unchanged over 10 min** | none | none stated | origin echoed | unclear freshness, insecure editing | **NEEDS REVIEW** |
| 17 | Other 6 comuns | Parking occupancy | – | – | – | – | – | – | – | **NOT USABLE / UNVERIFIED** |
| 18 | bus.ad | Service notices RSS | `https://bus.ad/feed/` | RSS | ad hoc | none | site terms (not read) | not tested | ok | **POSSIBLE** |
| 19 | – | GTFS / GTFS-RT / vehicle positions | none (MobilityDB, transit.land) | – | – | – | – | – | – | **NOT USABLE** (ask) |
| 20 | OSM | Parishes, places, CG roads, parkings, stops, hospitals, EV | `overpass-api.de/api/interpreter` | JSON | minutely | none | ODbL | `*` | 504/429 frequent | **READY** (snapshot + cache) |
| 21 | OSMF | Nominatim | `nominatim.openstreetmap.org` | JSON | – | UA required | ODbL, 1 rps | yes | policy-limited | **POSSIBLE** (light use only) |
| 22 | OpenChargeMap | EV chargers | `api.openchargemap.io/v3/poi` | JSON | – | **API key required** (403) | CC-BY-SA | – | – | **POSSIBLE** (with key) |
| 23 | Govern (SIG) | Accidents | `Mobilitat/Accidents_PRE` | – | – | **token** | – | – | – | **NOT USABLE** |

## 7. Suggested next steps
- Email **Àrea de Cartografia** to confirm reuse terms and attribution for the IDE and sig.govern.ad layers (DTM, ortho, basemaps, buildings).
- Email **Departament de Mobilitat** for permission to proxy `app.mobilitat.ad` (incidents and webcams), and ask whether a GTFS export of the 2025 network exists.
- Email **Comú d'Andorra la Vella**: ask about the update frequency of `FREEOCCUPANCY`. [security finding removed from the public copy: reported privately]
- Prototype the Cesium terrain with `ArcGISTiledElevationTerrainProvider.fromUrl('https://sig.govern.ad/server/rest/services/IDE/Andorra_DTM_5m_WGS84/ImageServer')`. It will need a global fallback outside Andorra's extent.
