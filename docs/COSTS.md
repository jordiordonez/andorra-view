# Andorra View — Cost estimate

Prices as researched on 2026-10-06 (see docs/research/04-global-feeds-basemaps.md). They are estimates, not quotes.
Andorra View is a **non-commercial** project. Several free tiers depend on that (see LICENSES_AND_ATTRIBUTIONS.md).

## Assumptions

* One visit is about 8 minutes with default layers on. API calls per visit: aircraft every 10 s (~48),
  incidents/cameras/parking every 2 min (~12), stations/warnings/fires/energy (~6), satellites (1), plus webcam
  images opened (~5). Total about **70 Worker requests per visit**.
* 1 monthly user ≈ 3 visits. Most requests are served from the Worker cache, so upstream load stays flat
  regardless of audience size (one upstream call per feed per TTL per data centre).
* The static bundle (Cesium plus app) is about 4–5 MB compressed on the first visit and cached afterwards. Map tiles come straight from
  their providers (Govern SIG, EOX, AWS), not from our hosting.

## Baseline architecture ($0 by default)

| Item | Provider | Free allowance | Notes |
|---|---|---|---|
| Static hosting | GitHub Pages | ~100 GB/month bandwidth (soft), 1 GB site | Switch to Cloudflare Pages (unmetered static bandwidth) if traffic grows |
| API proxy + cache | Cloudflare Workers Free | 100,000 req/day, 10 ms CPU/req | Workers Paid: $5/month incl. 10 M req, then $0.30 per extra million |
| Terrain | Govern DTM + AWS Terrarium | free | No key |
| Imagery | Govern ortho + EOX Sentinel-2 cloudless | free (non-commercial for EOX) | No key |
| Aircraft | adsb.lol (ODbL) / OpenSky fallback | free | OpenSky 400 credits/day anonymous; 4,000 with free OAuth client |
| Satellites, fires, quakes, warnings, avalanche | CelesTrak, NASA FIRMS, EMSC, Meteoalarm, EAWS | free | FIRMS MAP_KEY is free (optional) |
| Andorran feeds | Mobilitat, meteo.ad, aire.ad, FEDA, ALV | free | Permission pending |
| Forecast (optional) | Open-Meteo | free < 10k calls/day, non-commercial | Not used by default |

## Monthly estimates

| Scenario | Visits/month | Worker requests/month | Hosting + API | Optional Google 3D* | Optional Cesium ion** | AI (if enabled)*** |
|---|---|---|---|---|---|---|
| Development / testing | ~300 | ~20 k | **$0** | $0 (within 1,000 free root requests) | $0 (Community) | ~$0–5 |
| 1,000 monthly users | ~3,000 | ~210 k (≈7 k/day) | **$0** | ~$12 | $0 non-commercial | ~$10–30 |
| 10,000 monthly users | ~30,000 | ~2.1 M (≈70 k/day, peaks > 100 k) | **$5** (Workers Paid to avoid daily-cap errors) + $0 Cloudflare Pages | ~$174 | Community quota exceeded → $149 (Commercial plan) or stay on Govern/Terrarium terrain | ~$100–300 |
| 100,000 monthly users | ~300,000 | ~21 M | **≈$8** ($5 + 11 M × $0.30) on Cloudflare Pages + Workers | ~$1,500+ | $149+ / custom | ~$1,000–3,000 |

\* Google Photorealistic 3D Tiles: 1,000 root-tile requests/month free, then $6 per 1,000 (≈ one per visit if a user enables it).
  The figures assume every visit turns it on, which is a worst case. Off by default, it only appears when a key is set.
\*\* Cesium ion is only used if `VITE_CESIUM_ION_TOKEN` is set. The default composite terrain needs no ion.
\*\*\* AI assistant (Phase 5) is not built. The range assumes 5–10% of visits use voice/chat at roughly $0.01–0.10 per interaction
  depending on model and modality. It must sit behind a server-side key with per-IP quotas.

## Cost-control measures already in place

* Worker cache + in-flight request collapsing, so upstream calls don't scale with users.
* Per-IP rate limiting in the Worker.
* Polling pauses in background tabs.
* Paid providers (Google 3D, ion) are opt-in by configuration and off by default.
* No database, no scheduled jobs (cron) needed. All ingestion is on-demand with caching.

## Watch points

* **GitHub Pages bandwidth**: past about 20k monthly users, deploy the same `dist/` to Cloudflare Pages
  (`VITE_API_BASE` can then be empty if the Worker is routed on the same domain).
* **Govern SIG tile load**: all imagery and terrain tiles inside Andorra come from `sig.govern.ad`. At high traffic, ask the Àrea de
  Cartografia about expected load, or pre-render Andorra terrain into static quantized-mesh tiles on R2 (cheap: < 1 GB).
* **adsb.lol / OpenSky** fair use: the Worker queries at most once per 8 s per data centre, independent of users.
