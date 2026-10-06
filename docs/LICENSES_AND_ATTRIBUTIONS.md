# Licences and attributions

Andorra View is a **non-commercial** project (decision 2026-10-06). Several sources below are only usable on that basis.
If the project ever becomes commercial (ads, sales, paid services, a company with revenue), re-check every row marked NC.

**Publicly accessible does not mean free to redistribute.** Each source is classified as:

* **OPEN DATA**: explicit open licence (CC BY, ODbL, public domain, NASA open data…).
* **LICENSED FOR REDISTRIBUTION**: explicit terms allow our use, possibly with conditions (non-commercial, attribution, quotas).
* **PUBLICLY ACCESSIBLE**: reachable without authentication, but no reuse licence is published, or the site reserves all rights.
* **UNKNOWN**: not yet determined.

## Code and libraries

| Component | Licence | Obligation |
|---|---|---|
| Andorra View source code | To be chosen by the owner (no LICENSE file yet; all rights reserved until then) | — |
| CesiumJS 1.146 | Apache-2.0 | Keep NOTICE. Cesium's on-screen credit is shown automatically |
| satellite.js 7 | MIT | Keep notice |
| Vite, TypeScript, Vitest, Wrangler | MIT / Apache-2.0 | Dev tooling, not distributed |
| God's Eye View (Bilawal Sidhu) | MIT (code only, "Copyright (c) 2026 Bilawal Sidhu"). Bundled datasets **not** MIT (some CC BY-NC-SA / CC BY-NC) | **No GEV code or data is copied in this version.** If modules are copied later, keep the MIT notice in those files + a THIRD_PARTY_NOTICES entry, and never copy `src/data/local_data/*`, the README media, or the name/logo |

## Data and map sources

| Source | Status | Licence / terms | Attribution shown in app | NC only |
|---|---|---|---|---|
| OpenStreetMap (places, POIs) | OPEN DATA | ODbL 1.0 (share-alike for derived databases) | © OpenStreetMap contributors | |
| adsb.lol (aircraft) | OPEN DATA | ODbL 1.0 | Aircraft: adsb.lol (ODbL) | |
| OpenSky Network (aircraft fallback) | LICENSED | Non-profit research/education/government use; for-profit needs written permission | The OpenSky Network | NC |
| CelesTrak (orbital elements) | LICENSED | Public data; usage policy: download once per 2 h update | CelesTrak | |
| NASA FIRMS (fires) | OPEN DATA | NASA open data, acknowledgement requested | NASA FIRMS (LANCE) | |
| EMSC (earthquakes, incl. IGN/ReNaSS) | LICENSED | Free with attribution (exact licence text UNVERIFIED) | EMSC | |
| Meteoalarm (warnings) | LICENSED | "Equivalent to CC BY 4.0" + T&C redistribution terms (to review) | Meteoalarm / SMN Andorra | |
| EAWS avalanche ratings | OPEN DATA (to verify per region) | avalanches.org data (CC BY 4.0 stated, UNVERIFIED for AD) | EAWS / SMN Andorra | |
| Open-Meteo (if used) | LICENSED | Data CC BY 4.0; free API non-commercial | Open-Meteo.com | NC |
| EOX Sentinel-2 cloudless 2024 | LICENSED | CC BY-NC-SA 4.0; commercial needs EOX licence | "Sentinel-2 cloudless 2024 by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)" | NC |
| AWS / Mapzen Terrain Tiles | OPEN DATA | EU-DEM © Copernicus, SRTM public domain, others per source list | Mapzen Terrain Tiles (EU-DEM, SRTM) | |
| Cesium ion / World Terrain (optional) | LICENSED | Community plan: personal & non-commercial | Cesium ion credit | NC |
| Google Photorealistic 3D Tiles (optional) | LICENSED | Google Maps Platform ToS: Google logo + tile copyrights must show; no caching; no derived data | Google logo + data providers (rendered by Cesium) | |
| **Govern d'Andorra SIG** (DTM 5 m, ortho 2022, parishes, border, roads, bus 2025, station metadata) | **PUBLICLY ACCESSIBLE** | No general licence published. Some layers say "Prohibit l'ús amb finalitats comercials sense autorització" | "Base topogràfica cedida pel Govern d'Andorra" + **No oficial** tag | NC |
| **Mobilitat Andorra** API (incidents, cameras, car parks, chargers) | **PUBLICLY ACCESSIBLE** | Legal notice: all rights reserved, personal use | Mobilitat Andorra + **No oficial** | — |
| **meteo.ad** current observations | **PUBLICLY ACCESSIBLE** | No reuse licence; official access by request form | SMN Andorra + **No oficial** | — |
| **aire.ad** air quality | **PUBLICLY ACCESSIBLE** | No licence (same data is EEA open data) | Govern d'Andorra + **No oficial** | — |
| **FEDA** energy | **PUBLICLY ACCESSIBLE** | No licence | FEDA + **No oficial** | — |
| **Comú d'Andorra la Vella** parking occupancy | **PUBLICLY ACCESSIBLE** | No licence | Comú d'Andorra la Vella + **No oficial** | — |

### Decision on unlicensed Andorran sources

The owner chose (2026-10-06) to **publish** these sources with visible attribution and an "unofficial / permission requested"
label while asking the providers for permission. Recommended requests:

1. Àrea de Cartografia (Govern): reuse of DTM, orthophoto, parishes, roads, bus layers; preferred attribution; expected tile load.
2. Departament de Mobilitat: reuse of `app.mobilitat.ad/api/v1` (incidents, cameras, points); whether a GTFS export exists.
3. Servei Meteorològic Nacional: observation data access (the official request form exists).
4. Àrea de Medi Ambient (aire.ad), FEDA, Comú d'Andorra la Vella: reuse terms; update frequency of parking occupancy.

If a provider refuses, set the layer's `defaultEnabled` to false or remove it, and update `permissionPending`
in `src/config/dataSources.ts`.

### Responsible disclosure (not for publication)

During research, some public ArcGIS feature services of Andorran administrations were found to accept anonymous edit
operations. Andorra View never writes to them. This should be reported **privately** to the service owners. The details
are kept out of the public documentation on purpose.
