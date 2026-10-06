# Andorra View — Phase 0: Weather, Snow, Webcams, Environment, Energy sources

Research date: 2026-10-06 (tests run 08:30–08:47 UTC). All endpoints below were curl-tested unless marked **UNVERIFIED**.
No auth, CAPTCHA or anti-bot measure was bypassed. No personal data was collected or printed. Some records include street
names or station addresses, which are not personal data. Survey123 and accident layers were seen but not queried.

Samples (non-personal) are in `scratchpad/samples/`. Files from this report:
`meteo_ad_*`, `meteoalarm_feeds-andorra.json`, `openmeteo_*`, `mobilitat_api_v1_cameras.json`, `meteo_ad_webcam_map.csv`,
`aire_ad_*`, `feda_*`, `sig_estacions_rius.geojson`, `eaws_*`.

Status legend: **READY** = public and machine-readable, with a clear licence or clearly intended for reuse ·
**POSSIBLE** = works technically but has licence or CORS caveats · **NEEDS REVIEW** = undocumented or internal web
endpoint, or licence unclear: ask the owner before production use · **NOT USABLE** = needs a key or contract, or is blocked.

---

## 1. Weather

### 1.1 SMN Andorra — meteo.ad (Govern d'Andorra, Ministeri d'Economia)

Stack: ASP.NET MVC 4 behind CloudFront and nginx. The site has no public open-data API. The `/json` page ("Serveis › Json")
is a **request form**: the website, contact, email, phone, a **fixed IP** and a reason are required. Through it, SMN gives
"la previsió meteorològica codificada amb el mètode JSon". This is the **official route** to the forecast as JSON.

**a) Current observations, internal AJAX (public, no auth)**

```
curl -H "X-Requested-With: XMLHttpRequest" \
 "https://www.meteo.ad/home/DadesActuals?idioma=0&pestanya=0&privat=false"
→ HTTP/2 200, application/json, 9.7 kB, cache-control: private,no-cache; NO Access-Control-Allow-Origin
```

- Found in `/Content/js/mapa.js` (`get_actual()`).
- Response shape: an array of arrays,
  `[codi, htmlInfo("(1876m)<br>06/10/2026 … 08:24 (UTC)"), nom, "left:491px; top:254px;", valor("9.7ºC"), "/home/grafica?...", "True"]`.
- Values are strings with units, and the timestamp sits inside HTML. Positions are **pixels on the site's map image**, not lat/lon.
- `pestanya` codes from the home page selector:
  - 0 temp, 1 min/max, 2 precip, 3 precip 24h, 4 wind ("147º | 0.6m/s"), 5 max wind, 6 RH
  - 7 sunshine, 8 radiation 24h, 9 pressure, 12 MSL pressure, 10 snow depth, 13 soil temp, 14 dew point
- Daily variants take `&data=YYYY-MM-DD&esDiaries=true`.
- Observed counts: temp 29 stations, precip 17, wind 18, RH 28, pressure 8, snow depth 1 (October).
- Data timestamp 08:24 UTC at request time 08:33 UTC. Update looks like ~10 min (UNVERIFIED cadence).

**b) Station metadata with coordinates**

- Pages: `https://www.meteo.ad/estacions/{codi}`, for example `/estacions/99130001`.
- Each page gives "Coordenades 535636 m, 24276 m / 42,5156 º, 1,5536 º", altitude, variables and measurement period.
- Scraped for 37 stations into `samples/meteo_ad_stations.csv`: code, name, lat, lon, alt, variables.
- Station types:
  - SAIH: 39, 40, 41, 403
  - NIMET snow observers: 7993–7998
  - Automatic stations: 9913xxxx, 90000100, 90000200
- Join to (a) on `codi`.
- Also published by Govern as ArcGIS hosted layer `Hosted/Estacions_meteorològiques_Andorra/FeatureServer/0`. It has 33
  points and fields `nom, codi, servei, altitud, variables_mesurades, x, y, dades`. Tested with `f=geojson&outSR=4326`:
  200, `Access-Control-Allow-Origin: *`. Some codes in that layer have typos, e.g. `9913004` for Ransol.

**c) Forecast** (`/previsio`): HTML only. It has 3-day text, min/max for Andorra la Vella, 1500 m and Pas de la Casa,
wind icons and the freezing level. Use the JSON form for structured access. Official embeddable widgets ("Ginys"):

- Page: `https://www.meteo.ad/ginys`
- Example widget: `https://www.meteo.ad/ginys/widget?widget=2927b464…`
- Scripts: `https://www.meteo.ad/content/js/ginys/giny1..10.js`, e.g. `giny10.js?estacio=99130005`
- Headers: HTTP 200 with **no X-Frame-Options or CSP** → embeddable as an iframe. Mobilitat.ad already embeds giny1.

**d) Warnings / Avisos** (`/Alertes`)

- HTML table with "Elaborat el 06/10/2026 a les 09:39" and zones **nord / centre / sud** in 3-hour slots over 3 days.
- Levels are shown as coloured cells and images, so only scraping would work. → Prefer **Meteoalarm** (1.3), which carries
  the same SMN warnings as CAP with polygons.

**e) Radar / satellite** (`/radar`, `/sat`) are iframes of an ArcGIS Experience Builder app:

- Radar: `https://sig.govern.ad/meteopublic/?datasource=ESTPRECIP`
- Satellite: `?datasource=MTG_TG`
- Widget config `cdn/11/config.json` → custom widget `widgets/rainfall-radar/`. Its code shows:
  - **ESTPRECIP = RainViewer tiles** (`https://tilecache.rainviewer.com/{path}/256/{z}/{x}/{y}/7/1_0.png`), not SMN radar.
  - **MTG_TG = WMS proxy** `https://sig.govern.ad/meteoradarproxy/api/GeoCoding/GetCapabilities`, which wraps EUMETSAT
    MTG `rgb_geocolour`. Capabilities return 200, CORS `*`, but the advertised time extent ends at **2025-02-11T10:20Z**,
    which looks stale.
  - MSG_RGB = `https://view.eumetsat.int/geoserver/mumi/wideareacoverage_rgb_airmass/wms` directly.
- Framing headers on sig.govern.ad:
  `X-Frame-Options: SAMEORIGIN` plus `ALLOW-FROM www.meteo.ad…`, and
  `CSP frame-ancestors 'self' www.meteo.ad *.estadistica.ad www.govern.ad …`.
  → **This app cannot be iframed from our domain.** Use RainViewer or EUMETSAT directly.

**f) Avalanche bulletin (BPA)** (`/estatneu`)

- HTML: "Butlletí del perill d'allaus … Elaborat el 16/07/2026 13:56, vàlid fins el 01/12/2026" (off-season).
- Zones nord / centre / sud, with danger icons `/Images/ico-neu/ico_perill/{0-5}.png`.
- PDF: `https://www.meteo.ad/uploads/neu/estatNeu{N}.pdf` (N=1675 → 200, application/pdf, 440 kB, Last-Modified 2026-07-16).
- Machine-readable alternative: **EAWS** (see 2.2).

**g) Other on meteo.ad:** meteograms, climatology bulletins (PDF), the observers network and a gallery of user photos.
Skip the gallery and observer pages, because they hold user-submitted content and names.

**Licence:** `/legal` gives no reuse licence. It is a generic legal notice ("web de titularitat del Govern d'Andorra") plus
a privacy policy. → **NEEDS REVIEW**: ask SMN (form at `/json` or `/contacte`). Credit "Font: Servei Meteorològic Nacional
d'Andorra" in any case.

Status:
- DadesActuals: **NEEDS REVIEW**. Works now, but it is an undocumented internal endpoint and has no CORS, so it needs a server proxy.
- Station metadata: **READY** via the Govern ArcGIS layer, or scraped once.
- Official JSON forecast: **POSSIBLE**, after the access request.
- Widgets: **READY** for iframe use.

### 1.2 FEDA weather stations (bonus, under Energy)
`GetLastMeteo` gives 3 FEDA stations (Encamp, Engolasters, Ransol) with temp, RH, rain and dew point every 10 minutes, as JSON
with CORS `*`. See section 5.

### 1.3 Meteoalarm — Andorra feed EXISTS

```
curl https://feeds.meteoalarm.org/api/v1/warnings/feeds-andorra      → 200 application/json 44.3 kB
curl https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-andorra → 200 application/atom+xml
curl https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-rss-andorra  → 200 rss+xml
```

- JSON: `warnings[].alert` is CAP 1.2: `identifier, sender, sent, status, msgType, info[]`.
  - `info[]` carries 4 languages: ca-ES, es-ES, fr-FR, en-GB.
  - Fields: `event, severity, onset, expires, headline, description, instruction, parameter[]`.
  - `parameter[]` uses the awareness_level "2; yellow; Moderate" and the awareness_type "3; Thunderstorm" / "10; Rain".
  - **`area[].polygon`** holds lat,lon polygons for **Zona nord / centre / sud**.
- Observed: 6 warnings (yellow thunderstorm on 2026-10-01; yellow rain from 2026-10-03 15:00 to 2026-10-04 18:00).
  These were already expired, so the client must filter on `expires`. The Atom feed was empty (updated 08:35:40Z), i.e. no active warnings.
- Atom `<rights>`: "Licensed under terms equivalent to CC BY 4.0, with additional requirements for redistributing outlined
  in our Terms and Conditions."
- CORS: **no ACAO header** → poll from the backend. Polling every 5–10 min is enough.
- Status: **READY** (backend). Best source for warnings, and it includes the zone polygons for Cesium.

### 1.4 Open-Meteo (fallback / gridded)

```
curl "https://api.open-meteo.com/v1/forecast?latitude=42.5063&longitude=1.5218&current=temperature_2m,relative_humidity_2m,precipitation,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=snow_depth,freezing_level_height&forecast_days=1&timezone=Europe%2FAndorra"
→ 200, access-control-allow-origin: *, elevation 1025, current.time 2026-10-06T10:30 (15-min interval), temp 15.9
```

- Multi-location works with comma lists:
  `latitude=42.5063,42.5428,42.6315,42.5399&longitude=…&elevation=1023,2152,2059,2120&models=meteofrance_seamless`
  → a JSON array with one object per point. Pass `elevation` to get a lapse-rate correction in mountains.
- Air quality API: `https://air-quality-api.open-meteo.com/v1/air-quality?...&current=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone` → 200.
- Flood API: `flood-api.open-meteo.com/v1/flood?...daily=river_discharge` → 200, but the GloFAS ~5 km grid gives 0.03–0.07 m³/s
  at Andorra points, which is meaningless for small Pyrenean rivers.
- Terms (open-meteo.com/en/terms): free API only for **non-commercial** use, < 10,000 calls/day, 5,000/hour, 600/minute.
  Data **CC BY 4.0**, so attribution is required. Commercial use needs the paid plan (customer-api).
- Status: **READY** (non-commercial). Cache server-side: one multi-point call every 15 minutes is enough.

### 1.5 Neighbour agencies (noted only)

| Agency | Test | Result | Notes |
|---|---|---|---|
| AEMET OpenData | `opendata.aemet.es/opendata/api/observacion/convencional/todas` | `{"message":"Forbidden"}` | Free API key needed (email registration). Nearest stations are in the La Seu d'Urgell area. |
| Meteocat XEMA | `api.meteo.cat/xema/v1/estacions/metadades` | 403 | Free API key needed (request form). Dense XEMA network in Alt Urgell and Cerdanya. |
| Météo-France | not tested | — | portail-api.meteofrance.fr needs registration and a token (UNVERIFIED this session). Nearby: Ariège / Pyrénées-Orientales (e.g. Porté-Puymorens). |
| RainViewer | `api.rainviewer.com/public/weather-maps.json` | 200, CORS `*` | 13 past frames, latest `/v2/radar/b4b95b87db92` (time 1791275400). Tile `…/256/7/64/47/2/1_1.png` → 200 PNG. Terms: "free for personal, educational, and small-scale community use … not intended for high-volume commercial applications". Attribution "Weather data by RainViewer" + link. No key. **POSSIBLE** (licence limits commercial use). |

---

## 2. Snow / mountains

### 2.1 Ski resorts (Grandvalira Resorts: Grandvalira, Pal Arinsal, Ordino Arcalís)

- Sites are Drupal: `www.grandvalira.com/ca/estacio/estat-de-pistes`, `palarinsal.com`, `ordinoarcalis.com`.
- The status page is **server-rendered HTML**: "Temperatures Mín. 6 ºC Màx. 27 ºC · Gruixos de neu Mín. 0 cm Màx. 0 cm ·
  Km esquiables 0 / 215 · Aparcaments 15 / 15 · Enllaços 0/14", plus lift states (Obert / Tancat / Previsió d'obertura…).
- `drupalSettings` holds no data payload (only `seasonality: "winter"`). No public JSON was found.
- The interactive 2D map (`grandvalira.2dmap.grandvaliraresorts.com`, Angular + Mapbox) calls
  `https://grandvalira-resortsws.grandvaliraresorts.com/api/v1`. This is a **private backend API**, not tested and not to be used.
- Headers: `X-Frame-Options: SAMEORIGIN`, cache 60 s. Content is copyright Grandvalira Resorts.
- Status: **NEEDS REVIEW** (scraping HTML only; ask Grandvalira Resorts for a data feed or partnership). Off-season now
  (0 km open), so the winter structure could not be fully validated.
- Ski Andorra (`skiandorra.ad`) is WordPress, with `wp-json` for posts/pages only. No snow data endpoint was found.

### 2.2 Avalanche danger — EAWS (recommended)

```
curl https://regions.avalanches.org/micro-regions/AD_micro-regions.geojson.json → 200, FeatureCollection, 3 polygons: AD-01, AD-02, AD-03
curl https://static.avalanche.report/eaws_bulletins/2026-01-15/2026-01-15.ratings.json → 200, ACAO *, Last-Modified 2026-01-16
   maxDangerRatings: "AD-01": 3, "AD-01:high:am": 3, … "AD-03:pm": 3
curl https://static.avalanche.report/eaws_bulletins/2026-10-06/2026-10-06.ratings.json → 200
```

- SMN Andorra publishes to EAWS. The daily aggregated ratings file has keys for AD-01…AD-03, split by elevation and am/pm.
- Region polygons (`samples/eaws_AD_micro-regions.geojson`) can be draped on the Cesium terrain.
- Licence: EAWS region data is open (CC BY 4.0 in the eaws-regions repo; UNVERIFIED for the ratings file). Attribution goes
  to SMN Andorra / EAWS.
- Status: **READY** (CORS `*`). Seasonal: Dec–Apr/May.
- Fallback: meteo.ad `/estatneu` HTML and PDF (NEEDS REVIEW).

### 2.3 Snow depth
- meteo.ad `pestanya=10` gives snow depth from automatic stations (only 1 reporting in October).
  NIMET observer stations 7993–7998 are seasonal.
- Mobilitat API `nevades`, `nevadesactive` (road snow episodes) and `llevaneus` (snowplough positions) all returned empty in
  October (`[]` / `false`). Only field shape was checked.
- Open-Meteo `hourly=snow_depth` is model data (fallback).

### 2.4 Govern static snow/avalanche GIS (ArcGIS REST, public, CORS `*`)
- `https://sig.govern.ad/server/rest/services/IDE/Allaus_PPRA/MapServer`: avalanche hazard zoning, © Govern d'Andorra.
- `IDE/Allaus_Cadastre/MapServer` and `IDE/Allaus_Zona_reglament/MapServer` are static layers.
- `Hosted/pals_neu_ERHIN_2020/FeatureServer` (snow stakes) is listed but not queried.
- Status: **POSSIBLE**. Static context layers; licence follows the Govern IDE terms (NEEDS REVIEW).

---

## 3. Webcams

### 3.1 Mobilitat Andorra (Govern) — best candidate

- List API, used by the public site: `https://app.mobilitat.ad/api/v1/cameras` → 200 JSON, Cloudflare, `cache-control: max-age=120`.
  - **No ACAO header**. OPTIONS returns 204 without ACAO, so the list must go through a backend proxy.
  - `{"success":…, "result":[69 items]}` with fields `id, title, lat, lng, url_gif, category_id, category_order, camera_order, icon`.
  - Sample: `samples/mobilitat_api_v1_cameras.json`.
- Image pattern: `https://imgs.mobilitat.ad/prod/{Name}.gif` (e.g. Canillo, PasCasa, Soldeu, Arcalis, Grau, Envalira-area cams).
  - 200 image/gif, **animated GIF 470×320, ~25 frames (timelapse), ~1.27 MB**.
  - Headers: `cache-control: max-age=120`, ETag, Last-Modified. **No ACAO**, no X-Frame-Options.
  - It loads in an `<img>`. It cannot be used as a WebGL/Cesium texture without a proxy, because there is no CORS.
- Refresh measured with Last-Modified: Canillo 08:35:06 → 08:45:05 (**~10 min**); PasCasa 08:35:29 → 08:40:30 (**~5 min**).
- The site also offers `/totes-les-cameres`. Other API endpoints exist (`incidents/ca`, `points/ca`, `campaigns`, `extraordinaris`).
  `localitzaciociclistes` was deliberately not queried.
- Licence: none stated. → **NEEDS REVIEW** (ask Mobilitat for permission to hotlink or proxy). The resolution is too low to
  identify plates or people, but if you cache frames, do not store them long-term.
- Status: **POSSIBLE / NEEDS REVIEW**. This is the main live-image source, with ~50 road cams that carry coordinates.

### 3.2 meteo.ad webcam map (aggregator)
- `https://www.meteo.ad/webcam/mapawebcams` is a Leaflet map with 66 markers. Parsed into `samples/meteo_ad_webcam_map.csv`
  (lat, lon, label, url).
- Sources:

| Source | Count | URL / pattern | Test result | Status |
|---|---|---|---|---|
| Mobilitat GIFs | 50 | imgs.mobilitat.ad | see 3.1 | see 3.1 |
| feratel webTV (ski resort cams) | 10 | `https://webtv.feratel.com/webtv/?design=v5&cam=150xx&lg=ca` | Cam IDs: 15030/15031 Arcalís, 15035, 15040, 15045 El Tarter, 15050 Grau Roig, 15055 Pas de la Casa, 15056, 15060 Soldeu-Espiolets, 15061, 15065 Canillo, 15085/15086 Pal, 15090 Encamp, 76100. curl GET → **404** (with or without a meteo.ad Referer); it probably serves only real browsers or referrers. Not circumvented. | **UNVERIFIED**, embed-only via official feratel player, licence by feratel/Grandvalira. NEEDS REVIEW |
| Naturland | 2 | `https://web.naturland.ad/cams/cam11.mp4`, `cam22.mp4` | 200 video/mp4, Last-Modified 08:32Z (~5 min loop clip); `X-Frame-Options: SAMEORIGIN`, CSP frame-ancestors 'self'; no ACAO | **NEEDS REVIEW** (private company) |
| Projecte 4 Estacions | 3 (Canillo-Els Plans, La Massana-Pic del Cubil, La Cortinada) | via `app.projecte4estacions.com/js/load-p4e-cam.js` (Clappr HLS player) | Snapshot `…/snapshots/canillo-data.jpg` is stale (Last-Modified 2025-08-13) | **NEEDS REVIEW**, embed their player |
| vision-environnement | 1 (Andorra la Vella) | `s1.vision-environnement.com/live/modules/timelapse/capture/andorelavieille.jpg` | 200, **stale** (Last-Modified 2026-07-25) | **NOT USABLE** now |

- Ski resort webcam pages (`/ca/estacio/webcams` on all 3 sites) only embed the feratel iframes above. Their CSP allows frame-src
  `webtv.feratel.com`.

### 3.3 Third party
- **Windy Webcams API v3**: `api.windy.com/webcams/api/v3/webcams?nearby=42.5,1.55,30` → 403 "Missing Header 'x-windy-api-key'".
  Docs: image URL tokens expire after **10 min on free tier** (24 h on pro), so the list must be re-fetched per page load.
  Free key on registration; check the terms page for attribution and resolution limits (UNVERIFIED). **POSSIBLE** (key needed).
- **Roundshot / Skaping**: no Andorra installation found by web search. **UNVERIFIED / none found**.
- Aggregators (onthesnow, weski, julian-alps) re-embed feratel. Not usable as sources.

---

## 4. Environment

### 4.1 Air quality — aire.ad (Govern, Dept. Medi Ambient i Sostenibilitat)

- Angular SPA. Its bundle `main.bd3678d4….js` calls `https://aire.ad/api` (`/assets/config/config.json` also lists a raw IP;
  ignore it). These are internal endpoints of a public site, with no auth:

```
curl -H "lang: ca-ES" https://aire.ad/api/web/mapData        → 200 JSON (204 empty if lang header missing/other value)
  [{"stationID":"AD0942A","date":"Dimarts 06/10/2026 a les 10h","aqi":1.745,"aqiBand":"Excel·lent","aqiColor":"#46EDE3","webName":"Escaldes-Engordany","x":34.49,"y":64.35}, …4 stations]
curl -X POST -d '' -H "lang: ca-ES" https://aire.ad/api/web/stations → 200, 7 stations with stationId, name, type (Fons urbà/Trànsit…), parroquia, ubicacio, lat, long, altitude
curl -X POST -d '' -H "lang: ca-ES" -H "stationID: AD0942A" https://aire.ad/api/web/latestData
  → [{"pollutant":"NO<sub>2</sub>","concentration":"29 µg/m3","index":"1","band":"Excel·lent","period":"Mitjana horària","date":"10/6/2026 10:00:00 AM"}, PM10, PM2.5, O3 …]
curl https://aire.ad/api/web/timeseries → 23 series (SO2, NO2, NOx, CO, NO, PM10, PM2.5, O3), toTime 2026-10-06T09:00+02:00 (hourly)
```

- Stations:
  - AD0940A Mòbil 1 (Av. Tarragona, AVella)
  - AD0942A Escaldes-Engordany
  - AD0943A Mòbil 3 (traffic)
  - AD0944A Engolasters
  - AD0946A Pic del Maià (O3, since 2026-05)
  - Mòbil 2 and Sud Ràdio are historical.
- Other endpoints in the bundle: `/web/plotData, allPlotData, stationAQIData, globalAQIData, activeAlerts, pollenWeekly,
  pollenPlotData, calendarData, utils`.
- CORS: reflects the request Origin with `Access-Control-Allow-Credentials: true`, so it works from a browser.
- Hourly updates. Values are HTML-encoded strings, so they need parsing.
- Licence: none stated. Govern ArcGIS folder `Qualitat_Aire` → `Token Required`.
- Status: **NEEDS REVIEW** (undocumented internal API; ask the Departament de Medi Ambient). It works technically.

**EEA fallback (official, open):**

```
curl -X POST https://eeadmz1-downloads-api-appservice.azurewebsites.net/ParquetFile/urls \
  -d '{"countries":["AD"],"pollutants":["NO2"],"dataset":1,"source":"Api","dateTimeStart":"2026-10-01T00:00:00Z","dateTimeEnd":"2026-10-06T00:00:00Z","aggregationType":"hour"}'
→ https://eeadmz1batchservice02.blob.core.windows.net/airquality-p/AD/SPO-AD0942A-0008.parquet (200, 350 kB, Last-Modified 2026-10-06 08:32Z)
```

- Same station and series IDs as aire.ad (`SPO-AD0942A-0008`). These are E2a up-to-date unverified data.
- Licence: EEA reuse with attribution (CC BY 4.0, UNVERIFIED for this API).
- Format is Parquet, so it needs backend processing. Updated at least daily, and here hourly.
- Status: **READY** (backend, near-real-time with ~1–2 h lag).

- OpenAQ v3: `api.openaq.org/v3/locations?iso=AD` → **401** "A valid API key must be provided". A free key exists.
  It most likely mirrors the EEA AD stations (UNVERIFIED). **POSSIBLE**.
- Open-Meteo air quality (CAMS model): see 1.4. **READY** (model, not measured).

### 4.2 Hydrology / rivers
- `Hosted/Estacions_Rius/FeatureServer/0` on sig.govern.ad: **10 river-station points**, metadata only.
  - Fields: `estació, coord_x, coord_y, adreça, altitud, parròquia`.
  - Examples: Pont de la Bartra (Encamp), Pont de Prada Casadet (AVella), Pont CG6 Bixessarri.
  - Sample: `samples/sig_estacions_rius.geojson`. CORS `*`.
- **No live level or flow feed was found.** The Govern ArcGIS folder `Aigua` returns Token Required. Per AR+I reports, most
  gauges belong to Protecció Civil, for flood alerting. Live data: **UNVERIFIED / not public**.
- Downstream: SAIH Ebro (CHE) real-time gauge maps at `https://www.saihebro.com/tiempo-real/...`, including Valira at
  La Seu d'Urgell (A022, per AR+I report). HTML; not tested further. **NEEDS REVIEW**.
- FEDA `GetDailyDesguas?type=json&dia=YYYY-MM-DD` gives hourly **spill (desguàs) from the FEDA hydro scheme**
  (`data, dataPublicacio, desguas`). JSON, CORS `*`. See 5.
- `IDE/Hidrografia/MapServer` returned a 500 server error during testing. `Hydrografia/Torrents/MapServer` is public (static).

### 4.3 Noise
- `IDE/Cadastre_Sonor/MapServer`: noise cadastre 2003, 2008–2010 and 2017–2018 (measurement points and sensitivity zones).
  Static and public. Folder `Soroll` → Token Required.
- No real-time noise sensors found. **POSSIBLE** as a static layer only.

### 4.4 Other Govern GIS layers (public, CORS `*`)
- `Hosted/Llamps/FeatureServer`: 307 lightning points plus ellipses. Historical (`data_llamp` 2024-07-25), not live.
- `IDE/Climatologia/MapServer`: annual climate grids 2006–2010 (static).
- `Hosted/Georisc_Andorra`, `IDE/Perillositat_geologica`: geohazard context.
- The ArcGIS REST root `https://sig.govern.ad/server/rest/services?f=json` lists folders openly.
  - Token-protected: `Qualitat_Aire, Energia, Aigua, Soroll, TURISME, Refugis, RiscosGeo, Públics`. Not attempted.
  - `ARI_INCENDIS/Butlleti_Incendis_Avui|Dema` are only "Export Web Map" print GP services.
  - `incendis.ad` shows a default IIS page.

### 4.5 AR+I (Andorra Recerca + Innovació)
- `ari.ad` has research projects (permafrost, seismicity, flow observation reports, the CRES barometer) and PDF reports.
  No live sensor feed or API was found. **UNVERIFIED / NOT USABLE** for real time.

---

## 5. Energy — FEDA (Forces Elèctriques d'Andorra)

- The public pages `https://www.feda.ad/energia-i-meteo/energia/actual`, `/energia/desguas`, `/meteo/dades-reals` and
  `/energia/historic` load their data from a JSONP/JSON web service. It is defined in
  `++resource++plonetheme.feda.javascripts/webservice.js` (`ws_url = 'https://www.feda.ad/oficina-virtual/api/'`):

```
curl "https://www.feda.ad/oficina-virtual/api/GetLastEnergy?format=json"  → 200 application/json, access-control-allow-origin: *
  ids: 10 Total Consum Andorra · 11 Importació Espanya · 12 Importació França · 13 Total Producció Andorra ·
       20/21 Exportació ES/FR · 30 Producció Central Hidroelèctrica · 31 Producció Forn Incinerador · 32 Cogeneració Soldeu
  fields: id, descripcio, consum (MWh), data, lastEnergyBeanCsv
  observed: data 2026-10-05, consum 37.53 (looks like a partial day; daily totals in GetEnergyHistory are ~1,300 MWh)
curl ".../GetEnergyHistory?from=2026-09-01&to=2026-10-05&id=10&format=json" → 200; daily MWh (e.g. 2026-09-01: 1293.85). Also &csv=csv
curl ".../GetMaxEnergyHistory?format=json" → {"maxConsum":2572.25,"data":"2024-01-09"}
curl ".../GetEnergyGraph?format=json"      → 200 (same series for the chart)
curl ".../GetLastMeteo?format=json"        → 3 FEDA stations, 10-min (2026-10-06T09:10Z), temperatura, humitat, pluja, temperaturaRosada
curl ".../GetDailyDesguas?type=json&dia=2026-10-05" → hourly spill values
curl ".../GetGeneralWarningOutage?format=json" → 5 planned outages: zona, horaInit/horaFinal, numInstAfectades, zonaAdrecesList (street lists). Address lists hold no personal data, but show only the zone.
Also: GetMeteoForecast?, GetMeteoHistory? (params), GetConsellUs
```

- Granularity: **daily** energy balance (D-1), 10-min weather. Not real-time generation.
- Licence: none stated. FEDA is a public company. → **NEEDS REVIEW**. The endpoints are undocumented, but CORS is `*`, so they
  are clearly meant for browser consumption.
- Hydro plants and substations:
  - `IDE/FEDA/MapServer` (Govern): "Cobertura FEDA" and the distribution network 2010–2018 (static).
  - Folder `Energia` → Token Required.
  - OSM via Overpass: 8 `power=substation`, 4 plants or hydro generators (ODbL).
- EV chargers: FEDA states ~280 points but publishes no open feed. Locations are shown via chargepulse.com and electromaps.com
  (commercial apps, NOT USABLE). OSM has only 11 `amenity=charging_station` in Andorra, which is poor coverage.
  **NOT USABLE / POSSIBLE via OSM** (incomplete).

---

## 6. Recommended integration (Phase 1)

1. **Backend poller/proxy** (sources without CORS need it): Meteoalarm, meteo.ad DadesActuals (if approved), Mobilitat camera
   list and GIFs, EEA parquet.
2. **Direct from browser** (CORS `*`): Open-Meteo, RainViewer, EAWS, sig.govern.ad FeatureServer layers, FEDA web service, aire.ad.
3. **Layers for Cesium:**
   - Station points (meteo.ad metadata) coloured by temperature.
   - Meteoalarm zone polygons.
   - EAWS AD-01..03 polygons.
   - RainViewer radar imagery layer (z ≤ 7).
   - Webcam billboards (Mobilitat lat/lng) → popup with the GIF.
   - Air quality points (aire.ad stations lat/long).
4. **Permission emails to send:** SMN (meteo.ad JSON form), Mobilitat (camera reuse), Medi Ambient (aire.ad),
   FEDA (web service), Grandvalira Resorts (piste status and feratel embeds).
