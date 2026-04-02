'use client'

import { useEffect, useState } from 'react'
import { Cloud, CloudFog, CloudRain, CloudSnow, CloudSun, Moon, Sun } from '@phosphor-icons/react'

type WeatherBadgeState = {
  temperature: string
  code?: number
}

const SEOUL_COORDS = { latitude: 37.5665, longitude: 126.978 }
const TEMPERATURE_LABEL = '\uD604\uC7AC \uAE30\uC628'

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

function WeatherIcon({ code, isDay }: { code?: number; isDay?: boolean }) {
  if (code === 0) {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        {isDay ? (
          <Sun className="weather-icon-spin h-5 w-5 text-[#f59e0b]" weight="fill" />
        ) : (
          <Moon className="weather-icon-float h-5 w-5 text-[#6366f1]" weight="fill" />
        )}
      </span>
    )
  }

  if (code === 1 || code === 2) {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <CloudSun className="weather-icon-float h-5 w-5 text-[#f59e0b]" weight="fill" />
      </span>
    )
  }

  if (code === 3) {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <Cloud className="weather-icon-drift h-5 w-5 text-[#60a5fa]" weight="fill" />
      </span>
    )
  }

  if (code === 45 || code === 48) {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <CloudFog className="weather-icon-fade h-5 w-5 text-[#94a3b8]" weight="fill" />
      </span>
    )
  }

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(code ?? -1)) {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <CloudRain className="h-5 w-5 text-[#3b82f6]" weight="fill" />
        <span className="weather-rain-drop absolute bottom-0 left-[8px] h-[5px] w-[1.5px] rounded-full bg-[#38bdf8]" />
        <span className="weather-rain-drop weather-rain-drop-delay absolute bottom-0 left-[13px] h-[6px] w-[1.5px] rounded-full bg-[#0ea5e9]" />
      </span>
    )
  }

  if ([71, 73, 75].includes(code ?? -1)) {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <CloudSnow className="h-5 w-5 text-[#60a5fa]" weight="fill" />
        <span className="weather-snow-dot absolute bottom-[1px] left-[8px] h-[2.5px] w-[2.5px] rounded-full bg-white shadow-[0_0_0_1px_rgba(147,197,253,0.7)]" />
        <span className="weather-snow-dot weather-snow-dot-delay absolute bottom-[1px] left-[13px] h-[2.5px] w-[2.5px] rounded-full bg-white shadow-[0_0_0_1px_rgba(147,197,253,0.7)]" />
      </span>
    )
  }

  return (
    <span className="relative flex h-6 w-6 items-center justify-center">
      <Cloud className="weather-icon-drift h-5 w-5 text-[#60a5fa]" weight="fill" />
    </span>
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
              ? `${Math.round(data.current.temperature_2m)}C`
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
      className="flex items-center gap-1.5 text-sm font-semibold text-[#111827]"
      aria-label={`${TEMPERATURE_LABEL} ${weather.temperature}`}
    >
      <WeatherIcon code={weather.code} isDay={isDay} />
      <span>{weather.temperature}</span>
    </div>
  )
}
