# Andorra View — Architecture

Status: MVP (Phase 1–4 foundations). Last updated 2026-10-06.

## 1. Decision summary

| Decision | Choice | Why |
|---|---|---|
| Relationship to God's Eye View | **Hybrid / clean reimplementation**: new lean TypeScript codebase. GEV patterns were studied, but no GEV code is copied in this version | GEV (MIT) is a 1,667-file, US-centric, single-machine app (proxies run inside the Vite server). Its value for us is its ideas (basemap fallback chain, per-layer lifecycle, server-side proxies with caching, credits registry), not its Austin/NYC data. If GEV modules are copied later (shaders, flight smoothing), its MIT notice must be kept (see LICENSES_AND_ATTRIBUTIONS.md). |
| Frontend | Vite 8 + TypeScript + CesiumJS 1.146, **no framework** | The UI is a handful of panels around a WebGL canvas. React would add re-render plumbing next to Cesium's own entity model without solving a real problem. A tiny `h()` helper is enough. |
| 3D base | Cesium globe + **composite terrain** (Govern d'Andorra 5 m DTM inside the border, Mapzen/AWS Terrarium elsewhere) + **Govern 2022 orthophoto** over **EOX Sentinel-2 cloudless** | $0, no keys, best available resolution inside Andorra. Google Photorealistic 3D and Cesium World Terrain are optional upgrades behind env keys. |
| Backend | One framework-free `(Request) → Response` handler (`server/router.ts`) deployed as a **Cloudflare Worker**; mounted as Vite middleware in dev | Needed for: no-CORS upstreams, caching to protect small Andorran servers, keeping secrets server-side, last-known-good fallback. Workers free tier = 100k req/day, no non-commercial clause, no cold starts. |
| Hosting | Static build on **GitHub Pages** (user's choice) + Worker API (`VITE_API_BASE`) | Pages can't run code; the Worker is the only server piece. Cloudflare Pages also works with zero changes (same origin → leave `VITE_API_BASE` empty). |
| Language | UI in Catalan (official language) | Primary audience. Strings are inline for now; i18n can be added when a second language is needed. |

## 2. High-level diagram

```
 Browser (GitHub Pages)                                   Cloudflare Worker  (server/worker.ts)
 ┌───────────────────────────────────────────┐            ┌─────────────────────────────────────┐
 │ UI: topbar · layer panel · details · search│  /api/*   │ router.ts: CORS · rate limit ·       │
 │      presets · status                      │──────────▶│   in-flight dedupe · cache ·         │
 │ LayerManager ── Layer (one per dataset)    │           │   last-known-good (stale) · health   │
 │   load() → FeedResponse  (normalized)      │◀──────────│ feeds/*.ts → providers/*.ts adapters │
 │   render() → Cesium CustomDataSource       │  JSON     └──────────────┬──────────────────────┘
 │ providers/*.ts adapters (direct sources)   │                         │ upstream (UA, timeout, retry)
 │ Cesium Viewer: composite terrain, imagery  │──── tiles ──▶ Govern SIG, AWS Terrarium, EOX
 └───────────────────────────────────────────┘──── direct ─▶ EMSC, EAWS, ALV parking (CORS *)
```

## 3. Data flow: provider → normalized model → layer

1. **Adapter** (`src/providers/*.ts`): pure functions that turn one upstream format into `GeoEntity[]`
   (`src/core/types.ts`). No DOM, no Node APIs, so they run in the Worker **and** in the browser, and are unit-tested
   against real fixtures (`tests/fixtures/`).
2. **Feed** (`server/feeds/*.ts`): fetches upstream, calls the adapter, returns a `FeedResponse`
   `{ source, fetchedAt, sourceUpdatedAt, stale?, warning?, entities, meta? }`. Each feed declares `ttlSeconds`
   (freshness) and `staleSeconds` (how long a last-known-good copy may be served when upstream fails).
   Sources that allow CORS and need no secret skip the proxy: the layer calls the adapter directly.
3. **Layer** (`src/layers/*.ts`, base class `src/core/layer.ts`): owns one Cesium `CustomDataSource`, its polling
   timer, loading/error state, and health reporting. `render()` diffs entities in place (`layers/sync.ts`);
   `describe()` produces the detail-panel model; `searchText()` feeds search.
4. **UI** reads only `GeoEntity`, `LayerState` and the source registry, never provider formats.

The **source registry** (`src/config/dataSources.ts`) is the machine-readable catalogue: organization, endpoint,
licence, licence status, freshness class, reliability, access mode, `permissionPending`. Every layer lists its
source ids, and the detail and status panels render attribution, licence and freshness from it.

## 4. Freshness and transparency

* Each source has a freshness class: `live`, `near-real-time`, `periodic`, `static`, `simulated` (none used).
* Each entity keeps its **source timestamp** (`timestamp`). Each response keeps the **ingestion timestamp** (`fetchedAt`)
  and the newest source timestamp (`sourceUpdatedAt`). The UI shows "fa 37 s" relative times.
* When upstream fails, the Worker serves the cached copy flagged `stale: true` + `warning`. The UI then shows a
  "Còpia antiga" tag instead of "En directe".
* Computed values say so in their label: aircraft positions between fixes are dead-reckoned for at most 20 s
  (labelled in the details panel), and satellite positions are SGP4-propagated from orbital elements.
* Sources without a published reuse licence carry a visible **"No oficial"** tag and a note (the user decided to publish them
  while permission is requested).

## 5. Resilience

| Mechanism | Where |
|---|---|
| Timeouts (6–10 s) + bounded retries (5xx/429/network only) | `server/http.ts`, `src/core/api.ts` |
| Edge cache with TTL + stale window (last-known-good) | `server/cache.ts`, `server/router.ts` |
| Concurrent miss collapsing (one upstream request per feed per isolate) | `router.ts` `inflight` |
| Primary → fallback provider (adsb.lol → OpenSky) | `server/feeds/aircraft.ts` |
| Per-layer error isolation; previous entities stay visible on error | `core/layer.ts` |
| Polling pauses while the tab is hidden; resumes on visibility | `core/layer.ts`, `core/layerManager.ts` |
| Terrain/imagery fall back to global providers if Govern SIG is down | `map/terrain.ts`, `map/basemaps.ts` |

## 6. Observability

* Client: `core/health.ts` tracks per source the last success, last error, latency, entity count, source timestamp, and stale state.
  It feeds the top-bar status pill and the **Fonts de dades i estat** panel (in-app status page).
* Server: `GET /api/status` returns per-feed counters for that Worker isolate (indicative, not global).
  For production analytics, enable Workers Logs / Analytics Engine (no code change needed for basic logs).

## 7. Performance

* `requestRenderMode` (render only on change). Animated layers request frames from a 1 Hz tick.
* Device-pixel-ratio capped at 2.
* Everything is filtered geographically: bbox/radius queries upstream when supported, filtering in adapters otherwise
  (`ANDORRA_BBOX`, `AIRSPACE_BBOX`, `RADII_KM` in `src/config/geo.ts`).
* Static layers are build-time snapshots (`npm run data:static` → `public/data/*.geojson`, about 0.5 MB total,
  simplified to about 3–4 m).
* Refresh rates follow measured source cadence: aircraft 10 s, incidents 2 min, cameras 2 min (GIFs update about every 2–10 min),
  stations 10 min, warnings 5 min, fires 15 min, satellites' elements 2 h (propagated every second locally).

## 8. Security

* No secrets in the bundle. Server-only keys (FIRMS, OpenSky) live in Worker secrets / local `.env`.
* Browser keys (`VITE_CESIUM_ION_TOKEN`, `VITE_GOOGLE_MAPS_API_KEY`) are public by design and must be **referrer-restricted**.
* The binary proxy (webcam images) only fetches URLs that belong to known camera ids. It is never an open proxy.
* API: GET only, per-IP rate limit (per isolate), CORS allow-list via `ALLOWED_ORIGINS`.
* The app only issues read requests (`GET`/`query`) to ArcGIS services, some of which also accept anonymous edits.
  We never write. The research found this misconfiguration; it should be reported privately to the owners, not published.
* No personal data is collected or displayed. Aircraft registrations are dropped in the adapter, and cyclist-tracking and accident
  endpoints are deliberately not used.

## 9. AI-agent readiness (Phase 5)

`src/app/tools.ts` defines `AppTools`: `flyTo`, `enableLayer`, `disableLayer`, `listLayers`, `searchEntities`,
`getEntities`, `getTrafficIncidents`, `getWeather`, `getParkingAvailability`, `selectEntity`. Each tool returns plain JSON
with source attribution and timestamps. An LLM integration (OpenAI Realtime, Claude tool use, …) maps its tool schema 1:1
onto these methods. Any LLM key must stay server-side (a new Worker route), and the integration is provider-independent.
The tools are exposed as `window.andorraView.tools` for debugging.

## 10. Repository layout

```
src/
  config/      geo.ts (bbox, center, presets) · dataSources.ts (registry)
  core/        types · layer · layerManager · health · api · time · details · emitter
  providers/   pure adapters: upstream format → GeoEntity
  layers/      Cesium layers (one per dataset) + context (static) layers
  map/         viewer · basemaps (imagery/3D) · terrain (composite) · icons
  ui/          topbar · layerPanel · detailPanel · search · presets · statusPanel
  app/         app wiring · tools (AI interface)
server/        router · cache · http · health · feeds/* · worker (CF entry) · vitePlugin (dev)
scripts/       fetch-static.mjs (snapshots) · screenshot.mjs (headed Chrome check)
public/data/   committed static snapshots
tests/         vitest + real fixtures
docs/          RESEARCH · DATA_SOURCES · ARCHITECTURE · LICENSES_AND_ATTRIBUTIONS · COSTS · research/ (raw evidence)
```
