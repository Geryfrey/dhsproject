'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Users, Baby, HeartHandshake, Stethoscope,
  ShieldCheck, Apple, Bug, Activity, Scale, LayoutDashboard, GitCompare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHAPTERS } from '@/lib/chapters'

const iconMap: Record<string, React.ElementType> = {
  Home, Users, Baby, HeartHandshake, Stethoscope,
  ShieldCheck, Apple, Bug, Activity, Scale,
}

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/compare', label: 'Compare Regions', icon: GitCompare },
  ...CHAPTERS.map((c) => ({
    href: `/chapters/${c.slug}`,
    label: c.title,
    icon: iconMap[c.icon] || Home,
  })),
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar-container fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-rwanda-green shadow-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-green-700/50 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">DHS Rwanda</p>
          <p className="text-[11px] text-green-200/80">Analytics Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item, idx) => {
          const active = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          const Icon = item.icon
          const isCompare = item.href === '/compare'
          return (
            <div key={item.href}>
              {isCompare && (
                <div className="mx-3 my-1.5 h-px bg-green-700/40" />
              )}
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 mb-0.5 text-sm font-medium transition-smooth',
                  active
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-green-100/80 hover:bg-white/10 hover:text-white',
                  isCompare && !active && 'text-green-200 border border-green-600/30'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : isCompare ? 'text-green-300' : 'text-green-300')} />
                <span className="truncate">{item.label}</span>
                {isCompare && (
                  <span className="ml-auto rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-200">NEW</span>
                )}
              </Link>
              {isCompare && (
                <div className="mx-3 my-1.5 h-px bg-green-700/40" />
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-green-700/50 px-5 py-3">
        <p className="text-[11px] text-green-300/70">DHS Rwanda 2019–20</p>
        <p className="text-[11px] text-green-300/50">NISR · ICF International</p>
      </div>
    </aside>
  )
}
