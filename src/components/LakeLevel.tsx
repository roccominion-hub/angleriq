'use client'
import { useEffect, useState } from 'react'
import { Waves, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface LakeLevelProps {
  lakeId: string
  lakeName: string
}

export function LakeLevel({ lakeId, lakeName }: LakeLevelProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/lake-conditions?lakeId=${lakeId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [lakeId])

  const wl = data?.conditions?.waterLevel

  if (!loading && !wl) return null

  const TrendIcon = wl?.trend === 'rising' ? TrendingUp : wl?.trend === 'falling' ? TrendingDown : Minus
  const trendColor = wl?.trend === 'rising' ? 'text-green-500' : wl?.trend === 'falling' ? 'text-red-500' : 'text-slate-400'
  const trendLabel = wl?.trend === 'rising' ? 'Rising' : wl?.trend === 'falling' ? 'Falling' : 'Stable'
  const deltaAbs = wl ? Math.abs(wl.deltaft).toFixed(2) : '0.00'

  const lastUpdated = wl?.dateTime
    ? new Date(wl.dateTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <Waves size={14} className="text-blue-500" />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Lake Level</span>
      </div>

      {loading ? (
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="h-3 bg-slate-100 rounded-full w-24 animate-pulse" />
          <div className="h-3 bg-slate-100 rounded-full w-16 animate-pulse" />
        </div>
      ) : wl ? (
        <div className="px-4 py-4 space-y-3">
          {/* Main reading */}
          <div className="flex items-end gap-3">
            <div>
              <span className="text-3xl font-black text-slate-900 tracking-tight">{wl.valueFt.toLocaleString()}</span>
              <span className="text-sm font-semibold text-slate-400 ml-1">ft</span>
            </div>
            <div className={`flex items-center gap-1 mb-1 ${trendColor}`}>
              <TrendIcon size={16} />
              <span className="text-sm font-bold">{trendLabel}</span>
            </div>
          </div>

          {/* 24h change */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-slate-400">24h change:</span>
            <span className={`font-bold ${trendColor}`}>
              {wl.deltaft >= 0 ? '+' : ''}{wl.deltaft.toFixed(2)} ft
            </span>
          </div>

          {/* Trend bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                wl.trend === 'rising' ? 'bg-green-400' : wl.trend === 'falling' ? 'bg-red-400' : 'bg-slate-300'
              }`}
              style={{ width: `${Math.min(100, 50 + (wl.deltaft / 0.5) * 50)}%` }}
            />
          </div>

          {lastUpdated && (
            <p className="text-xs text-slate-400">Updated {lastUpdated} · USGS</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
