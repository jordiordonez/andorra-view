/**
 * FEDA (Forces Elèctriques d'Andorra) daily energy balance — undocumented public JSON used by feda.ad:
 *   GET https://www.feda.ad/oficina-virtual/api/GetLastEnergy
 *   GET https://www.feda.ad/oficina-virtual/api/GetEnergyHistory?from=YYYY-MM-DD&to=YYYY-MM-DD&id={series}&format=json
 * Values are MWh per day. The "last" day is usually still being accumulated (partial), so the summary
 * also reports the last complete day from the history.
 */

export const FEDA_BASE = 'https://www.feda.ad/oficina-virtual/api'

export interface RawFedaValue {
  consum?: number
  data?: string
  descripcio?: string
  id?: number
}

/** Series ids as published by FEDA. */
export const FEDA_SERIES = {
  consumption: 10,
  importSpain: 11,
  importFrance: 12,
  production: 13,
  exportSpain: 20,
  exportFrance: 21,
  hydro: 30,
  incinerator: 31,
  cogenSoldeu: 32,
} as const

export type FedaSeries = keyof typeof FEDA_SERIES

export interface EnergyDay {
  /** YYYY-MM-DD */
  date: string
  /** MWh by series (only series present in the source). */
  mwh: Partial<Record<FedaSeries, number>>
}

export interface EnergySummary {
  /** Most recent day published by FEDA (may be partial). */
  latest?: EnergyDay
  /** True when the latest day's consumption is far below the recent average (still accumulating). */
  latestPartial: boolean
  /** Last complete day (consumption + production) from the history. */
  lastComplete?: { date: string; consumptionMWh?: number; productionMWh?: number; netImportMWh?: number; selfSufficiencyPct?: number }
  /** Daily consumption for the recent days (complete days only), oldest first. */
  consumptionHistory: Array<{ date: string; mwh: number }>
  /** Daily production for the recent days (complete days only), oldest first. */
  productionHistory: Array<{ date: string; mwh: number }>
}

const day = (iso: unknown) => (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : undefined)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : undefined)

export function parseLastEnergy(rows: RawFedaValue[]): EnergyDay | undefined {
  const byId = new Map(Object.entries(FEDA_SERIES).map(([k, v]) => [v as number, k as FedaSeries]))
  let date: string | undefined
  const mwh: EnergyDay['mwh'] = {}
  for (const r of rows ?? []) {
    const key = typeof r.id === 'number' ? byId.get(r.id) : undefined
    const v = num(r.consum)
    if (!key || v === undefined) continue
    mwh[key] = v
    date ??= day(r.data)
  }
  return date ? { date, mwh } : undefined
}

function historySeries(rows: RawFedaValue[] | undefined) {
  return (rows ?? [])
    .map((r) => ({ date: day(r.data), mwh: num(r.consum) }))
    .filter((r): r is { date: string; mwh: number } => !!r.date && r.mwh !== undefined)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : undefined
}

/** A day is considered partial when its consumption is < 60 % of the median of the previous days. */
export function summarizeEnergy(last: RawFedaValue[], consumptionHist?: RawFedaValue[], productionHist?: RawFedaValue[]): EnergySummary {
  const latest = parseLastEnergy(last)
  const cons = historySeries(consumptionHist)
  const prod = historySeries(productionHist)
  const isPartial = (d: { date: string; mwh: number }, series: typeof cons) => {
    const ref = median(series.filter((x) => x.date < d.date).map((x) => x.mwh))
    return ref !== undefined && d.mwh < ref * 0.6
  }
  const completeCons = cons.filter((d) => !isPartial(d, cons))
  const completeDates = new Set(completeCons.map((d) => d.date))
  const completeProd = prod.filter((d) => completeDates.has(d.date))
  const lastDay = completeCons.at(-1)
  const lastProd = lastDay ? prod.find((d) => d.date === lastDay.date)?.mwh : undefined
  const latestCons = latest?.mwh.consumption
  const latestPartial =
    latest !== undefined && latestCons !== undefined
      ? (() => {
          const ref = median(cons.filter((x) => x.date < latest.date).map((x) => x.mwh))
          return ref !== undefined ? latestCons < ref * 0.6 : false
        })()
      : false
  return {
    latest,
    latestPartial,
    lastComplete: lastDay
      ? {
          date: lastDay.date,
          consumptionMWh: lastDay.mwh,
          productionMWh: lastProd,
          netImportMWh: lastProd !== undefined ? Math.round((lastDay.mwh - lastProd) * 100) / 100 : undefined,
          selfSufficiencyPct: lastProd !== undefined && lastDay.mwh > 0 ? Math.round((lastProd / lastDay.mwh) * 1000) / 10 : undefined,
        }
      : undefined,
    consumptionHistory: completeCons,
    productionHistory: completeProd,
  }
}
