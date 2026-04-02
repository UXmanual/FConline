import Image from 'next/image'
import logo from '@/components/icons/logo.svg'
import HomeStatusPanel from './HomeStatusPanel'
import HomeEventCarousel from './HomeEventCarousel'
import HomeWeatherBadge from './HomeWeatherBadge'
import { getHomeEvents } from './home-feed'

const version = process.env.NEXT_PUBLIC_APP_VERSION

export default async function HomePage() {
  const events = await getHomeEvents()

  return (
    <div className="space-y-4 pt-5">
      <header className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <Image
            src={logo}
            alt="FCO manual"
            priority
            className="h-8 w-auto"
          />
          {version && <span className="font-mono text-[11px] text-[#6b7280]">v{version}</span>}
        </div>
        <HomeWeatherBadge />
      </header>

      <main className="space-y-8">
        <HomeStatusPanel />
        <HomeEventCarousel events={events} />
      </main>
    </div>
  )
}
