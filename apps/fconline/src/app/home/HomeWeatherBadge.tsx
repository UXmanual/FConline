'use client'

import { useEffect, useState } from 'react'

type WeatherBadgeState = {
  temperature: string
  code?: number
}

const SEOUL_COORDS = { latitude: 37.5665, longitude: 126.978 }
const TEMPERATURE_LABEL = '현재 기온'

async function fetchWeather(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,is_day',
    timezone: 'Asia/Seoul',
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error('weather fetch failed')
    }

    return (await res.json()) as {
      current?: {
        temperature_2m?: number
        weather_code?: number
        is_day?: number
      }
    }
  } finally {
    clearTimeout(timer)
  }
}

function getWeatherIcon(code: number | undefined, isDay: boolean) {
  if (code === 0) {
    return {
      src: isDay ? '/weather-icons/clear-day.svg' : '/weather-icons/clear-night.svg',
      className: isDay ? 'weather-meteocon weather-meteocon-sun' : 'weather-meteocon weather-meteocon-night',
    }
  }

  if (code === 1 || code === 2) {
    return {
      src: isDay ? '/weather-icons/partly-cloudy-day.svg' : '/weather-icons/partly-cloudy-night.svg',
      className: 'weather-meteocon',
    }
  }

  if (code === 3) {
    return { src: '/weather-icons/cloudy.svg', className: 'weather-meteocon' }
  }

  if (code === 45 || code === 48) {
    return { src: '/weather-icons/fog.svg', className: 'weather-meteocon weather-meteocon-fog' }
  }

  if ([95].includes(code ?? -1)) {
    return { src: '/weather-icons/thunderstorms.svg', className: 'weather-meteocon weather-meteocon-rain' }
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) {
    return { src: '/weather-icons/rain.svg', className: 'weather-meteocon weather-meteocon-rain' }
  }

  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) {
    return { src: '/weather-icons/snow.svg', className: 'weather-meteocon weather-meteocon-snow' }
  }

  return { src: '/weather-icons/cloudy.svg', className: 'weather-meteocon' }
}

function WeatherIcon({ code, isDay }: { code?: number; isDay: boolean }) {
  const { src, className } = getWeatherIcon(code, isDay)

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`h-8 w-8 shrink-0 object-contain ${className}`}
      draggable={false}
    />
  )
}

export default function HomeWeatherBadge() {
  const [weather, setWeather] = useState<WeatherBadgeState>({ temperature: '--' })
  const [isDay, setIsDay] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    const applyWeather = async (latitude: number, longitude: number, hideLoading = false) => {
      try {
        const data = await fetchWeather(latitude, longitude)
        if (!alive) {
          return
        }

        setWeather({
          temperature:
            typeof data.current?.temperature_2m === 'number'
              ? `${Math.round(data.current.temperature_2m)}°C`
              : '--',
          code: data.current?.weather_code,
        })
        setIsDay(data.current?.is_day !== 0)
      } catch {
        if (!alive) {
          return
        }
      } finally {
        if (alive && hideLoading) {
          setLoading(false)
        }
      }
    }

    void applyWeather(SEOUL_COORDS.latitude, SEOUL_COORDS.longitude, true)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void applyWeather(position.coords.latitude, position.coords.longitude)
        },
        () => {},
        { timeout: 5000, maximumAge: 600000 },
      )
    }

    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-6 w-6 animate-pulse rounded-full bg-[#eef2f6]" />
        <span className="h-4 w-9 animate-pulse rounded-full bg-[#eef2f6]" />
      </div>
    )
  }

  return (
    <div
      className="flex min-h-8 items-center gap-1.5 text-sm font-semibold leading-none text-[#111827]"
      aria-label={`${TEMPERATURE_LABEL} ${weather.temperature}`}
    >
      <WeatherIcon code={weather.code} isDay={isDay} />
      <span className="tracking-[-0.02em]">{weather.temperature}</span>
    </div>
  )
}
