'use client'
import { useEffect, useState } from 'react'
import { Droplets, Thermometer, Wind, Sun, Cloud, CloudRain, Waves, Navigation } from 'lucide-react'
import { solunarRatingColor, type MoonData } from '@/lib/moonphase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Weather {
  tempF?: number
  feelsLikeF?: number
  tempLowF?: number
  cloudCoverPct?: number
  windMph?: number
  windDirection?: number      // degrees, 0 = N
  precipitation?: number
  skyCondition?: string
  timeOfDay?: string
  season?: string
  weatherDesc?: string
  moon?: MoonData
  forecastDate?: string
}

interface Props {
  weather: Weather
  waterTempF: number | null
  waterTempSource: 'measured' | 'estimated' | null
  lakeId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
function toCompass(deg: number) { return COMPASS[Math.round(deg / 22.5) % 16] }

// Icon rotates to show the direction wind is flowing TOWARD (from deg + 180)
function windIconDeg(fromDeg: number) { return (fromDeg + 180) % 360 }

function tempColor(f: number) {
  if (f < 50) return 'text-blue-500'
  if (f < 65) return 'text-sky-500'
  if (f < 80) return 'text-emerald-600'
  if (f < 90) return 'text-orange-500'
  return 'text-red-500'
}

function skyIcon(condition: string) {
  if (condition?.includes('rain')) return <CloudRain size={15} className="text-blue-400" />
  if (condition?.includes('overcast') || condition?.includes('cloud')) return <Cloud size={15} className="text-slate-400" />
  return <Sun size={15} className="text-yellow-500" />
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, icon, children, className = '' }: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ConditionsPanel({ weather, waterTempF, waterTempSource, lakeId }: Props) {
  const [lakeLevel, setLakeLevel] = useState<any>(null)
  const moon = weather.moon
  const isForecast = !!weather.forecastDate

  useEffect(() => {
    if (!lakeId) return
    fetch(`/api/lake-conditions?lakeId=${lakeId}`)
      .then(r => r.json())
      .then(d => setLakeLevel(d?.conditions?.waterLevel ?? null))
      .catch(() => {})
  }, [lakeId])

  const formattedDate = weather.forecastDate
    ? new Date(weather.forecastDate + 'T12:00:00Z').toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
      })
    : null

  const solunarColors = moon ? solunarRatingColor(moon.solunarRating) : ''

  return (
    <div className="space-y-3">

      {/* Forecast badge */}
      {isForecast && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-full uppercase tracking-wide">
            Trip Forecast
          </span>
          <span className="text-sm font-semibold text-purple-800">{formattedDate}</span>
          {weather.timeOfDay && (
            <span className="text-xs text-purple-600 capitalize font-medium">· {weather.timeOfDay}</span>
          )}
        </div>
      )}

      {/* Metric grid — 4 core cards + solunar + lake level */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* ── Water Temp ── */}
        <MetricCard label="Water Temp" icon={<Droplets size={11} className="text-cyan-500" />}>
          {waterTempF != null ? (
            <>
              <p className="text-2xl font-extrabold text-cyan-600 leading-none">{waterTempF}°F</p>
              <p className="text-[11px] text-slate-400 font-medium">
                {waterTempSource === 'measured'
                  ? 'Live sensor'
                  : waterTempSource === 'estimated'
                  ? '~Estimated ±5°F'
                  : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400 italic">Unavailable</p>
          )}
        </MetricCard>

        {/* ── Air Temp ── */}
        <MetricCard
          label={isForecast ? 'Forecast High' : 'Air Temp'}
          icon={<Thermometer size={11} className="text-orange-400" />}
        >
          <p className={`text-2xl font-extrabold leading-none ${weather.tempF ? tempColor(weather.tempF) : 'text-slate-700'}`}>
            {weather.tempF}°F
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            {isForecast && weather.tempLowF != null
              ? `Low ${weather.tempLowF}°F`
              : weather.feelsLikeF != null
              ? `Feels like ${weather.feelsLikeF}°F`
              : weather.season
              ? `${weather.season.charAt(0).toUpperCase() + weather.season.slice(1)}`
              : ''}
            {!isForecast && weather.timeOfDay
              ? (weather.feelsLikeF != null ? ` · ${weather.timeOfDay}` : weather.timeOfDay)
              : ''}
          </p>
        </MetricCard>

        {/* ── Wind ── */}
        <MetricCard label="Wind" icon={<Wind size={11} className="text-slate-400" />}>
          <div className="flex items-end gap-2">
            <p className={`text-2xl font-extrabold leading-none ${(weather.windMph ?? 0) >= 15 ? 'text-amber-500' : 'text-slate-800'}`}>
              {weather.windMph ?? '—'}
            </p>
            <p className="text-sm font-semibold text-slate-500 mb-0.5">mph</p>
            {weather.windDirection != null && (
              <div
                className="mb-0.5 text-blue-400"
                style={{ transform: `rotate(${windIconDeg(weather.windDirection)}deg)` }}
              >
                <Navigation size={14} fill="currentColor" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {weather.windDirection != null
              ? `from ${toCompass(weather.windDirection)}`
              : ''}
          </p>
        </MetricCard>

        {/* ── Sky ── */}
        <MetricCard label="Sky" icon={skyIcon(weather.skyCondition ?? '')}>
          <p className="text-base font-bold text-slate-800 capitalize leading-tight">
            {weather.skyCondition ?? '—'}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            {weather.cloudCoverPct != null ? `${weather.cloudCoverPct}% cloud cover` : ''}
            {(weather.precipitation ?? 0) > 0
              ? ` · ${weather.precipitation}mm rain`
              : ''}
          </p>
        </MetricCard>

        {/* ── Solunar + Bite Windows ── */}
        {moon && (
          <MetricCard
            label="Solunar"
            icon={<span className="text-[11px]">{moon.emoji}</span>}
            className="sm:col-span-2"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: rating + moon phase */}
              <div className="flex-1 min-w-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${solunarColors}`}>
                  {moon.solunarLabel}
                </span>
                <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                  {moon.emoji} {moon.phase} · {moon.illumination}% illuminated
                </p>
              </div>
              {/* Right: bite windows */}
              <div className="text-right shrink-0">
                {moon.majorPeriods.length > 0 && (
                  <div className="mb-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Major</p>
                    {moon.majorPeriods.map((p, i) => (
                      <p key={i} className="text-[11px] font-semibold text-green-600">{p}</p>
                    ))}
                  </div>
                )}
                {moon.minorPeriods.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Minor</p>
                    {moon.minorPeriods.map((p, i) => (
                      <p key={i} className="text-[11px] font-medium text-blue-500">{p}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </MetricCard>
        )}

        {/* ── Lake Level ── */}
        {lakeLevel && (
          <MetricCard
            label="Water Level"
            icon={<Waves size={11} className={
              lakeLevel.trend === 'rising' ? 'text-green-500' :
              lakeLevel.trend === 'falling' ? 'text-red-400' : 'text-slate-400'
            } />}
            className="sm:col-span-2"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: elevation + trend */}
              <div className="flex-1 min-w-0">
                <div className="flex items-end gap-1.5">
                  <p className="text-2xl font-extrabold text-slate-800 leading-none">
                    {lakeLevel.valueFt.toLocaleString()}
                  </p>
                  <p className="text-sm font-semibold text-slate-400 mb-0.5">ft</p>
                  <p className={`text-lg font-bold mb-0.5 ${
                    lakeLevel.trend === 'rising' ? 'text-green-500' :
                    lakeLevel.trend === 'falling' ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {lakeLevel.trend === 'rising' ? '↑' : lakeLevel.trend === 'falling' ? '↓' : '—'}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {lakeLevel.deltaFt != null
                    ? `${lakeLevel.deltaFt >= 0 ? '+' : ''}${lakeLevel.deltaFt.toFixed(2)} ft / 24h`
                    : ''}
                  {lakeLevel.abovePoolFt != null && lakeLevel.abovePoolFt !== 0
                    ? ` · ${lakeLevel.abovePoolFt >= 0 ? '+' : ''}${lakeLevel.abovePoolFt.toFixed(2)} ft vs. pool`
                    : ''}
                </p>
              </div>
              {/* Right: % full + bar */}
              {lakeLevel.percentFull != null && lakeLevel.percentFull > 0 && (
                <div className="shrink-0 w-24">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pool Capacity</p>
                  <p className="text-base font-bold text-slate-700">{lakeLevel.percentFull}%</p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        lakeLevel.percentFull >= 90 ? 'bg-green-400' :
                        lakeLevel.percentFull >= 70 ? 'bg-blue-400' :
                        lakeLevel.percentFull >= 50 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, lakeLevel.percentFull))}%` }}
                    />
                  </div>
                  {lakeLevel.date && (
                    <p className="text-[10px] text-slate-400 mt-1">as of {lakeLevel.date}</p>
                  )}
                </div>
              )}
            </div>
          </MetricCard>
        )}

      </div>
    </div>
  )
}
