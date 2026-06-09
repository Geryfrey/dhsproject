import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import QueryProvider from '@/components/QueryProvider'

export const metadata: Metadata = {
  title: 'DHS Rwanda Analytics Dashboard',
  description: 'Demographic and Health Survey Rwanda 2019-20 — interactive analytics dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="main-content ml-64 flex-1 flex flex-col min-h-screen">
              {children}
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  )
}
