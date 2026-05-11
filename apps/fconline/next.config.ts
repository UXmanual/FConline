import type { NextConfig } from 'next'
import pkg from './package.json'

const CORS_HEADERS = [
  { key: 'Access-Control-Allow-Origin', value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
]

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', '172.30.1.62', '192.168.29.109'],
  async headers() {
    return [
      { source: '/api/:path*', headers: CORS_HEADERS },
      { source: '/banners/:path*', headers: CORS_HEADERS },
    ]
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kjucaqjnqastmljxysxn.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'storage.nexon.com',
      },
      {
        protocol: 'https',
        hostname: 'file.nexon.com',
      },
      {
        protocol: 'https',
        hostname: 'ssl.nexon.com',
      },
      {
        protocol: 'https',
        hostname: 'fco.dn.nexoncdn.co.kr',
      },
    ],
  },
}

export default nextConfig;
