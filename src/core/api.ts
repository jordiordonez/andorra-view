import type { FeedResponse } from './types'

/**
 * Base URL of the API proxy. Empty = same origin (vite dev / Cloudflare Pages).
 * For GitHub Pages set VITE_API_BASE to the Worker URL, e.g. https://andorra-view-api.<account>.workers.dev
 */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

export function apiUrl(path: string): string {
  return `${API_BASE}/api/${path.replace(/^\//, '')}`
}

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

export async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 15_000, ...rest } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal })
    if (!res.ok) {
      let detail = ''
      try {
        detail = ((await res.json()) as { message?: string }).message ?? ''
      } catch {
        /* not JSON */
      }
      throw new FetchError(`HTTP ${res.status}${detail ? ` — ${detail}` : ''}`, res.status)
    }
    return res
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new FetchError(`Temps d’espera esgotat (${timeoutMs / 1000} s)`)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchJsonDirect<T>(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const res = await fetchWithTimeout(url, { ...init, headers: { Accept: 'application/json', ...init?.headers } })
  return (await res.json()) as T
}

/** Fetch a normalized feed from our API proxy. */
export async function fetchFeed(feedId: string, params?: Record<string, string>): Promise<FeedResponse> {
  const qs = params ? `?${new URLSearchParams(params)}` : ''
  return fetchJsonDirect<FeedResponse>(apiUrl(`feeds/${feedId}${qs}`))
}
