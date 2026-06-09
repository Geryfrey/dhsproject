'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  collapse: () => void
  expand: () => void
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  collapse: () => {},
  expand: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const collapse = useCallback(() => setCollapsed(true), [])
  const expand = useCallback(() => setCollapsed(false), [])

  return (
    <SidebarContext.Provider value={{ collapsed, collapse, expand }}>
      {children}
    </SidebarContext.Provider>
  )
}
