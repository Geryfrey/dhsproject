import type { IndicatorResponse } from './types'

const BASE = '/api'

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000')
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(`${BASE}${url.pathname}${url.search}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

export function fetchIndicator(
  path: string,
  params: Record<string, string> = {}
): Promise<IndicatorResponse> {
  return get<IndicatorResponse>(path, params)
}

export async function fetchAllProvinces(
  path: string,
  params: Record<string, string> = {}
): Promise<IndicatorResponse[]> {
  const codes = [1, 2, 3, 4, 5]
  return Promise.all(
    codes.map((code) => fetchIndicator(path, { ...params, region: String(code) }))
  )
}
