import type { NextConfig } from 'next'
import pkg from './package.json'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', '172.30.1.62'],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.nexon.com',
      },
      {
        protocol: 'https',
        hostname: 'file.nexon.com',
      },
    ],
  },
}

export default nextConfig;
