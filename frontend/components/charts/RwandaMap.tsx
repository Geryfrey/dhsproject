'use client'

import { useState } from 'react'
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

const PROVINCE_PATHS: { code: number; name: string; path: string; labelX: number; labelY: number }[] = [
  {
    code: 4,
    name: 'Northern Province',
    path: 'M 105,8 L 315,28 L 280,105 L 205,98 L 155,92 L 115,75 Z',
    labelX: 200,
    labelY: 58,
  },
  {
    code: 3,
    name: 'Western Province',
    path: 'M 12,135 L 105,8 L 155,92 L 145,195 L 92,272 L 62,302 Z',
    labelX: 68,
    labelY: 165,
  },
  {
    code: 1,
    name: 'Kigali City',
    path: 'M 155,92 L 205,98 L 210,148 L 158,148 Z',
    labelX: 183,
    labelY: 122,
  },
  {
    code: 2,
    name: 'Southern Province',
    path: 'M 62,302 L 92,272 L 145,195 L 158,148 L 210,148 L 215,210 L 198,305 Z',
    labelX: 132,
    labelY: 242,
  },
  {
    code: 5,
    name: 'Eastern Province',
    path: 'M 205,98 L 280,105 L 315,28 L 392,162 L 328,312 L 198,305 L 215,210 L 210,148 Z',
    labelX: 278,
    labelY: 205,
  },
]

function getIntensityColor(value: number | null, allValues: number[], selected: boolean): string {
  if (value == null) return selected ? '#0D2550' : '#CBD5E1'
  const valid = allValues.filter(v => v != null) as number[]
  if (valid.length === 0) return '#93C5FD'
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1
  const pct = (value - min) / range

  if (selected) {
    return '#0D2550'
  }

  if (pct < 0.2) return '#BFDBFE'
  if (pct < 0.4) return '#93C5FD'
  if (pct < 0.6) return '#60A5FA'
  if (pct < 0.8) return '#3B82F6'
  return '#1D4ED8'
}

export default function RwandaMap({ data, unit, national, onSelect, selected }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const allValues = data.map(d => d.value).filter(v => v != null) as number[]
  const fmt = (v: number) => unit === 'Percentage' ? `${fmtNum(v)}%` : fmtNum(v)

  const hoveredProvince = hovered != null ? data.find(d => d.code === hovered) : null

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full" style={{ maxWidth: 420 }}>
        <svg
          viewBox="0 0 404 320"
          className="w-full drop-shadow-sm"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}
        >
          {PROVINCE_PATHS.map(prov => {
            const provData = data.find(d => d.code === prov.code)
            const value = provData?.value ?? null
            const isSelected = selected === prov.code
            const isHovered = hovered === prov.code
            const fill = getIntensityColor(value, allValues, isSelected)
            const textColor = (isSelected || (value != null && allValues.length > 0 && (value - Math.min(...allValues)) / (Math.max(...allValues) - Math.min(...allValues) || 1) > 0.5)) ? 'white' : '#1e3a5f'

            return (
              <g
                key={prov.code}
                onClick={() => onSelect?.(prov.code, prov.name)}
                onMouseEnter={() => setHovered(prov.code)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              >
                <path
                  d={prov.path}
                  fill={fill}
                  stroke="white"
                  strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                  style={{
                    transition: 'all 0.2s ease',
                    opacity: selected && !isSelected ? 0.55 : 1,
                    filter: isHovered ? 'brightness(1.15)' : 'none',
                  }}
                />
                {prov.code !== 1 && (
                  <text
                    x={prov.labelX}
                    y={prov.labelY - 6}
                    textAnchor="middle"
                    fontSize={prov.code === 5 ? 11 : 10}
                    fontWeight="600"
                    fill={textColor}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {prov.name.replace(' Province', '')}
                  </text>
                )}
                {prov.code === 1 && (
                  <text
                    x={prov.labelX}
                    y={prov.labelY - 4}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight="700"
                    fill={textColor}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    Kigali
                  </text>
                )}
                {value != null && (
                  <text
                    x={prov.labelX}
                    y={prov.labelY + (prov.code === 1 ? 8 : 10)}
                    textAnchor="middle"
                    fontSize={prov.code === 1 ? 8 : 11}
                    fontWeight="700"
                    fill={textColor}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {fmt(value)}
                  </text>
                )}
                {value == null && (
                  <text
                    x={prov.labelX}
                    y={prov.labelY + 10}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#94a3b8"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    —
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {hoveredProvince && hoveredProvince.value != null && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs text-center">
            <p className="font-semibold text-slate-800">{hoveredProvince.name}</p>
            <p className="text-nisr-navy font-bold">{fmt(hoveredProvince.value)}</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex w-full max-w-xs items-center gap-2">
        <span className="text-[10px] text-slate-400">Low</span>
        <div className="flex flex-1 h-2.5 rounded-full overflow-hidden">
          {['#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#1D4ED8'].map(c => (
            <div key={c} className="flex-1 h-full" style={{ background: c }} />
          ))}
        </div>
        <span className="text-[10px] text-slate-400">High</span>
      </div>
      {national != null && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          National average: <span className="font-semibold text-red-600">{fmt(national)}</span>
        </p>
      )}
      {onSelect && (
        <p className="mt-1 text-[10px] text-slate-400">Click a province to see district breakdown</p>
      )}
    </div>
  )
}
