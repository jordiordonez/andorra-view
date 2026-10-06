import { EdgeCache } from './cache'
import type { Env } from './env'
import { handleApiRequest } from './router'

/** Cloudflare Worker entry (API only; the static frontend can live on GitHub Pages or Cloudflare Pages). */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) {
      return new Response('Andorra View API — see /api/status', { status: 404 })
    }
    return handleApiRequest(request, env, new EdgeCache(await caches.open('andorra-view')))
  },
}
