/** Server-side configuration. Secrets only ever live here (Worker secrets / local .env), never in the bundle. */
export interface Env {
  /** Comma-separated list of origins allowed to call the API, or "*". */
  ALLOWED_ORIGINS?: string
  /** Optional NASA FIRMS MAP_KEY — enables the area API instead of the keyless Europe CSV. */
  FIRMS_MAP_KEY?: string
  /** Optional OpenSky OAuth2 client credentials (raises the daily credit limit). */
  OPENSKY_CLIENT_ID?: string
  OPENSKY_CLIENT_SECRET?: string
  /** Contact string appended to the User-Agent sent upstream. */
  CONTACT?: string
}
