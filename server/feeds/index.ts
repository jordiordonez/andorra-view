import { aircraftFeed } from './aircraft'
import { airQualityFeed } from './airQuality'
import { energyFeed } from './energy'
import { firesFeed } from './fires'
import { mobilityPointsFeed, trafficIncidentsFeed, webcamImageFeed, webcamsFeed } from './mobilitat'
import { satellitesFeed } from './satellites'
import type { Feed } from './types'
import { weatherAlertsFeed } from './weatherAlerts'
import { weatherStationsFeed } from './weatherStations'

/** Every feed served under /api. Each one must reference a registered source in src/config/dataSources.ts. */
export const FEEDS: Feed[] = [
  aircraftFeed,
  satellitesFeed,
  firesFeed,
  weatherAlertsFeed,
  trafficIncidentsFeed,
  webcamsFeed,
  webcamImageFeed,
  mobilityPointsFeed,
  weatherStationsFeed,
  airQualityFeed,
  energyFeed,
]
