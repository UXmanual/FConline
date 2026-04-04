import Image from 'next/image'
import logo from '@/components/icons/logo.svg'
import HomeStatusPanel from './HomeStatusPanel'
import HomeEventCarousel from './HomeEventCarousel'
import HomeTipsSection from './HomeTipsSection'
import HomeControllerUsageCard from './HomeControllerUsageCard'
import HomeCommunityCard from './HomeCommunityCard'
import HomeSettingsCard from './HomeSettingsCard'
import { getHomeControllerUsage, getHomeEvents } from './home-feed'

const version = process.env.NEXT_PUBLIC_APP_VERSION
const weekdayMap = ['일', '월', '화', '수', '목', '금', '토']

function getKoreaDateLabel() {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })

  const parts = formatter.formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const day = parts.find((part) => part.type === 'day')?.value ?? ''
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? ''
  const normalizedWeekday = weekdayMap[new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getDay()] ?? weekday

  return `${year}.${month}.${day} ${normalizedWeekday}`
}

export default async function HomePage() {
  const [events, controllerUsage] = await Promise.all([
    getHomeEvents(),
    getHomeControllerUsage(),
  ])
  const todayLabel = getKoreaDateLabel()

  return (
    <div className="space-y-4 pt-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex h-6 items-center gap-3">
          <Image
            src={logo}
            alt="FCO manual"
            priority
            className="h-6 w-auto"
          />
        </div>
        <span className="text-[13px] font-medium text-[#6b7280]">{todayLabel}</span>
      </header>

      <main className="space-y-3">
        <HomeStatusPanel />
        <HomeEventCarousel events={events} />
        <HomeTipsSection />
        {controllerUsage ? <HomeControllerUsageCard usage={controllerUsage} /> : null}
        <HomeCommunityCard />
        <HomeSettingsCard />
      </main>
    </div>
  )
}
