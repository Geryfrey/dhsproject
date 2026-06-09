'use client'

import { useState, useMemo, useCallback } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Download, ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { fmtNum, cn } from '@/lib/utils'

export interface DataRow {
  name: string
  value: number | null
  type: 'province' | 'district' | 'national'
  sampleSize?: number | null
  province?: string
  provinceCode?: number
}

interface Props {
  rows: DataRow[]
  unit: string
  indicator: string
}

type SortCol = 'rank' | 'name' | 'type' | 'province' | 'value' | 'sampleSize' | 'vsNational' | 'pctNational'
type SortDir = 'asc' | 'desc'

function calcStats(vals: number[]) {
  if (!vals.length) return null
  const sorted = [...vals].sort((a, b) => a - b)
  const n = sorted.length
  const mean = vals.reduce((s, v) => s + v, 0) / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  return { min: sorted[0], max: sorted[n - 1], mean, median }
}

function downloadCSV(rows: DataRow[], indicator: string, unit: string, national: number | null) {
  const isPercent = unit === 'Percentage'
  const fmt = (v: number | null) => v == null ? '' : fmtNum(v)
  const header = ['Region', 'Type', 'Province', indicator + (isPercent ? ' (%)' : ` (${unit})`), 'Sample Size (n)', 'vs National', '% of National']
  const lines = [
    header.join(','),
    ...rows.map(r => {
      const vsNat = r.value != null && national != null ? fmtNum(r.value - national) : ''
      const pctNat = r.value != null && national != null && national > 0 ? fmtNum((r.value / national) * 100) : ''
      return [JSON.stringify(r.name), r.type, r.province ?? '', fmt(r.value), fmt(r.sampleSize ?? null), vsNat, pctNat].join(',')
    }),
    [],
    [`Source: DHS Rwanda 2019-20`],
    [`Downloaded: ${new Date().toLocaleDateString('en-GB')}`],
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${indicator.replace(/\s+/g, '_').toLowerCase()}_data.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function DataTable({ rows, unit, indicator }: Props) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set(['national', 'province', 'district']))
  const [provinceFilter, setProvinceFilter] = useState<string>('all')
  const [groupByProvince, setGroupByProvince] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const PER_PAGE = 15

  const isPercent = unit === 'Percentage'
  const fmt = useCallback((v: number | null) => {
    if (v == null) return null
    return isPercent ? `${fmtNum(v)}%` : fmtNum(v)
  }, [isPercent])

  const national = useMemo(() => rows.find(r => r.type === 'national')?.value ?? null, [rows])
  const provinces = useMemo(() => [...new Set(rows.filter(r => r.type === 'province').map(r => r.name))], [rows])

  const withRanks = useMemo(() => {
    const ranked = rows
      .filter(r => r.type !== 'national' && r.value != null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    const rankMap = new Map<string, number>()
    ranked.forEach((r, i) => rankMap.set(r.name, i + 1))
    return rows.map(r => ({
      ...r,
      rank: rankMap.get(r.name) ?? null,
      vsNational: r.value != null && national != null ? r.value - national : null,
      pctNational: r.value != null && national != null && national > 0 ? (r.value / national) * 100 : null,
    }))
  }, [rows, national])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return withRanks.filter(r => {
      if (!typeFilter.has(r.type)) return false
      if (provinceFilter !== 'all' && r.type === 'district' && r.province !== provinceFilter) return false
      if (q && !r.name.toLowerCase().includes(q) && !(r.province?.toLowerCase().includes(q))) return false
      return true
    })
  }, [withRanks, search, typeFilter, provinceFilter])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const getVal = (row: typeof a) => {
        if (sortCol === 'rank') return row.rank ?? Infinity
        if (sortCol === 'name') return row.name
        if (sortCol === 'type') return row.type
        if (sortCol === 'province') return row.province ?? ''
        if (sortCol === 'value') return row.value ?? -Infinity
        if (sortCol === 'sampleSize') return row.sampleSize ?? -Infinity
        if (sortCol === 'vsNational') return row.vsNational ?? -Infinity
        if (sortCol === 'pctNational') return row.pctNational ?? -Infinity
        return 0
      }
      const av = getVal(a)
      const bv = getVal(b)
      if (typeof av === 'string' && typeof bv === 'string') return dir * av.localeCompare(bv)
      return dir * ((av as number) - (bv as number))
    })
  }, [filtered, sortCol, sortDir])

  const totalPages = Math.ceil(sorted.length / PER_PAGE)
  const paged = groupByProvince ? sorted : sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  const stats = useMemo(() => {
    const vals = filtered.filter(r => r.type !== 'national' && r.value != null).map(r => r.value!)
    return calcStats(vals)
  }, [filtered])

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(0)
  }

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-rwanda-green" /> : <ArrowDown className="h-3 w-3 text-rwanda-green" />
  }

  const ThBtn = ({ col, label, className }: { col: SortCol; label: string; className?: string }) => (
    <button onClick={() => handleSort(col)} className={cn('inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap', className)}>
      {label}<SortIcon col={col} />
    </button>
  )

  const devColor = (v: number | null) => {
    if (v == null) return 'text-slate-400'
    if (v > 0) return 'text-green-600'
    if (v < 0) return 'text-red-600'
    return 'text-slate-500'
  }

  const typeBadge = (type: string) => {
    if (type === 'national') return 'bg-red-50 text-red-700'
    if (type === 'province') return 'bg-blue-50 text-blue-700'
    return 'bg-slate-100 text-slate-600'
  }

  const quartile = (rank: number | null, total: number) => {
    if (rank == null) return null
    const q = Math.ceil((rank / total) * 4)
    return Math.min(q, 4)
  }
  const qColor = (q: number | null) => {
    if (q === 1) return 'text-green-700 bg-green-50'
    if (q === 2) return 'text-blue-700 bg-blue-50'
    if (q === 3) return 'text-amber-700 bg-amber-50'
    return 'text-red-700 bg-red-50'
  }

  const dataTotal = filtered.filter(r => r.type !== 'national').length

  const groupedData = useMemo(() => {
    if (!groupByProvince) return null
    const groups: Record<string, typeof sorted> = {}
    const nationals: typeof sorted = []
    sorted.forEach(r => {
      if (r.type === 'national') { nationals.push(r); return }
      if (r.type === 'province') {
        if (!groups[r.name]) groups[r.name] = []
        groups[r.name].push(r)
        return
      }
      const prov = r.province ?? 'Other'
      if (!groups[prov]) groups[prov] = []
      groups[prov].push(r)
    })
    return { groups, nationals }
  }, [groupByProvince, sorted])

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search region…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rwanda-green/30" />
        </div>
        <button onClick={() => setShowFilters(f => !f)}
          className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors', showFilters ? 'border-rwanda-green bg-green-50 text-rwanda-green' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
          <Filter className="h-3.5 w-3.5" />Filters
          {(typeFilter.size < 3 || provinceFilter !== 'all') && (
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rwanda-green text-[10px] text-white">!</span>
          )}
        </button>
        <button onClick={() => setGroupByProvince(g => !g)}
          className={cn('rounded-lg border px-3 py-2 text-sm font-medium transition-colors', groupByProvince ? 'border-rwanda-green bg-green-50 text-rwanda-green' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
          Group by Province
        </button>
        <button onClick={() => downloadCSV(sorted, indicator, unit, national)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" />Export CSV
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Region Type</p>
            <div className="flex gap-3">
              {['national', 'province', 'district'].map(t => (
                <label key={t} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={typeFilter.has(t)}
                    onChange={e => {
                      const next = new Set(typeFilter)
                      e.target.checked ? next.add(t) : next.delete(t)
                      if (next.size > 0) setTypeFilter(next)
                    }}
                    className="rounded text-rwanda-green" />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>
          {typeFilter.has('district') && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Province</p>
              <select value={provinceFilter} onChange={e => setProvinceFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rwanda-green/30">
                <option value="all">All Provinces</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-3 text-left"><ThBtn col="rank" label="Rank" /></th>
              <th className="px-4 py-3 text-left"><ThBtn col="name" label="Region" /></th>
              <th className="px-4 py-3 text-left"><ThBtn col="type" label="Type" /></th>
              <th className="px-4 py-3 text-left hidden md:table-cell"><ThBtn col="province" label="Province" /></th>
              <th className="px-4 py-3 text-right"><ThBtn col="value" label={indicator} className="justify-end" /></th>
              <th className="px-4 py-3 text-right hidden lg:table-cell"><ThBtn col="sampleSize" label="n (sample)" className="justify-end" /></th>
              <th className="px-4 py-3 text-right hidden lg:table-cell"><ThBtn col="vsNational" label="vs National" className="justify-end" /></th>
              <th className="px-4 py-3 text-right hidden xl:table-cell"><ThBtn col="pctNational" label="% of National" className="justify-end" /></th>
              <th className="px-4 py-3 text-center hidden xl:table-cell text-slate-600 text-xs font-semibold">Quartile</th>
            </tr>
          </thead>
          <tbody>
            {!groupByProvince ? (
              paged.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-sm text-slate-400">No data available</td></tr>
              ) : paged.map((row, i) => {
                const q = quartile(row.rank, dataTotal)
                return (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-slate-500">
                      {row.rank ? <span className="font-mono">{row.rank}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{row.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', typeBadge(row.type))}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell text-sm">{row.province ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                      {row.value != null ? fmt(row.value) : <span className="text-slate-400">N/A</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500 hidden lg:table-cell">
                      {row.sampleSize != null ? row.sampleSize.toLocaleString() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={cn('px-4 py-2.5 text-right font-medium hidden lg:table-cell', devColor(row.vsNational))}>
                      {row.vsNational != null
                        ? `${row.vsNational >= 0 ? '+' : ''}${isPercent ? `${fmtNum(row.vsNational)}%` : fmtNum(row.vsNational)}`
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600 hidden xl:table-cell">
                      {row.pctNational != null ? `${fmtNum(row.pctNational)}%` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center hidden xl:table-cell">
                      {q && row.type !== 'national' ? (
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', qColor(q))}>Q{q}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                )
              })
            ) : (
              groupedData && (
                <>
                  {groupedData.nationals.map((row, i) => (
                    <tr key={`nat-${i}`} className="border-b border-slate-100 bg-red-50/20 hover:bg-red-50/40 transition-colors">
                      <td className="px-4 py-2.5 text-slate-300">—</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{row.name}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700">national</span>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell" />
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{row.value != null ? fmt(row.value) : 'N/A'}</td>
                      <td className="px-4 py-2.5 text-right hidden lg:table-cell text-slate-500">{row.sampleSize?.toLocaleString() ?? '—'}</td>
                      <td className="px-4 py-2.5 hidden lg:table-cell" />
                      <td className="px-4 py-2.5 hidden xl:table-cell" />
                      <td className="px-4 py-2.5 hidden xl:table-cell" />
                    </tr>
                  ))}
                  {Object.entries(groupedData.groups).map(([prov, provRows]) => {
                    const isCollapsed = collapsed.has(prov)
                    return (
                      <>
                        <tr key={`grp-${prov}`} className="border-b border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => setCollapsed(prev => { const n = new Set(prev); isCollapsed ? n.delete(prov) : n.add(prov); return n })}>
                          <td className="px-4 py-2.5" colSpan={9}>
                            <div className="flex items-center gap-2">
                              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
                              <span className="font-semibold text-slate-700">{prov}</span>
                              <span className="text-xs text-slate-400">({provRows.length} region{provRows.length !== 1 ? 's' : ''})</span>
                            </div>
                          </td>
                        </tr>
                        {!isCollapsed && provRows.map((row, i) => {
                          const q = quartile(row.rank, dataTotal)
                          return (
                            <tr key={`row-${prov}-${i}`} className="border-b border-slate-50 bg-white hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-2.5 pl-10 text-slate-500">
                                {row.rank ? <span className="font-mono">{row.rank}</span> : '—'}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-slate-800 pl-10">{row.name}</td>
                              <td className="px-4 py-2.5">
                                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', typeBadge(row.type))}>{row.type}</span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell text-sm">{row.province ?? '—'}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{row.value != null ? fmt(row.value) : 'N/A'}</td>
                              <td className="px-4 py-2.5 text-right hidden lg:table-cell text-slate-500">{row.sampleSize?.toLocaleString() ?? '—'}</td>
                              <td className={cn('px-4 py-2.5 text-right font-medium hidden lg:table-cell', devColor(row.vsNational))}>
                                {row.vsNational != null ? `${row.vsNational >= 0 ? '+' : ''}${isPercent ? `${fmtNum(row.vsNational)}%` : fmtNum(row.vsNational)}` : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right hidden xl:table-cell text-slate-600">
                                {row.pctNational != null ? `${fmtNum(row.pctNational)}%` : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-center hidden xl:table-cell">
                                {q && row.type !== 'national' ? (
                                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', qColor(q))}>Q{q}</span>
                                ) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    )
                  })}
                </>
              )
            )}
          </tbody>
          {stats && !groupByProvince && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-4 py-2.5" colSpan={4}>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Summary ({filtered.filter(r => r.type !== 'national').length} regions)</span>
                </td>
                <td className="px-4 py-2.5 text-right text-[11px] text-slate-600">
                  <div className="flex flex-col items-end gap-0.5">
                    <span>Min: <b>{isPercent ? `${fmtNum(stats.min)}%` : fmtNum(stats.min)}</b></span>
                    <span>Max: <b>{isPercent ? `${fmtNum(stats.max)}%` : fmtNum(stats.max)}</b></span>
                    <span>Mean: <b>{isPercent ? `${fmtNum(stats.mean)}%` : fmtNum(stats.mean)}</b></span>
                    <span>Median: <b>{isPercent ? `${fmtNum(stats.median)}%` : fmtNum(stats.median)}</b></span>
                  </div>
                </td>
                <td className="hidden lg:table-cell" colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {!groupByProvince && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{filtered.length} rows</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-40">‹</button>
            <span className="px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-40">›</button>
          </div>
        </div>
      )}
    </div>
  )
}
