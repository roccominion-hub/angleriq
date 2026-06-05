'use client'
import { useEffect, useRef, useState } from 'react'
import { Fish, Loader2, Send, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────

export interface ChatContext {
  mode: 'homepage' | 'report'
  lakeId?: string
  lake?: string
  state?: string
  season?: string
  waterTempF?: number | null
  topBaits?: { name: string; count: number }[]
  topPatterns?: { pattern: string; count: number }[]
  intel?: string
  today?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ── Starter prompts ────────────────────────────────────────────────────────

const HOMEPAGE_PROMPTS = [
  'Which TX lake is fishing best right now?',
  'Where should I go for big bass this weekend?',
  'What Oklahoma lakes are producing in spring?',
  'Best lake for a weekend tournament this time of year?',
]

function getReportPrompts(lake: string): string[] {
  return [
    `What's the best time of day to fish ${lake}?`,
    'What depth should I focus on right now?',
    'What alternative technique would you suggest?',
    `How does ${lake} typically fish in these conditions?`,
  ]
}

// ── Markdown renderer ──────────────────────────────────────────────────────
// Handles **bold** and newlines. Safe for streaming partial text.

function MessageContent({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]*\*\*)/)
        return (
          <span key={li}>
            {parts.map((part, pi) =>
              part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
                <strong key={pi}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={pi}>{part}</span>
              )
            )}
            {li < lines.length - 1 && <br />}
          </span>
        )
      })}
    </>
  )
}

// ── ChatDrawer ─────────────────────────────────────────────────────────────

interface ChatDrawerProps {
  open: boolean
  onClose: () => void
  context: ChatContext
}

export function ChatDrawer({ open, onClose, context }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Focus input when drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 320)
  }, [open])

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cancel any in-flight request when drawer closes
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [open])

  // Reset conversation when lake context changes (new report)
  useEffect(() => {
    setMessages([])
  }, [context.lakeId, context.mode])

  const starterPrompts =
    context.mode === 'report' && context.lake
      ? getReportPrompts(context.lake)
      : HOMEPAGE_PROMPTS

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    // Abort any prior stream
    abortRef.current?.abort()

    const userMsg: Message = { role: 'user', content: trimmed }
    const historyBeforeSend = [...messages]
    const nextMessages: Message[] = [...historyBeforeSend, userMsg, { role: 'assistant', content: '' }]
    setMessages(nextMessages)
    setInput('')
    setStreaming(true)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: historyBeforeSend, context }),
        signal: abort.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages([...historyBeforeSend, userMsg, { role: 'assistant', content: accumulated }])
      }

      // Flush any remaining bytes
      accumulated += decoder.decode()
      if (accumulated) {
        setMessages([...historyBeforeSend, userMsg, { role: 'assistant', content: accumulated }])
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages([
          ...historyBeforeSend,
          userMsg,
          { role: 'assistant', content: 'Something went wrong — please try again.' },
        ])
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const lakeLine =
    context.mode === 'report' && context.lake
      ? `${context.lake}${context.state ? ` · ${context.state}` : ''}`
      : 'Bass Fishing Assistant'

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Fish size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">AnglerIQ</p>
              <p className="text-xs text-slate-400 leading-tight truncate max-w-[240px]">{lakeLine}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors ml-4 shrink-0"
            aria-label="Close chat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              {/* Empty state */}
              <div className="text-center pt-6 pb-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <Fish size={22} className="text-blue-600" />
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">Ask me anything</p>
                <p className="text-xs text-slate-500 max-w-[280px] mx-auto">
                  {context.mode === 'homepage'
                    ? 'Get help finding the right lake and pattern for your next trip.'
                    : `Dig deeper into ${context.lake ?? 'this lake'} — conditions, techniques, timing.`}
                </p>
              </div>

              {/* Starter prompts */}
              <div className="space-y-2">
                {starterPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left text-sm px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Fish size={11} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content
                    ? <MessageContent text={msg.content} />
                    : streaming && i === messages.length - 1
                    ? <span className="inline-flex gap-1 items-center"><span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} /></span>
                    : null}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 px-4 py-3 shrink-0">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
              placeholder="Ask about lakes, techniques, conditions…"
              className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
              disabled={streaming}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              aria-label="Send message"
            >
              {streaming ? (
                <Loader2 size={15} className="text-white animate-spin" />
              ) : (
                <Send size={15} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
