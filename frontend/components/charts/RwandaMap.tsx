'use client'

import { useState, useEffect, useMemo } from 'react'
import { fmtNum } from '@/lib/utils'

interface ProvinceData {
  name: string
  code: number
  value: number | null
}

interface Props {
  data: ProvinceData[]
  unit: string
  national?: number | null
  onSelect?: (code: number, name: string) => void
  selected?: number | null
}

const DISTRICT_PROVINCE: Record<string, number> = {
  'Nyarugenge': 1, 'Gasabo': 1, 'Kicukiro': 1,
  'Nyanza': 2, 'Gisagara': 2, 'Nyaruguru': 2, 'Huye': 2, 'Nyamagabe': 2,
  'Ruhango': 2, 'Muhanga': 2, 'Kamonyi': 2,
  'Karongi': 3, 'Rutsiro': 3, 'Rubavu': 3, 'Nyabihu': 3,
  'Ngororero': 3, 'Rusizi': 3, 'Nyamasheke': 3,
  'Rulindo': 4, 'Gakenke': 4, 'Musanze': 4, 'Burera': 4, 'Gicumbi': 4,
  'Rwamagana': 5, 'Nyagatare': 5, 'Gatsibo': 5, 'Kayonza': 5,
  'Kirehe': 5, 'Ngoma': 5, 'Bugesera': 5,
}

const PROVINCE_NAMES: Record<number, string> = {
  1: 'Kigali City',
  2: 'Southern Province',
  3: 'Western Province',
  4: 'Northern Province',
  5: 'Eastern Province',
}

const NISR_SCALE = ['#C7D9F0', '#8FB8E0', '#5590C8', '#2D6AAE', '#1B3C74']

function getColor(value: number | null, allValues: number[], selected: boolean): string {
  if (selected) return '#0D2550'
  if (value == null) return '#CBD5E1'
  const valid = allValues.filter((v): v is number => v != null)
  if (valid.length === 0) return NISR_SCALE[0]
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1
  const pct = (value - min) / range
  if (pct < 0.2) return NISR_SCALE[0]
  if (pct < 0.4) return NISR_SCALE[1]
  if (pct < 0.6) return NISR_SCALE[2]
  if (pct < 0.8) return NISR_SCALE[3]
  return NISR_SCALE[4]
}

function ringToPath(
  ring: [number, number][],
  minLon: number, maxLon: number,
  minLat: number, maxLat: number,
  W: number, H: number
): string {
  return ring
    .map(([lon, lat], i) => {
      const x = ((lon - minLon) / (maxLon - minLon)) * W
      const y = ((maxLat - lat) / (maxLat - minLat)) * H
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ') + ' Z'
}

const W = 500
const H = 440

export default function RwandaMap({ data, unit, national, onSelect, selected }: Props) {
  const [geojson, setGeojson] = useState<any>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    fetch('/rwanda-districts.geojson')
      .then(r => r.json())
      .then(setGeojson)
      .catch(() => {})
  }, [])

  const allValues = data.map(d => d.value).filter((v): v is number => v != null)
  const fmt = (v: number) => unit === 'Percentage' ? `${fmtNum(v)}%` : fmtNum(v)

  const { districtPaths } = useMemo(() => {
    if (!geojson) return { districtPaths: [] }

    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity
    geojson.features.forEach((f: any) => {
      const scan = (ring: [number, number][]) => ring.forEach(([lon, lat]) => {
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      })
      if (f.geometry.type === 'Polygon') f.geometry.coordinates.forEach(scan)
      else if (f.geometry.type === 'MultiPolygon') f.geometry.coordinates.forEach((p: any) => p.forEach(scan))
    })

    const districtPaths = geojson.features.map((f: any) => {
      const name: string = f.properties.shapeName
      const provCode = DISTRICT_PROVINCE[name] ?? 0
      let pathStr = ''
      if (f.geometry.type === 'Polygon') {
        pathStr = ringToPath(f.geometry.coordinates[0], minLon, maxLon, minLat, maxLat, W, H)
      } else if (f.geometry.type === 'MultiPolygon') {
        pathStr = f.geometry.coordinates
          .map((poly: any) => ringToPath(poly[0], minLon, maxLon, minLat, maxLat, W, H))
          .join(' ')
      }
      return { name, provCode, pathStr }
    })

    return { districtPaths }
  }, [geojson])

  const hoveredProv = hovered != null ? data.find(d => d.code === hovered) : null

  if (!geojson) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-nisr-navy"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}>
          {districtPaths.map(({ name, provCode, pathStr }) => {
            const provData = data.find(d => d.code === provCode)
            const value = provData?.value ?? null
            const isSelected = selected === provCode
            const isHovered = hovered === provCode
            const fill = getColor(value, allValues, isSelected)

            return (
              <path
                key={name}
                d={pathStr}
                fill={fill}
                stroke="white"
                strokeWidth={0.7}
                style={{
                  cursor: onSelect && provCode ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  opacity: selected && !isSelected ? 0.55 : 1,
                  filter: isHovered ? 'brightness(1.12)' : 'none',
                }}
                onClick={() => provCode && onSelect?.(provCode, PROVINCE_NAMES[provCode] ?? name)}
                onMouseEnter={() => provCode && setHovered(provCode)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}
        </svg>

        {hoveredProv && hoveredProv.value != null && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs text-center whitespace-nowrap">
            <p className="font-semibold text-slate-800">{hoveredProv.name}</p>
            <p className="font-bold text-nisr-navy">{fmt(hoveredProv.value)}</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex w-full max-w-xs items-center gap-2">
        <span className="text-[10px] text-slate-400">Low</span>
        <div className="flex flex-1 h-2.5 rounded-full overflow-hidden">
          {NISR_SCALE.map(c => (
            <div key={c} className="flex-1 h-full" style={{ background: c }} />
          ))}
        </div>
        <span className="text-[10px] text-slate-400">High</span>
      </div>
      {national != null && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          National average: <span className="font-semibold text-nisr-navy">{fmt(national)}</span>
        </p>
      )}
      {onSelect && (
        <p className="mt-1 text-[10px] text-slate-400">Click a province to see district breakdown</p>
      )}
    </div>
  )
}
