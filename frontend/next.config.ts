import type { NextConfig } from 'next'

const replitDomain = process.env.REPLIT_DEV_DOMAIN
const replitDomains = process.env.REPLIT_DOMAINS

const allowedOrigins: string[] = []
if (replitDomain) allowedOrigins.push(replitDomain)
if (replitDomains) {
  replitDomains.split(',').forEach((d) => allowedOrigins.push(d.trim()))
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ]
  },
  allowedDevOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
}

export default nextConfig
