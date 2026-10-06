# Andorra View — Project status

Snapshot as of **2026-10-06**. Update this file whenever the state below changes.

## Live

| What | Where | Deployed by |
|---|---|---|
| Web app | https://jordiordonez.github.io/andorra-view/ | GitHub Actions → GitHub Pages on every push to `main` |
| API proxy (Cloudflare Worker) | https://andorra-view-api.andorra-view.workers.dev (`/api/status`) | GitHub Actions → `wrangler deploy` on every push to `main` |
| Repository | https://github.com/jordiordonez/andorra-view (public, MIT for code only) | — |

Repository configuration:
* Variables: `VITE_API_BASE` (Worker URL), `VITE_HIDDEN_LAYERS=aircraft`
* Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
* Pages source: GitHub Actions

Running cost: **$0** (GitHub Pages + Actions free for public repos; Cloudflare Workers free plan, 100k requests/day).
See [COSTS.md](COSTS.md).

Tested: desktop Chrome, Chrome at 390×844, **Safari on a real iPhone (OK)**. Desktop Safari not yet tested.

## Layers on the public site

| Layer | Source | State |
|---|---|---|
| Traffic incidents | Mobilitat Andorra | ✅ live (unofficial: permission pending) |
| Road cameras (69, animated GIF) | Mobilitat Andorra | ✅ live (unofficial) |
| Parking (Andorra la Vella occupancy + Mobilitat capacity) | Comú d'Andorra la Vella, Mobilitat | ✅ live (unofficial; ALV update frequency unknown) |
| EV chargers | Mobilitat | ✅ static list (off by default) |
| National bus lines and stops | Govern SIG 2025 | ✅ static, links to moute.ad for live times |
| Roads | Govern SIG | ✅ static |
| Weather stations (~30) | meteo.ad (SMN) | ✅ live (unofficial) |
| Weather warnings | Meteoalarm | ✅ live (usually empty) |
| Avalanche danger | EAWS | ✅ works; empty off-season (≈ Dec–May only) |
| Air quality | aire.ad | ✅ live (unofficial; off by default) |
| Energy card | FEDA | ✅ daily (unofficial) |
| Fire hotspots (150 km) | NASA FIRMS | ✅ live |
| Earthquakes (150 km) | EMSC | ✅ live |
| Satellites | CelesTrak + SGP4 in browser | ✅ (off by default) |
| Borders, parishes, places, POIs | Govern SIG, OpenStreetMap | ✅ static |
| **Aircraft** | adsb.lol / OpenSky | ⛔ **hidden on the public site** — the free ADS-B APIs refuse Cloudflare IPs (adsb.lol 429, OpenSky timeout, adsb.fi 403). Works locally with `npm run dev`. Code intact; re-enable by deleting the `VITE_HIDDEN_LAYERS` variable. |

## Known gaps

* **Live buses:** data exists (FEDA's Mou-te on HAFAS; Escaldes EE Bus on Ride Pingo) but only behind keyed/app-only
  backends; no public GTFS / GTFS-RT. Not integrated by design. Details: [research/05-bus-ridepingo-moutebe.md](research/05-bus-ridepingo-moutebe.md).
* **Traffic flow / congestion:** no public source (Mobilitat only publishes incidents and cameras).
* **Ski resorts** (pistes, lifts, snow depth): HTML only, no feed.
* **Live parking** only for 13 Andorra la Vella car parks.

## Pending (owner's side, no deadline)

1. Permission requests for the unofficial sources (Àrea de Cartografia, Mobilitat, SMN, Medi Ambient, FEDA, Comú d'Andorra
   la Vella). List and suggested asks: [LICENSES_AND_ATTRIBUTIONS.md](LICENSES_AND_ATTRIBUTIONS.md).
2. Optional: ask FEDA Solucions / Mobilitat for GTFS + GTFS-RT, and the Comú d'Escaldes / The Routing Company for the EE Bus.
3. Private report of the ArcGIS services that accept anonymous edits (notes kept locally in `private/`, not in git).
4. Aircraft on the public site: adsb.lol API key, or a proxy on a non-cloud network.

## Possible next steps

* Phase 4 polish: desktop Safari check, label decluttering/clustering at mid zoom, Open-Meteo forecast in station details,
  satellite ground tracks.
* Phase 5: AI assistant on top of `AppTools` (`src/app/tools.ts`), with the LLM key kept server-side in the Worker.
* Theoretical (timetable-based, labelled "estimated") bus positions if no live feed is granted.

## Operating notes

* Local: `npm install && npm run dev` (frontend + API in one process, no keys needed).
* Manual Worker deploy: `npx wrangler deploy` (requires `npx wrangler login`).
* Refresh static snapshots: `npm run data:static`, then commit `public/data/`.
* Headless browser tests must use real Chrome (`scripts/screenshot.mjs`): `sig.govern.ad` returns HTTP 500 to the
  `HeadlessChrome` user agent.
* Worker logs: `npx wrangler tail`. Usage: Cloudflare dashboard → Workers & Pages → `andorra-view-api` → Metrics.
