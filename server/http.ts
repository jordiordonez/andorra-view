import type { Env } from './env'

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'UpstreamError'
  }
}

export interface UpstreamOptions extends RequestInit {
  timeoutMs?: number
  /** Extra attempts after the first one, only for network errors / 5xx / 429. */
  retries?: number
}

export function userAgent(env: Env): string {
  return `AndorraView/0.1 (non-commercial public map; ${env.CONTACT ?? 'https://github.com/jordiordonez/andorra-view'})`
}

/** fetch() with timeout, bounded retries and a polite User-Agent. Throws UpstreamError on non-2xx. */
export async function fetchUpstream(env: Env, url: string, opts: UpstreamOptions = {}): Promise<Response> {
  const { timeoutMs = 10_000, retries = 1, headers, ...init } = opts
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': userAgent(env), Accept: '*/*', ...headers },
        signal: controller.signal,
      })
      if (res.ok) return res
      lastError = new UpstreamError(`${new URL(url).host} responded ${res.status}`, res.status)
      if (res.status !== 429 && res.status < 500) break
    } catch (err) {
      lastError =
        err instanceof Error && err.name === 'AbortError'
          ? new UpstreamError(`${new URL(url).host} timed out after ${timeoutMs} ms`)
          : new UpstreamError(`${new URL(url).host}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      clearTimeout(timer)
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
  }
  throw lastError
}

export async function fetchJson<T>(env: Env, url: string, opts?: UpstreamOptions): Promise<T> {
  const res = await fetchUpstream(env, url, { ...opts, headers: { Accept: 'application/json', ...opts?.headers } })
  return (await res.json()) as T
}

export async function fetchText(env: Env, url: string, opts?: UpstreamOptions): Promise<string> {
  const res = await fetchUpstream(env, url, opts)
  return res.text()
}
