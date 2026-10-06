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

/** Every layer shown in the app, in panel order within each group. */
export function createLayers(): Layer[] {
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
