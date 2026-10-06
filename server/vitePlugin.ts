import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import { MemoryCache } from './cache'
import type { Env } from './env'
import { handleApiRequest } from './router'

/** Mounts the same API handler used by the Worker into `vite dev` / `vite preview`. */
export function apiDevServer(): Plugin {
  const cache = new MemoryCache()
  let env: Env = {}
  const mount = (server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) => {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/')) return next()
      try {
        const request = new Request(`http://localhost${req.url}`, {
          method: req.method,
          headers: Object.fromEntries(Object.entries(req.headers as Record<string, string>).filter(([, v]) => typeof v === 'string')),
        })
        const response = await handleApiRequest(request, env, cache)
        res.statusCode = response.status
        response.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await response.arrayBuffer()))
      } catch (err) {
        res.statusCode = 500
        res.end(String(err))
      }
    })
  }
  return {
    name: 'andorra-view-api',
    configResolved(config) {
      const loaded = loadEnv(config.mode, config.envDir ?? process.cwd(), '')
      env = {
        ALLOWED_ORIGINS: '*',
        FIRMS_MAP_KEY: loaded.FIRMS_MAP_KEY,
        OPENSKY_CLIENT_ID: loaded.OPENSKY_CLIENT_ID,
        OPENSKY_CLIENT_SECRET: loaded.OPENSKY_CLIENT_SECRET,
        CONTACT: loaded.CONTACT,
      }
    },
    configureServer: mount,
    configurePreviewServer: mount,
  }
}
