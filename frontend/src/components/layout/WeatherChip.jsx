import { useEffect, useState } from 'react'

const CACHE_KEY = 'gns_weather_v1'
const MAX_AGE = 20 * 60 * 1000

function condition(code) {
  if (code === 0) return ['☀', 'Clear']
  if (code <= 3) return ['◑', 'Cloudy']
  if (code <= 67) return ['☂', 'Rain']
  if (code <= 77) return ['❄', 'Snow']
  if (code <= 82) return ['☂', 'Showers']
  return ['ϟ', 'Storm']
}

export default function WeatherChip() {
  const [weather, setWeather] = useState(null)
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
      if (cached && Date.now() - cached.savedAt < MAX_AGE) setWeather(cached)
    } catch { /* ignore invalid cache */ }
  }, [])

  function locate() {
    if (!navigator.geolocation) return setStatus('unavailable')
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const url = new URL('https://api.open-meteo.com/v1/forecast')
        url.search = new URLSearchParams({
          latitude: coords.latitude,
          longitude: coords.longitude,
          current: 'temperature_2m,weather_code',
          timezone: 'auto',
        })
        const response = await fetch(url)
        if (!response.ok) throw new Error('Weather unavailable')
        const data = await response.json()
        const next = {
          temperature: Math.round(data.current.temperature_2m),
          code: data.current.weather_code,
          savedAt: Date.now(),
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(next))
        setWeather(next)
        setStatus('ready')
      } catch {
        setStatus('unavailable')
      }
    }, () => setStatus('denied'), { enableHighAccuracy: false, timeout: 9000, maximumAge: 10 * 60 * 1000 })
  }

  const [icon, label] = weather ? condition(weather.code) : ['⌖', 'Weather']
  const unavailable = status === 'denied' || status === 'unavailable'
  return (
    <button type="button" onClick={locate} disabled={status === 'loading'}
      title={unavailable ? 'Weather unavailable — tap to try again' : weather ? `${label}. Tap to refresh local weather` : 'Show weather for your current location'}
      className="hidden h-9 items-center gap-1.5 rounded-xl border border-[#dce6de] bg-[#f5f7f5] px-2.5 text-xs font-extrabold text-[#176b45] transition hover:-translate-y-0.5 hover:border-[#aac7b5] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176b45]/30 md:flex">
      <span aria-hidden="true">{status === 'loading' ? '···' : icon}</span>
      <span>{weather ? `${weather.temperature}° ${label}` : unavailable ? 'Weather' : 'Weather'}</span>
    </button>
  )
}
