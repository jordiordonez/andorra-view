# 05 — Live bus data: Ride Pingo (Escaldes) and Mou-te / "Mou-te bé" (national lines)

Research date: 2026-10-06. Builds on `02-andorra-gov-mobility.md` §3 (static ArcGIS bus layer, bus.ad, no GTFS in Mobility Database or transit.land), which is not repeated here.

Method: web search plus `curl` of **public web pages and their static JS/JSON assets only**. No mobile apps were downloaded or decompiled, no app traffic was intercepted, and no backend API that needs a key, token, signature or login was called. Values of keys found in public config files were **redacted and not used**. No personal data was collected.

---

## TL;DR

| Candidate | What it offers | Access | Licence / terms | Status |
|---|---|---|---|---|
| **FEDA Mou-te web app** (`moute.ad` → `feda.hafas.cloud`) | Trip planner, departures and a **live map of bus positions** for L1–L7, Bus Exprés and some parish services (HaCon HAFAS) | Public web app for humans. Its backend (HAFAS HCI `.../gate`) needs a client **AID** auth key and request checksums | No reuse licence; operator FEDA Solucions S.A.U. | Backend: **NOT USABLE**. Link-out or iframe: **NEEDS REVIEW** |
| **Ride Pingo** (The Routing Company) for **EE Bus** (Escaldes) | App tracks the 3 hourly comunal lines in real time and books the on-demand service | iOS/Android app and a Flutter web app (`web.ridepingo.com`). No public tracking page, share link, API or feed found | TRC ToS: personal non-commercial use only; no reverse-engineering | **NOT USABLE** (ask TRC or the Comú for GTFS-RT) |
| Escaldes timetables (e-e.ad PDFs and web text) | Hourly lines from Caldea; Bus Unió timetable PDF | Public PDFs/HTML | No licence stated | **POSSIBLE** (hand-build a static schedule) |
| Govern ArcGIS `Línies autobús 2025` | Static stops and shapes (see doc 02) | Anonymous REST | No licence stated | **POSSIBLE/READY** (unchanged) |
| Mobility Database / transit.land | — | — | — | **Nothing for Andorra** (re-checked) |
| OSM `route=bus` | 19 relations: national L1–L7, Lé, N (night), Monbus. **No Escaldes comunal lines** | Overpass | ODbL | **READY** for the national network geometry |

**Bottom line:** there is still **no legitimately public machine-readable real-time source** for Andorran buses. Real-time data does exist: GPS on the whole national fleet is fed into HAFAS (Mou-te), and TRC tracks EE Bus vehicles. Both sit behind keyed or app-only backends. The legitimate path is to **ask for a feed**: FEDA Solucions / Govern (Mobilitat) for GTFS + GTFS-RT exported from HAFAS, and the Comú d'Escaldes / TRC for a GTFS-RT VehiclePositions feed. TRC already produces GTFS-RT for other customers through Swiftly.

---

## 1. "Mou-te bé" / Mou-te — national lines

### 1.1 Identity
- The app was formerly **"Mou_T_B"** and is now **"FEDA Mou-te"**. App Store id `1473798601` (https://apps.apple.com/app/id1473798601): *"previously known as Mou_T_B now becomes FEDA Mou-te"*. Developer: FEDA (Forces Elèctriques d'Andorra), with the Govern.
- **"Mou-te Next Generation"** launched on 2026-06-26 (alto.ad, https://www.alto.ad/transport/2026/06/andorra-launches-updated-mou-te-app-with-real-ti). The whole national fleet has GPS, with live positions and traffic-adjusted ETAs for L1–L7, Bus Exprés, Uclic (Encamp/Canillo) and La Massana parish routes. The article does not mention Escaldes. A follow-up article covers La Seu line integration (https://www.alto.ad/transport/2026/07/andorra-la-seu-bus-frequencies-increase-mou-te).
- Data controller for the platform, according to the privacy page linked from the web app: **FEDA Solucions, S.A.U.** (`https://fedasolucions.ad/appintern/privacystatement-ca/getText`, 200).
- Not to be confused with **"Mou-te en Bus"** (`bus.ad`, the Govern's bus info website, covered in doc 02). `bus.ad` does **not** link to the Mou-te web app. It still links the ArcGIS experience app, and its homepage has no iframe or live widget (re-checked today). The WP REST namespaces (`wp/v2`, `the_grid/v1`, `mf-core/v3`) hold no timetable or vehicle data.

### 1.2 Web version (public)
| URL | Result |
|---|---|
| `https://moute.ad` / `https://www.moute.ad` | **301 → `https://feda.hafas.cloud/webapp/`**, which serves the same SPA as `/` |
| `https://feda.hafas.cloud/` | 200, `text/html`, 96 KB, `<title>FEDA_webapp_prod</title>`, Angular SPA. `Last-Modified: Fri, 18 Sep 2026`. **No `X-Frame-Options` or CSP `frame-ancestors`**, so an iframe would technically work |
| `https://feda.hafas.cloud/assets/configs/default/config.json` | 200 JSON, 6.5 KB, public static tenant config. Relevant fields: `core.appName=FEDA_webapp_prod`, `core.softwareVersion=26.1.19`, **`core.hciEndpoint=https://feda.hafas.cloud/gate`**, `core.hciVersion=1.85`, **`core.hciAID` (present; value redacted, not used)**, `livemap.enabled=true`, `motion.enabled=true`, `livenavigation.enabled=true`, `terminalMode.enabled=true` (reloadInterval 10), **`widgetgenerator.enabled=false`**, `disruptions.enabled=false`, `core.languages=[de,en,es,fr,ca]` |
| `https://feda.hafas.cloud/assets/metadata.json` | 200 JSON, icon metadata only (`nxt_livemap`, `nxt_realtime`, …) |
| `https://feda.hafas.cloud/gate` (plain GET) | **400** `application/json`. This is the HAFAS HCI ("mgate") JSON-RPC backend |
| `https://feda.hafas.cloud/robots.txt` | 404 |
| moutebe.ad, mou-te.ad, moute.feda.ad, feda.ad/mou-te | DNS failure / 404 |

Platform: **HaCon HAFAS** (Siemens), web app "Next" generation. The JS bundle (`chunk-5CEYDIZX.js`) builds HCI requests with `auth:{type:"AID",…}` and has `checksum`/`mic` request-signing logic. **The backend therefore needs a client key and signed requests. Under the rules for this research it is a private app backend and was not called.** The key sits in a public file, but it is issued to FEDA's own client, not to third parties.

Terms: the web app's cookie-policy link points to a **placeholder** (`https://demo.hafas.de/imprint/`). No terms of use, open licence or developer/API page was found for Mou-te. The Govern and mobilitat.ad notices quoted in doc 02 (*"El seu ús comercial no està permès"*) suggest a non-commercial reading, but nothing here grants reuse.

### 1.3 GTFS / GTFS-RT
- No public GTFS or GTFS-RT. Not in Mobility Database (re-checked: `feeds_v2.csv` 200, 6,591 rows, **0 with `location.country_code=AD`**, no provider text matching "andorra"/"feda"), not in the transit.land atlas (818 feed files, none matching andorr/feda/hafas/coopalsa/mou), and transit.land REST still returns 401 without a key.
- HAFAS installations routinely **import** GTFS or operator data and can **export** GTFS / GTFS-RT. The Govern ArcGIS stop fields (`stop_id`, `stop_code`, `route_name`) look GTFS-derived. An export very likely exists internally (**UNVERIFIED**).
- Govern ArcGIS portal search (`sig.govern.ad/portal/sharing/rest/search`, anonymous, q = bus/autobus/parades/gtfs/linies): only the items already known (`Línies autobús 2025 corregit` 2025-07-29, `Línies bus 2025`, `Intercanviadors`, experience app 2025-10-31). Nothing new, and no GTFS or timetable table.

### 1.4 Recommendation (Mou-te)
- **Backend (HCI gate): NOT USABLE.** It is keyed, signed and undocumented.
- **Link-out** ("Live buses → moute.ad") from Andorra View: **READY**. It is just a hyperlink.
- **Iframe of feda.hafas.cloud** (e.g. its live map or terminal/departure-board mode): technically possible because no frame-blocking headers are set, but **NEEDS REVIEW**. Ask FEDA Solucions first; there are no terms and the widget generator is disabled on purpose.
- **Best legitimate path:** email FEDA Solucions (mobility platform) and the Govern's Departament de Mobilitat. Ask for (a) a GTFS static export and (b) GTFS-RT `VehiclePositions` + `TripUpdates`, or HAFAS "ReST/Open API" access with a key issued to Andorra View for non-commercial use with attribution. Point out that Andorra is absent from Mobility Database and transit.land, and offer to register the feed there.

---

## 2. Ride Pingo — Escaldes-Engordany (EE Bus)

### 2.1 Identity
- **Ride Pingo / Pingo** is the rider app of **The Routing Company (TRC)**, US, founded by MIT researchers. It supports **on-demand (DRT), flex, fixed-route shuttle tracking and paratransit** (Mass Transit Magazine; App Store `id1536281958`; Play id `com.theroutingcompany.pingo.rider`). It operates in the US, NL (HTM "Haagse Hopper"), UK (West/East Sussex, Scottish Borders) and Andorra.
- `https://ridepingo.com/` → 200. Its locations list includes **"E-E Bus - Escaldes-Engordany, Andorra"** → `https://ridepingo.com/bus-a-la-demanda-escaldes-engordany-andorra/` (200). That page shows service hours (Mon–Fri 7:00–22:00, Sat–Sun 9:00–22:00), fare "Free", and the service phone. No map, tracking link or data link.
- History: Escaldes launched "Bus a la Demanda" with TRC in June 2021 (4 vehicles). Source: Bable Smart Cities use case (https://www.bable-smartcities.eu/explore/use-cases/use-case/on-demand-bus-in-escaldes-engordany-andorra.html), which returned 403 to WebFetch, so this is via the search snippet only.

### 2.2 How Escaldes uses it now (Comú page)
`https://e-e.ad/publicacio/6632/el-nou-bus-comunal-amb-tres-linies-regulars-sortira-cada-hora-des-de-la-parada-de-caldea` (200):
- **3 fixed regular lines**: Engolasters, els Vilars and Sant Jaume. Hourly from the **Caldea** stop, 7:00–21:15 Mon–Fri, starting 9:00 at weekends.
- Quote: *"Descarrega't l'aplicació RidePingo per seguir … en temps real la ubicació del bus"*. Ride Pingo is therefore the **real-time vehicle tracker for the fixed lines**.
- **Bus a demanda** is kept only for people with disabilities or reduced mobility. Users must register, book the day before via Ride Pingo or by phone, and trips stay within the parish.
- **Bus Unió** (interparish Andorra la Vella ↔ Escaldes, circular, every 40 min, 15 stops). Timetable PDF: `https://www.e-e.ad/uploads/altres/Cartell%20A3%20bus%20interparroquial.pdf` (200, 783 KB, text-extractable: departures 7.00…20.20 from Casa Comuna, 7.15…20.35 from Caldea). Not stated whether it is tracked in Ride Pingo or Mou-te: **UNVERIFIED**.
- The link labelled "horaris de les línies regulars" actually points to the Bus-a-demanda flyer `AFFullet Bus a la demanda_juny 251_web.pdf` (200, 1.4 MB, **image-only, no text layer**). No machine-readable timetable was found for the 3 comunal lines.
- The Comú site also links a separate app, `com.aprop.escaldes` (Google Play), whose relation to the bus is **UNVERIFIED**.
- The old URL `e-e.ad/publicacio/5702/ee-bus/` (linked from ridepingo.com) → **404**.

### 2.3 Public web / data surfaces
| URL | Result |
|---|---|
| `https://web.ridepingo.com/` | 200, 2.7 KB Flutter web shell (`<title>Ride Pingo</title>`, mixpanel, `flutter_inappwebview`). This is the rider web app; account/login is presumed (**UNVERIFIED**, not exercised). No public tracking page found |
| `app.ridepingo.com`, `ridepingo.app` | DNS failure |
| `theroutingcompany.com/developers` | 404. No developer portal, public API or GTFS/GTFS-RT URL found |
| Ride-share / "track my bus" share links | None found on ridepingo.com, e-e.ad or in search results |
| Mobility Database / transit.land | No TRC/Pingo feed for Andorra (no provider text match) |
| OSM | **No `route=bus` relations for the Escaldes comunal lines** (Overpass, 19 Andorra relations, all national or Monbus) |

TRC does produce GTFS-RT for customers: there is a partnership with Swiftly for GTFS-rt monitoring across its deployments (Mass Transit Magazine, https://www.masstransitmag.com/technology/press-release/53081638/). A per-agency GTFS-RT export is therefore plausible, but it is not public for Escaldes (**UNVERIFIED**).

### 2.4 Terms
`https://theroutingcompany.com/terms-of-service` (200, "Last updated: September 1st, 2021"):
- App licence is *"solely for your own personal non-commercial purposes"*.
- Prohibited: *"reverse engineer, decompile or disassemble the Pingo App"*.
- Prohibited: using the Services *"for the benefit of any third party"*.

→ Scraping the app or web app for vehicle positions is excluded.

### 2.5 Recommendation (Ride Pingo)
- **NOT USABLE** as a data source today.
- **Static fallback (POSSIBLE):** hand-encode the 3 hourly comunal lines (Caldea departures, published times) and the Bus Unió PDF timetable as a small static schedule. Stops and shapes would have to be digitised (they are not in OSM or the Govern layer: **UNVERIFIED** for the Govern layer, whose 16 shapes are national lines).
- **Best legitimate path:** ask the **Comú d'Escaldes-Engordany (servei de circulació / EE Bus)**, who own the contract and data, to ask TRC for a **public GTFS + GTFS-RT VehiclePositions** feed for the 3 fixed lines and Bus Unió. Contact TRC (the contact address on theroutingcompany.com, the company's published business address) in parallel.

---

## 3. What would make a live bus layer possible (ranked)

1. **GTFS-RT from FEDA Solucions / Govern (HAFAS export)** covers about all national lines plus Uclic and La Massana. One request, highest value.
2. **GTFS-RT from TRC via the Comú d'Escaldes** covers the EE Bus lines.
3. **Interim:** static network from the Govern ArcGIS layer and OSM, scheduled "ghost buses" interpolated from published timetables (bus.ad, Govern PDF, Escaldes PDFs) and clearly labelled "horari teòric", plus a "Live: open Mou-te" link-out to `moute.ad`.

Not attempted (by rule): calling `feda.hafas.cloud/gate` with the public-bundle AID, any Ride Pingo backend, APK/IPA inspection, or traffic interception.
