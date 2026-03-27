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

  if (!loading && !wl) return null  // no WDFT slug for this lake

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

          {/* % full + above/below pool */}
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-slate-400">Pool: </span>
              <span className="font-bold text-slate-800">{wl.percentFull}% full</span>
            </div>
            {wl.abovePoolFt !== 0 && (
              <div>
                <span className="text-slate-400">vs. conservation: </span>
                <span className={`font-bold ${wl.abovePoolFt >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {wl.abovePoolFt >= 0 ? '+' : ''}{wl.abovePoolFt.toFixed(2)} ft
                </span>
              </div>
            )}
          </div>

          {/* 24h change */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-slate-400">24h change:</span>
            <span className={`font-bold ${trendColor}`}>
              {wl.deltaFt >= 0 ? '+' : ''}{wl.deltaFt.toFixed(2)} ft
            </span>
          </div>

          {/* Pool fill bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, wl.percentFull))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span>0%</span>
              <span>Conservation Pool</span>
              <span>100%</span>
            </div>
          </div>

          {wl.date && (
            <p className="text-xs text-slate-400">As of {wl.date} · TWDB / waterdatafortexas.org</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
