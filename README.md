# Andorra View

**A live digital window into Andorra.** A browser-based 3D view of the Principality that combines official
Andorran data with global open feeds: traffic incidents, road cameras, parking occupancy, weather stations
and warnings, avalanche danger, air quality, energy, fires, earthquakes, aircraft and satellites. All of it
sits on a 5 m terrain model and the national orthophoto.

Every value on the map comes from an identifiable source, shown with its timestamp and freshness class
(*En directe*, *Quasi temps real*, *Periòdic*, *Estàtic*). Nothing is simulated.

> Non-commercial project. Several Andorran sources publish no reuse licence. They are shown with a visible
> **"No oficial"** label while permission is requested. See [docs/LICENSES_AND_ATTRIBUTIONS.md](docs/LICENSES_AND_ATTRIBUTIONS.md).

## Features

| Area | Layers | Source | Freshness |
|---|---|---|---|
| Mobility | Traffic incidents and closures · 69 road cameras (animated timelapse) · car parks with live occupancy (Andorra la Vella) · EV chargers · national bus lines and stops · road network | Mobilitat Andorra, Comú d'Andorra la Vella, Govern d'Andorra SIG | 2 min / static |
| Weather and snow | ~30 SMN stations (temperature, precipitation, wind, humidity, snow, pressure) · Meteoalarm warnings with zone polygons · EAWS avalanche danger | meteo.ad, Meteoalarm, EAWS | 5–30 min |
| Environment | Air-quality stations (index + pollutants) · daily electricity consumption, production and imports | aire.ad, FEDA | 30–60 min |
| Emergencies | Satellite fire hotspots within 150 km · earthquakes within 150 km (incl. small Pyrenean events) | NASA FIRMS, EMSC (IGN, ReNaSS) | 2–15 min |
| Sky | Aircraft within ~110 km (ADS-B) · bright satellites above Andorra (SGP4 in the browser) | adsb.lol (OpenSky fallback), CelesTrak | 10 s / 1 s |
| Context | Border, parishes, towns, peaks, hospitals, border posts | Govern d'Andorra, OpenStreetMap | static |

Also included:
- Click any element to see its details, source, licence and observation time.
- Accent-insensitive search over places and live entities (e.g. "Pas de la Casa", "CG-2", "hospital", a flight callsign).
- Camera presets for each parish, the borders, and themed views (Mobility, Weather, Snow, Emergencies).
- A source-health panel.
- Mobile layout with a layers drawer and a bottom sheet.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 — frontend + API proxy in one process
```

No API keys are needed. The dev server mounts the same API handler that runs in production
(`server/router.ts`), so every feed works locally.

```bash
npm test           # unit tests (adapters, parsing, bbox filtering, freshness, terrain decoding)
LIVE=1 npm test    # also hit the real upstream APIs
npm run build      # typecheck + production build into dist/
npm run preview    # serve dist/ with the API proxy
npm run data:static  # refresh the static snapshots in public/data/
```

## Configuration

Copy `.env.example` to `.env`. Every variable is optional.

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_BASE` | browser | URL of the API Worker when the frontend is hosted elsewhere (GitHub Pages) |
| `VITE_HIDDEN_LAYERS` | browser | Comma-separated layer ids not shown in this build (public site: `aircraft`) |
| `VITE_CESIUM_ION_TOKEN` | browser | Use Cesium World Terrain instead of the built-in composite terrain |
| `VITE_GOOGLE_MAPS_API_KEY` | browser | Enables the "Fotorealista 3D" toggle (Google Photorealistic 3D Tiles; billed beyond 1,000 sessions/month) |
| `FIRMS_MAP_KEY` | server | NASA FIRMS area API (otherwise the keyless 24 h Europe files are used) |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | server | Higher OpenSky quota for the aircraft fallback |
| `CONTACT` | server | Contact string added to the upstream User-Agent |

`VITE_*` values end up in the browser bundle. Restrict those keys by HTTP referrer. Server values go in
`.env` (dev) or Worker secrets (`npx wrangler secret put NAME`).

## Architecture

```
Browser (Vite + TypeScript + CesiumJS, no framework)
  LayerManager → Layer (one per dataset) → Cesium CustomDataSource
       ▲ normalized GeoEntity / FeedResponse
  /api/feeds/:id ── Cloudflare Worker (router · cache · last-known-good · rate limit · health)
                         └─ feeds/* → providers/* adapters → upstream APIs
```

Provider formats stop at the adapters (`src/providers/`). Layers and UI only see the normalized model.
The source registry (`src/config/dataSources.ts`) drives attribution, licence and freshness labels. All
coordinates live in `src/config/geo.ts`. `window.andorraView.tools` exposes the provider-independent tool API
prepared for a future AI assistant.

Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deployment

**Frontend → GitHub Pages.** The workflow `.github/workflows/deploy.yml` runs typecheck, tests and build, then publishes
`dist/` on every push to `main`. One-time setup:
1. GitHub → Settings → Pages → Source: *GitHub Actions*. Free accounts need a public repository for Pages.
2. Settings → Variables → Actions: set `VITE_API_BASE` to the Worker URL.

**API → Cloudflare Worker** (free tier: 100k requests/day):
```bash
npx wrangler login
npx wrangler deploy                 # deploys server/worker.ts as "andorra-view-api"
npx wrangler secret put FIRMS_MAP_KEY   # optional
```
Edit `ALLOWED_ORIGINS` in `wrangler.toml` to match your Pages URL. To deploy the Worker from CI, add the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

As an alternative, deploy `dist/` to Cloudflare Pages on the same domain as the Worker and leave `VITE_API_BASE` empty.

Costs: $0 up to roughly 10k monthly users. See [docs/COSTS.md](docs/COSTS.md).

## Documentation

- [docs/RESEARCH.md](docs/RESEARCH.md): Phase 0 findings (God's Eye View analysis, Andorran and global sources, basemaps, hosting)
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md): inventory of every source found, tested and classified
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): design, data flow, resilience, security, AI readiness
- [docs/LICENSES_AND_ATTRIBUTIONS.md](docs/LICENSES_AND_ATTRIBUTIONS.md): licence status of every source
- [docs/COSTS.md](docs/COSTS.md): monthly cost estimates
- `docs/research/`: raw research evidence (commands, responses, timings)

## Known limitations

- **Buses:** live positions exist (FEDA's Mou-te app on HAFAS; Escaldes' EE Bus on Ride Pingo) but only behind keyed app backends,
  with no public GTFS/GTFS-RT. Static 2025 lines and stops are shown, with a link to moute.ad. See docs/research/05.
- **Parking:** live occupancy only exists for 13 Andorra la Vella car parks, and the source publishes no update time.
  Other car parks show capacity only.
- **Traffic:** Mobilitat publishes incidents and cameras, not flow or speed. No congestion layer is shown, rather than a simulated one.
- **Avalanche danger and snowploughs** are seasonal (about December–May). Off-season the layer stays empty, with a note.
- **Ski resorts:** piste and lift status is only published as HTML, with no open feed. Not integrated.
- **Aircraft on the public deployment:** the free ADS-B APIs refuse requests from Cloudflare's servers (adsb.lol 429,
  OpenSky timeout, adsb.fi 403, observed 2026-10-06). The aircraft layer works locally (`npm run dev`) and is hidden on
  the public site with `VITE_HIDDEN_LAYERS=aircraft` (repository variable). Fix options: an adsb.lol API key, OpenSky credentials from a non-cloud host, or a small proxy on another network.
- **Aircraft** at low altitude inside the valleys depend on volunteer ADS-B receivers.
  Positions between updates are dead-reckoned for at most 20 s, and this is labelled in the details.
- **Unofficial sources:** Mobilitat, meteo.ad, aire.ad, FEDA, Comú d'Andorra la Vella and Govern SIG publish no reuse
  licence. Undocumented endpoints may change without notice. Each layer fails independently.
- Tested in desktop Chrome, Chrome at iPhone size (390×844) and Safari on a real iPhone. Desktop Safari not yet tested.

## Licence

Code: [MIT](LICENSE). Data belongs to the respective sources and is not covered by the MIT licence. See
[docs/LICENSES_AND_ATTRIBUTIONS.md](docs/LICENSES_AND_ATTRIBUTIONS.md).

## Credits

Inspired by [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) by Bilawal Sidhu (MIT). No code
from it is included. Data credits are shown in the app and listed in
[docs/LICENSES_AND_ATTRIBUTIONS.md](docs/LICENSES_AND_ATTRIBUTIONS.md). Built with [CesiumJS](https://cesium.com/platform/cesiumjs/) (Apache-2.0).
