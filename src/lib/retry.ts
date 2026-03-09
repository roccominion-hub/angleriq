/**
 * Exponential backoff retry for API calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, label = 'API call' } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || err?.message?.includes('rate') || err?.message?.includes('529')
      const isLast = attempt === maxAttempts

      if (isLast || !isRateLimit) throw err

      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500
      console.warn(`[${label}] Rate limited. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxAttempts})`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error(`${label} failed after ${maxAttempts} attempts`)
}
