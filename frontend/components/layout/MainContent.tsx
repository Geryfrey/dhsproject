'use client'

import { useSidebar } from './SidebarContext'

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed, collapse, expand } = useSidebar()

  return (
    <div
      className="main-content flex-1 flex flex-col min-h-screen"
      style={{ marginLeft: collapsed ? '64px' : '256px' }}
      onMouseEnter={collapse}
      onMouseLeave={expand}
    >
      {children}
    </div>
  )
}
