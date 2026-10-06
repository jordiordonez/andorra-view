import { aircraftFeed } from './aircraft'
import type { Feed } from './types'

/** Every feed served under /api. Each one must reference a registered source in src/config/dataSources.ts. */
export const FEEDS: Feed[] = [aircraftFeed]
