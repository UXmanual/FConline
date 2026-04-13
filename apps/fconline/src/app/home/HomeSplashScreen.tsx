import Image from 'next/image'
import darkLogo from '@/components/icons/logo-dark.svg'

type Props = {
  className?: string
  logoClassName?: string
}

export default function HomeSplashScreen({ className, logoClassName }: Props) {
  return (
    <div
      className={`fixed inset-0 z-[120] ${className ?? ''}`.trim()}
      style={{ backgroundColor: '#121318' }}
      role="status"
      aria-label="홈 화면 불러오는 중"
    >
      <div className="mx-auto flex min-h-[100dvh] w-full items-center justify-center px-5 sm:max-w-[480px]">
        <Image
          src={darkLogo}
          alt="FCO Ground"
          priority
          className={`h-8 w-auto ${logoClassName ?? ''}`.trim()}
        />
      </div>
    </div>
  )
}
