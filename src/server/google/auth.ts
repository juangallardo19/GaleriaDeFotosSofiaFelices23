import { AppError } from '../errors'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SAFETY_MARGIN_MS = 60_000

export interface GoogleAuthOptions {
  clientId: string
  clientSecret: string
  refreshToken: string
  fetch?: typeof fetch
  now?: () => number
}

// Singleton por instancia: cachea el token y comparte una sola renovación entre peticiones simultáneas
export class GoogleAuth {
  private token: { value: string; expiresAt: number } | null = null
  private inflight: Promise<string> | null = null
  private readonly fetchFn: typeof fetch
  private readonly now: () => number

  constructor(private readonly opts: GoogleAuthOptions) {
    this.fetchFn = opts.fetch ?? fetch
    this.now = opts.now ?? Date.now
  }

  async accessToken(): Promise<string> {
    if (this.token && this.now() < this.token.expiresAt - SAFETY_MARGIN_MS) return this.token.value
    this.inflight ??= this.refresh().finally(() => {
      this.inflight = null
    })
    return this.inflight
  }

  private async refresh(): Promise<string> {
    const res = await this.fetchFn(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.opts.clientId,
        client_secret: this.opts.clientSecret,
        refresh_token: this.opts.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })
    const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string }
    if (!res.ok || !body.access_token) throw new AppError('servicio', `Google rechazó el refresh token (${body.error ?? res.status})`)
    this.token = { value: body.access_token, expiresAt: this.now() + (body.expires_in ?? 3600) * 1000 }
    return this.token.value
  }
}
