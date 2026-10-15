export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>()
  private readonly limit: number
  private readonly windowMs: number
  private readonly now: () => number

  constructor(opts: { limit: number; windowMs: number; now?: () => number }) {
    this.limit = opts.limit
    this.windowMs = opts.windowMs
    this.now = opts.now ?? Date.now
  }

  hit(key: string): boolean {
    const t = this.now()
    const recent = (this.hits.get(key) ?? []).filter((at) => t - at < this.windowMs)
    if (recent.length >= this.limit) {
      this.hits.set(key, recent)
      return false
    }
    recent.push(t)
    this.hits.set(key, recent)
    return true
  }
}
