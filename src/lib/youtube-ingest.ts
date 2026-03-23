/**
 * YouTube fishing video ingestion pipeline.
 *
 * Flow:
 *   1. Search YouTube for lake-specific fishing content (YouTube Data API v3)
 *   2. Filter for high-signal videos (view count, channel, keywords)
 *   3. Extract transcript via yt-dlp (auto-captions)
 *   4. Chunk transcript into ~400-token segments preserving sentence boundaries
 *   5. Label chunks with lake + fishing context
 *   6. Embed with Voyage AI (existing setup)
 *   7. Store chunks in technique_embeddings (same table as article RAG)
 *   8. Track video in youtube_sources table
 */

import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from './embeddings'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!

// Channels known for high-quality tournament fishing breakdowns
const HIGH_SIGNAL_CHANNELS = [
  'Bassmaster',
  'Major League Fishing',
  'MLF',
  'BassResource',
  '1Rod1ReelFishing',
  'Bass Fishing Productions',
]

// Keywords that indicate technique-rich content
const TECHNIQUE_KEYWORDS = [
  'tournament', 'weigh-in', 'breakdown', 'fishing report', 'pattern',
  'what i caught them on', 'bass fishing', 'how to fish', 'technique',
  'crankbait', 'jig', 'swimbait', 'topwater', 'finesse',
]

export interface YouTubeSearchOptions {
  lakeId: string
  lakeName: string
  state: string
  maxResults?: number
  publishedAfter?: string  // ISO date string e.g. "2022-01-01T00:00:00Z"
  channelId?: string
}

export interface IngestResult {
  videoId: string
  title: string
  status: 'ingested' | 'skipped' | 'error' | 'already_exists'
  chunksCreated?: number
  reason?: string
}

// Search YouTube for fishing videos related to a lake
export async function searchYouTubeForLake(opts: YouTubeSearchOptions): Promise<any[]> {
  const { lakeName, state, maxResults = 20, publishedAfter } = opts

  const queries = [
    `"${lakeName}" bass fishing tournament breakdown`,
    `"${lakeName}" bass fishing report ${state}`,
    `"${lakeName}" bass tournament weigh-in`,
  ]

  const allVideos: any[] = []
  const seenIds = new Set<string>()

  for (const q of queries) {
    const params = new URLSearchParams({
      part: 'snippet',
      q,
      type: 'video',
      maxResults: String(Math.ceil(maxResults / queries.length)),
      videoDuration: 'medium', // 4-20 min — avoids shorts and multi-hour streams
      relevanceLanguage: 'en',
      key: YOUTUBE_API_KEY,
    })
    if (publishedAfter) params.set('publishedAfter', publishedAfter)

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
    const data = await res.json() as any
    if (data.error) throw new Error(`YouTube API error: ${data.error.message}`)

    for (const item of data.items || []) {
      const id = item.id?.videoId
      if (id && !seenIds.has(id)) {
        seenIds.add(id)
        allVideos.push(item)
      }
    }

    await new Promise(r => setTimeout(r, 200))
  }

  return allVideos
}

// Get video details (view count, duration) from YouTube
export async function getVideoDetails(videoIds: string[]): Promise<Record<string, any>> {
  const params = new URLSearchParams({
    part: 'statistics,contentDetails,snippet',
    id: videoIds.join(','),
    key: YOUTUBE_API_KEY,
  })

  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`)
  const data = await res.json() as any
  const details: Record<string, any> = {}

  for (const item of data.items || []) {
    const dur = item.contentDetails?.duration || ''
    // Parse ISO 8601 duration PT#M#S
    const mMatch = dur.match(/(\d+)M/)
    const sMatch = dur.match(/(\d+)S/)
    const hMatch = dur.match(/(\d+)H/)
    const durationSeconds =
      (hMatch ? parseInt(hMatch[1]) * 3600 : 0) +
      (mMatch ? parseInt(mMatch[1]) * 60 : 0) +
      (sMatch ? parseInt(sMatch[1]) : 0)

    details[item.id] = {
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
      durationSeconds,
      channelTitle: item.snippet?.channelTitle,
      channelId: item.snippet?.channelId,
      publishedAt: item.snippet?.publishedAt,
      description: item.snippet?.description?.slice(0, 500),
    }
  }

  return details
}

// Score a video for fishing relevance (0–100)
function scoreVideo(snippet: any, details: any): number {
  let score = 0
  const title = (snippet.title || '').toLowerCase()
  const desc = (snippet.description || '').toLowerCase()
  const channel = (details?.channelTitle || snippet.channelTitle || '').toLowerCase()

  // High-signal channels
  if (HIGH_SIGNAL_CHANNELS.some(c => channel.includes(c.toLowerCase()))) score += 30

  // Technique keywords in title
  for (const kw of TECHNIQUE_KEYWORDS) {
    if (title.includes(kw.toLowerCase())) score += 8
  }

  // View count signal (more views = more likely quality content)
  const views = details?.viewCount || 0
  if (views > 100000) score += 20
  else if (views > 10000) score += 12
  else if (views > 1000) score += 5

  // Duration sweet spot: 5–25 minutes
  const dur = details?.durationSeconds || 0
  if (dur >= 300 && dur <= 1500) score += 10

  return Math.min(score, 100)
}

// Extract transcript using yt-dlp
export function extractTranscript(videoId: string): string | null {
  const url = `https://www.youtube.com/watch?v=${videoId}`
  try {
    // Try to get auto-generated English subtitles
    const output = execSync(
      `python3 -m yt_dlp --skip-download --write-auto-sub --sub-lang en --sub-format srv3/vtt/best --convert-subs srt -o /tmp/yt_${videoId} "${url}" 2>&1`,
      { timeout: 60000, encoding: 'utf8' }
    )

    // Read the SRT file
    const fs = require('fs')
    const srtPath = `/tmp/yt_${videoId}.en.srt`
    const vttPath = `/tmp/yt_${videoId}.en.vtt`

    let raw = ''
    if (fs.existsSync(srtPath)) raw = fs.readFileSync(srtPath, 'utf8')
    else if (fs.existsSync(vttPath)) raw = fs.readFileSync(vttPath, 'utf8')
    else return null

    // Clean SRT: remove timestamps, numbers, formatting
    const text = raw
      .replace(/\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n/g, ' ')
      .replace(/WEBVTT\n.*/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Cleanup temp files
    try { fs.unlinkSync(srtPath) } catch {}
    try { fs.unlinkSync(vttPath) } catch {}

    return text.length > 100 ? text : null
  } catch (e: any) {
    console.error(`Transcript extraction failed for ${videoId}:`, e.message?.slice(0, 100))
    return null
  }
}

// Chunk transcript into ~400-token segments at sentence boundaries
export function chunkTranscript(
  text: string,
  lakeName: string,
  videoTitle: string,
  channelTitle: string,
  videoId: string,
  targetTokens = 400
): string[] {
  // Rough token estimate: 1 token ≈ 4 chars
  const targetChars = targetTokens * 4

  // Split on sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  const chunks: string[] = []
  let current = ''
  const prefix = `[Source: YouTube | ${channelTitle} | "${videoTitle}" | https://youtu.be/${videoId}]\n[Lake: ${lakeName}]\n`

  for (const sentence of sentences) {
    if ((current + sentence).length > targetChars && current.length > 0) {
      chunks.push(prefix + current.trim())
      current = sentence
    } else {
      current += ' ' + sentence
    }
  }
  if (current.trim().length > 50) {
    chunks.push(prefix + current.trim())
  }

  return chunks
}

// Main ingestion function for a single video
export async function ingestVideo(
  videoId: string,
  snippet: any,
  details: any,
  lakeId: string,
  lakeName: string
): Promise<IngestResult> {
  // Check if already ingested
  const { data: existing } = await supabase
    .from('youtube_sources')
    .select('id, transcript_status')
    .eq('video_id', videoId)
    .maybeSingle()

  if (existing?.transcript_status === 'complete') {
    return { videoId, title: snippet.title, status: 'already_exists' }
  }

  // Upsert source record as "processing"
  const { data: source, error: sourceError } = await supabase
    .from('youtube_sources')
    .upsert({
      video_id: videoId,
      title: snippet.title,
      channel_title: details?.channelTitle || snippet.channelTitle,
      channel_id: details?.channelId || snippet.channelId,
      published_at: details?.publishedAt || snippet.publishedAt,
      description: details?.description || snippet.description?.slice(0, 500),
      duration_seconds: details?.durationSeconds,
      view_count: details?.viewCount,
      body_of_water_id: lakeId,
      transcript_status: 'processing',
    }, { onConflict: 'video_id' })
    .select('id')
    .single()

  if (sourceError || !source) {
    return { videoId, title: snippet.title, status: 'error', reason: sourceError?.message }
  }

  // Extract transcript
  const transcript = extractTranscript(videoId)
  if (!transcript) {
    await supabase.from('youtube_sources').update({ transcript_status: 'no_transcript' }).eq('id', source.id)
    return { videoId, title: snippet.title, status: 'skipped', reason: 'No transcript available' }
  }

  // Chunk transcript
  const channelTitle = details?.channelTitle || snippet.channelTitle || 'Unknown Channel'
  const chunks = chunkTranscript(transcript, lakeName, snippet.title, channelTitle, videoId)

  // Embed and store each chunk
  let chunksCreated = 0
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk)
    if (!embedding) continue

    const { error } = await supabase.from('technique_embeddings').insert({
      body_of_water_id: lakeId,
      technique_report_id: null,
      youtube_source_id: source.id,
      source_type: 'youtube',
      content: chunk,
      embedding,
    })

    if (!error) chunksCreated++
    await new Promise(r => setTimeout(r, 100)) // rate limit embeddings API
  }

  // Update source record
  await supabase.from('youtube_sources').update({
    transcript_status: chunksCreated > 0 ? 'complete' : 'embed_failed',
    chunk_count: chunksCreated,
  }).eq('id', source.id)

  return { videoId, title: snippet.title, status: 'ingested', chunksCreated }
}

// Full lake ingestion run
export async function ingestYouTubeForLake(opts: YouTubeSearchOptions & {
  minScore?: number
  dryRun?: boolean
}): Promise<IngestResult[]> {
  const { minScore = 40, dryRun = false } = opts

  // Get lake info
  const { data: lake } = await supabase
    .from('body_of_water')
    .select('id, name, state')
    .eq('id', opts.lakeId)
    .single()

  if (!lake) throw new Error(`Lake not found: ${opts.lakeId}`)

  // Search YouTube
  const videos = await searchYouTubeForLake({ ...opts, lakeName: lake.name, state: lake.state })

  // Get details for all found videos
  const videoIds = videos.map(v => v.id?.videoId).filter(Boolean)
  const details = await getVideoDetails(videoIds)

  // Score and filter
  const scored = videos
    .map(v => ({ v, score: scoreVideo(v.snippet, details[v.id?.videoId]) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)

  if (dryRun) {
    return scored.map(({ v, score }) => ({
      videoId: v.id?.videoId,
      title: v.snippet?.title,
      status: 'skipped',
      reason: `Dry run — score: ${score}`,
    }))
  }

  // Ingest each qualifying video
  const results: IngestResult[] = []
  for (const { v } of scored) {
    const videoId = v.id?.videoId
    if (!videoId) continue
    const result = await ingestVideo(videoId, v.snippet, details[videoId], opts.lakeId, lake.name)
    results.push(result)
    console.log(`[yt-ingest] ${result.status} — ${result.title?.slice(0, 60)} (${result.chunksCreated || 0} chunks)`)
    await new Promise(r => setTimeout(r, 500))
  }

  return results
}
