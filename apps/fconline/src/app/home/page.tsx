import { SITE_NAME, SITE_SHORT_NAME, SITE_URL } from '@/lib/site'
import HomeStatusPanel from './HomeStatusPanel'
import HomeEventCarousel from './HomeEventCarousel'
import HomeControllerUsageCard from './HomeControllerUsageCard'
import HomeCommunityCard from './HomeCommunityCard'
import HomeSettingsCard from './HomeSettingsCard'
import HomeLogo from './HomeLogo'
import HomeNotificationsButton from './HomeNotificationsButton'
import HomePageClient from './HomePageClient'
import { getHomeControllerUsage, getHomeEvents } from './home-feed'

export const revalidate = 60

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
  const bodyStyle = { color: 'var(--app-body-text)' }

  return (
    <HomePageClient>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            alternateName: [SITE_SHORT_NAME, 'FCOnline Ground', 'fconlineground.com'],
            url: `${SITE_URL}/`,
          }),
        }}
      />
      <div className="space-y-4 pt-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex h-6 items-center gap-3">
            <HomeLogo />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium" style={bodyStyle}>{todayLabel}</span>
            <HomeNotificationsButton />
          </div>
        </header>

        <main className="space-y-3">
          <HomeStatusPanel />
          <HomeEventCarousel events={events} />
          <HomeControllerUsageCard usage={controllerUsage} />
          <HomeCommunityCard />
          <HomeSettingsCard />
        </main>
      </div>
    </HomePageClient>
  )
}
