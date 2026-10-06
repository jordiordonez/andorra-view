import type { Layer } from '../core/layer'
import { AircraftLayer } from './aircraft'
import { AirQualityLayer } from './airQuality'
import { AvalancheLayer } from './avalanche'
import { BoundariesLayer, BusLayer, PlacesLayer, RoadsLayer } from './context'
import { EarthquakesLayer } from './earthquakes'
import { FiresLayer } from './fires'
import { EvChargersLayer, ParkingLayer } from './parking'
import { SatellitesLayer } from './satellites'
import { TrafficIncidentsLayer } from './trafficIncidents'
import { WeatherAlertsLayer } from './weatherAlerts'
import { WeatherStationsLayer } from './weatherStations'
import { WebcamsLayer } from './webcams'

/**
 * Layers hidden in this build (comma-separated ids in VITE_HIDDEN_LAYERS). The code stays; the layer is just not
 * registered, so it never appears in the panel, search, status or agent tools. Used on the public deployment for
 * `aircraft`, whose upstream APIs refuse requests from Cloudflare (see README "Known limitations").
 */
export const HIDDEN_LAYERS = new Set(
  String(import.meta.env.VITE_HIDDEN_LAYERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

/** Every layer shown in the app, in panel order within each group. */
export function createLayers(): Layer[] {
  return allLayers().filter((l) => !HIDDEN_LAYERS.has(l.id))
}

function allLayers(): Layer[] {
  return [
    new TrafficIncidentsLayer(),
    new WebcamsLayer(),
    new ParkingLayer(),
    new EvChargersLayer(),
    new BusLayer(),
    new RoadsLayer(),
    new WeatherStationsLayer(),
    new WeatherAlertsLayer(),
    new AvalancheLayer(),
    new AirQualityLayer(),
    new FiresLayer(),
    new EarthquakesLayer(),
    new AircraftLayer(),
    new SatellitesLayer(),
    new BoundariesLayer(),
    new PlacesLayer(),
  ]
}
