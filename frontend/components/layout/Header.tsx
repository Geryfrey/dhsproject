'use client'

import { Printer, Download } from 'lucide-react'

interface HeaderProps {
  title?: string
  subtitle?: string
  onPrint?: () => void
  onDownloadCSV?: () => void
}

export default function Header({ title, subtitle, onPrint, onDownloadCSV }: HeaderProps) {
  return (
    <header className="header-bar sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6 shadow-sm no-print">
      <div>
        {title ? (
          <>
            <h1 className="text-base font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </>
        ) : (
          <>
            <h1 className="text-base font-semibold text-slate-900">DHS Rwanda Analytics Dashboard</h1>
            <p className="text-xs text-slate-500">Demographic and Health Survey 2019–20 · NISR & ICF International</p>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onDownloadCSV && (
          <button
            onClick={onDownloadCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-smooth hover:bg-slate-50 hover:border-slate-300"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        )}
        <button
          onClick={onPrint ?? (() => window.print())}
          className="flex items-center gap-1.5 rounded-lg bg-rwanda-green px-3 py-1.5 text-xs font-medium text-white transition-smooth hover:bg-rwanda-green-dark"
        >
          <Printer className="h-3.5 w-3.5" />
          Print Report
        </button>
      </div>
    </header>
  )
}
