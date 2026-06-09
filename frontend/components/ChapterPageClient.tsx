'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQueries } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ChevronDown, Layers } from 'lucide-react'
import { fetchIndicator } from '@/lib/api'
import { PROVINCES } from '@/lib/types'
import type { ChapterConfig, IndicatorConfig, IndicatorResponse } from '@/lib/types'
import { fmtNum, cn } from '@/lib/utils'
import DataTable from './DataTable'
import type { DataRow } from './DataTable'
import Header from './layout/Header'
import ChartContainer, { ChartTypeSelector } from './charts/ChartContainer'
import type { ChartType } from './charts/ChartContainer'
import ReportModal from './modals/ReportModal'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface Props {
  chapter: ChapterConfig
  initialData?: (IndicatorResponse | null)[]
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-rwanda-green/30 cursor-pointer">
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  )
}

export default function ChapterPageClient({ chapter, initialData }: Props) {
  const [selectedIndicatorId, setSelectedIndicatorId] = useState(chapter.indicators[0]?.id ?? '')
  const [dynamicParams, setDynamicParams] = useState<Record<string, string>>({})
  const [selectedProvince, setSelectedProvince] = useState<number | null>(null)
  const [chartType, setChartType] = useState<ChartType>('bar-h')
  const [districtChartType, setDistrictChartType] = useState<ChartType>('bar-h')
  const [compareMode, setCompareMode] = useState(false)
  const [compareIndicators, setCompareIndicators] = useState<Set<string>>(new Set())
  const [reportOpen, setReportOpen] = useState(false)

  const indicator: IndicatorConfig | undefined = useMemo(
    () => chapter.indicators.find(i => i.id === selectedIndicatorId),
    [chapter, selectedIndicatorId]
  )

  const currentParams = useMemo(() => {
    if (!indicator) return {}
    const params: Record<string, string> = { ...indicator.fixedParams }
    indicator.dynamicParams?.forEach(p => { params[p.key] = dynamicParams[p.key] ?? p.default })
    return params
  }, [indicator, dynamicParams])

  const handleIndicatorChange = useCallback((id: string) => {
    setSelectedIndicatorId(id)
    setDynamicParams({})
    setSelectedProvince(null)
    setCompareMode(false)
    setCompareIndicators(new Set())
  }, [])

  const isDefaultView = selectedIndicatorId === chapter.indicators[0]?.id && Object.keys(dynamicParams).length === 0

  // Primary indicator — all 5 provinces
  const queries = useQueries({
    queries: indicator
      ? PROVINCES.map((prov, i) => ({
          queryKey: ['indicator', indicator.path, { ...currentParams, region: String(prov.code) }],
          queryFn: () => fetchIndicator(indicator.path, { ...currentParams, region: String(prov.code) }),
          enabled: !!indicator,
          ...(isDefaultView && initialData?.[i]
            ? { initialData: initialData[i]!, staleTime: 5 * 60 * 1000 }
            : {}),
        }))
      : [],
  })

  // Compare mode — fetch selected indicators
  const compareIndicatorList = useMemo(() =>
    chapter.indicators.filter(i => compareIndicators.has(i.id) && i.id !== selectedIndicatorId),
    [chapter.indicators, compareIndicators, selectedIndicatorId]
  )

  const compareQueries = useQueries({
    queries: compareIndicatorList.flatMap(ind => {
      const params: Record<string, string> = { ...ind.fixedParams }
      ind.dynamicParams?.forEach(p => { params[p.key] = p.default })
      return PROVINCES.map(prov => ({
        queryKey: ['compare-ind', ind.path, { ...params, region: String(prov.code) }],
        queryFn: () => fetchIndicator(ind.path, { ...params, region: String(prov.code) }),
        enabled: compareMode && compareIndicators.size > 0,
      }))
    }),
  })

  const isError = queries.every(q => q.isError)
  const firstSuccess = queries.find(q => q.data)?.data
  const hasAnyData = queries.some(q => !!q.data)
  const isLoading = !hasAnyData && queries.some(q => q.isPending || q.isFetching)

  const provinceData = useMemo(() =>
    queries.map((q, i) => ({
      name: PROVINCES[i].name,
      code: PROVINCES[i].code,
      value: q.data?.provinces?.[0]?.value ?? null,
      districts: q.data?.districts ?? [],
    })),
    [queries]
  )

  const districtData = useMemo(() => {
    if (!selectedProvince) return []
    const prov = queries.find((_, i) => PROVINCES[i].code === selectedProvince)
    return prov?.data?.districts ?? []
  }, [queries, selectedProvince])

  const unit = firstSuccess?.unit ?? 'Percentage'
  const national = firstSuccess?.national.value ?? null

  // Build grouped compare data for multi-indicator grouped bar
  const compareGroupedData = useMemo(() => {
    if (!compareMode || compareIndicators.size === 0) return []
    const allInds = [
      { id: selectedIndicatorId, name: indicator?.name ?? '', data: provinceData },
      ...compareIndicatorList.map((ind, indIdx) => ({
        id: ind.id,
        name: ind.name,
        data: PROVINCES.map((prov, provIdx) => ({
          name: prov.name,
          code: prov.code,
          value: compareQueries[indIdx * PROVINCES.length + provIdx]?.data?.provinces?.[0]?.value ?? null,
        })),
      })),
    ].filter(i => compareIndicators.has(i.id) || i.id === selectedIndicatorId)

    return PROVINCES.map(prov => {
      const entry: Record<string, any> = { name: prov.name, code: prov.code }
      allInds.forEach(ind => {
        entry[ind.id] = ind.data.find(d => d.code === prov.code)?.value ?? null
      })
      return entry
    })
  }, [compareMode, compareIndicators, selectedIndicatorId, provinceData, compareIndicatorList, compareQueries, indicator])

  // Build enhanced table rows
  const tableRows = useMemo((): DataRow[] => {
    const rows: DataRow[] = []
    const nat = firstSuccess?.national.value
    if (nat != null) rows.push({ name: 'National', value: nat, type: 'national', sampleSize: firstSuccess?.national?.sample_size ?? null })

    provinceData.forEach(p => {
      const provQuery = queries.find((_, i) => PROVINCES[i].code === p.code)
      const sampleSize = provQuery?.data?.provinces?.[0]?.sample_size ?? null
      rows.push({ name: p.name, value: p.value, type: 'province', sampleSize })
    })

    if (selectedProvince) {
      const provName = PROVINCES.find(p => p.code === selectedProvince)?.name ?? ''
      districtData.forEach(d => {
        rows.push({
          name: d.district_name,
          value: d.value,
          type: 'district',
          sampleSize: d.sample_size ?? null,
          province: provName,
          provinceCode: selectedProvince,
        })
      })
    }
    return rows
  }, [provinceData, districtData, firstSuccess, selectedProvince, queries])

  const districtChartData = useMemo(() =>
    districtData.map((d, i) => ({
      name: d.district_name,
      value: d.value,
      code: d.district_code ?? i,
    })),
    [districtData]
  )

  if (!indicator) return <div className="p-8 text-slate-500">No indicators available for this chapter.</div>

  const currentIndicatorForReport = {
    chapterSlug: chapter.slug,
    chapterTitle: chapter.title,
    indicatorId: selectedIndicatorId,
    indicatorName: firstSuccess?.indicator ?? indicator.name,
    params: currentParams,
    description: indicator.description,
  }

  const MULTI_IND_COLORS = ['#1d4ed8', '#0f766e', '#7c3aed', '#b45309', '#dc2626', '#0891b2']

  return (
    <>
      <Header
        title={chapter.title}
        subtitle={firstSuccess ? `${firstSuccess.population_type} · ${firstSuccess.data_source}` : 'DHS Rwanda 2019–20'}
        onPrint={() => setReportOpen(true)}
      />

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        currentIndicator={currentIndicatorForReport}
        currentRegions={tableRows.map(r => ({ type: r.type, name: r.name, value: r.value }))}
        reportTitle={`${chapter.title} — ${firstSuccess?.indicator ?? indicator.name}`}
      />

      {/* Print header */}
      <div className="print-only p-6 border-b mb-4">
        <h1 className="text-2xl font-bold text-slate-900">{chapter.title}</h1>
        <p className="text-slate-600">{firstSuccess?.indicator} · {firstSuccess?.data_source}</p>
        <p className="text-slate-500 text-sm" suppressHydrationWarning>Report generated: {typeof window !== 'undefined' ? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Filters + controls */}
        <div className="no-print flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Select label="Indicator" value={selectedIndicatorId} onChange={handleIndicatorChange}
            options={chapter.indicators.map(i => ({ value: i.id, label: i.name }))} />
          {indicator.dynamicParams?.map(param => (
            <Select key={param.key} label={param.label}
              value={dynamicParams[param.key] ?? param.default}
              onChange={v => setDynamicParams(prev => ({ ...prev, [param.key]: v }))}
              options={param.options} />
          ))}
          {chapter.indicators.length > 1 && (
            <div className="flex items-end">
              <button onClick={() => { setCompareMode(m => !m); setCompareIndicators(new Set()) }}
                className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors', compareMode ? 'border-rwanda-green bg-green-50 text-rwanda-green' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                <Layers className="h-3.5 w-3.5" />
                {compareMode ? 'Exit Compare' : 'Compare Indicators'}
              </button>
            </div>
          )}
        </div>

        {/* Compare indicator selector */}
        {compareMode && chapter.indicators.length > 1 && (
          <div className="no-print rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900 mb-3">Select indicators to overlay:</p>
            <div className="flex flex-wrap gap-2">
              {chapter.indicators.map((ind, i) => {
                const isSelected = compareIndicators.has(ind.id)
                const isMain = ind.id === selectedIndicatorId
                return (
                  <button key={ind.id} disabled={isMain}
                    onClick={() => setCompareIndicators(prev => {
                      const n = new Set(prev)
                      isSelected ? n.delete(ind.id) : n.add(ind.id)
                      return n
                    })}
                    className={cn('flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors', isMain ? 'border-green-300 bg-white text-green-700 opacity-70 cursor-not-allowed' : isSelected ? 'border-rwanda-green bg-white text-rwanda-green shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                    <span className="h-2 w-2 rounded-full" style={{ background: MULTI_IND_COLORS[i % MULTI_IND_COLORS.length] }} />
                    {ind.name}{isMain && ' (current)'}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />Failed to load data. Please try again.
          </div>
        )}

        {/* Main chart */}
        <AnimatePresence mode="wait">
          <motion.div key={`${selectedIndicatorId}-${JSON.stringify(currentParams)}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{firstSuccess?.indicator ?? indicator.name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{indicator.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {national != null && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      National: {fmtNum(national)}{unit === 'Percentage' ? '%' : ` ${unit}`}
                    </span>
                  )}
                  <div className="no-print">
                    <ChartTypeSelector value={chartType} onChange={setChartType} />
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-56 items-center justify-center">
                <div className="flex gap-1.5">{[0, 1, 2].map(i => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-rwanda-green" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
              </div>
            ) : (
              <ChartContainer
                data={provinceData}
                national={national}
                unit={unit}
                indicator={firstSuccess?.indicator ?? indicator.name}
                chartType={chartType}
                onSelect={(code, name) => setSelectedProvince(prev => prev === code ? null : code)}
                selected={selectedProvince}
              />
            )}

            {!isLoading && !selectedProvince && (
              <p className="mt-2 text-center text-xs text-slate-400">Click a province bar to see district-level breakdown</p>
            )}
            {!isLoading && selectedProvince && (
              <p className="mt-2 text-center text-xs text-slate-400">
                Showing {PROVINCES.find(p => p.code === selectedProvince)?.name} · Click again to deselect
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Multi-indicator grouped chart */}
        {compareMode && compareIndicators.size > 0 && compareGroupedData.length > 0 && (() => {
          const allIndIds = [selectedIndicatorId, ...compareIndicatorList.map(i => i.id)].filter(id => compareIndicators.has(id) || id === selectedIndicatorId)
          const allIndNames = allIndIds.map(id => chapter.indicators.find(i => i.id === id)?.name ?? id)
          return (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-green-200 bg-white p-6 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-slate-800">Indicator Comparison by Province</h3>
              <p className="text-xs text-slate-500 mb-4">Note: indicators may use different units/scales — check individual charts below.</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={compareGroupedData} margin={{ top: 8, right: 20, left: 10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={({ active, payload, label }: any) => {
                    if (!active || !payload) return null
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-sm">
                        <p className="font-semibold mb-1">{label}</p>
                        {payload.map((p: any) => <p key={p.dataKey} style={{ color: p.fill }}>{p.name}: <b>{p.value != null ? fmtNum(p.value) : 'N/A'}</b></p>)}
                      </div>
                    )
                  }} />
                  <Legend formatter={(v: string) => <span style={{ fontSize: 11, color: '#374151' }}>{v}</span>} />
                  {allIndIds.map((id, i) => (
                    <Bar key={id} dataKey={id} name={allIndNames[i]} fill={MULTI_IND_COLORS[i % MULTI_IND_COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={36} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )
        })()}

        {/* District breakdown chart */}
        {!isLoading && selectedProvince && districtChartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  District Breakdown · <span className="font-normal text-slate-500">{PROVINCES.find(p => p.code === selectedProvince)?.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{districtChartData.length} districts · {firstSuccess?.indicator ?? indicator.name}</p>
              </div>
              <div className="no-print">
                <ChartTypeSelector value={districtChartType} onChange={setDistrictChartType} />
              </div>
            </div>
            <ChartContainer
              data={districtChartData}
              national={national}
              unit={unit}
              indicator={firstSuccess?.indicator ?? indicator.name}
              chartType={districtChartType}
              height={districtChartData.length > 5 ? districtChartData.length * 44 : 280}
            />
          </motion.div>
        )}

        {/* Data table */}
        {!isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Data Table</h3>
              {!selectedProvince && (
                <p className="text-xs text-slate-400">Click a province in the chart to add district data</p>
              )}
            </div>
            <DataTable
              rows={tableRows}
              unit={unit}
              indicator={firstSuccess?.indicator ?? indicator.name}
            />
          </div>
        )}
      </div>
    </>
  )
}
