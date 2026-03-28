'use client'
import { useEffect, useState } from 'react'
import { Waves, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react'

interface LakeLevelProps {
  lakeId: string
  lakeName: string
}

export function LakeLevel({ lakeId, lakeName }: LakeLevelProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    fetch(`/api/lake-conditions?lakeId=${lakeId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [lakeId])

  const wl = data?.conditions?.waterLevel

  // Don't render anything if we know there's no data
  if (!loading && !wl) return null

  const trendColor   = wl?.trend === 'rising' ? 'text-green-400' : wl?.trend === 'falling' ? 'text-red-400' : 'text-slate-400'
  const trendBorder  = wl?.trend === 'rising' ? 'border-green-500/40 bg-green-950/30 text-green-300' : wl?.trend === 'falling' ? 'border-red-500/40 bg-red-950/30 text-red-300' : 'border-slate-600 bg-slate-800 text-slate-300'
  const TrendIcon    = wl?.trend === 'rising' ? TrendingUp : wl?.trend === 'falling' ? TrendingDown : Minus
  const trendLabel   = wl?.trend === 'rising' ? 'Rising' : wl?.trend === 'falling' ? 'Falling' : 'Stable'

  return (
    <div className="space-y-2">
      {/* Pill row — matches WeatherBar style */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 rounded-lg px-4 py-2.5 border bg-slate-50 border-slate-200">
        <Waves size={14} className="text-blue-500 shrink-0" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lake Level</span>

        {loading ? (
          <div className="h-3 bg-slate-200 rounded-full w-24 animate-pulse" />
        ) : wl ? (
          <>
            <span className="text-slate-300">·</span>
            <button
              onClick={() => setExpanded(o => !o)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border transition-colors ${trendBorder}`}
            >
              <TrendIcon size={11} />
              <span>{wl.valueFt.toLocaleString()} ft</span>
              <span className="opacity-60">· {wl.percentFull}% full</span>
              <ChevronDown size={11} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </>
        ) : null}
      </div>

      {/* Expanded detail panel — matches Moon Phase solunar panel styling */}
      {wl && expanded && (
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Current level */}
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Current Level</p>
            <p className="font-bold text-lg">{wl.valueFt.toLocaleString()} <span className="text-slate-400 text-xs font-normal">ft</span></p>
            {wl.date && <p className="text-slate-500 mt-0.5">as of {wl.date}</p>}
          </div>

          {/* Trend */}
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Trend</p>
            <p className={`font-bold flex items-center gap-1 ${trendColor}`}>
              <TrendIcon size={13} />
              {trendLabel}
            </p>
            <p className="text-slate-300 mt-0.5">
              {wl.deltaFt >= 0 ? '+' : ''}{wl.deltaFt?.toFixed(2)} ft / 24h
            </p>
          </div>

          {/* Pool status */}
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Pool Status</p>
            <p className="font-bold">{wl.percentFull}% full</p>
            {wl.abovePoolFt !== undefined && wl.abovePoolFt !== 0 && (
              <p className={`mt-0.5 ${wl.abovePoolFt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {wl.abovePoolFt >= 0 ? '+' : ''}{wl.abovePoolFt.toFixed(2)} ft vs. pool
              </p>
            )}
          </div>

          {/* Fill bar */}
          <div>
            <p className="text-slate-400 uppercase tracking-wider font-semibold mb-1">Capacity</p>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full bg-blue-400 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, wl.percentFull))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
