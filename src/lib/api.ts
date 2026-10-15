export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const FRIENDLY: Record<number, string> = {
  401: 'Para esto necesitas entrar con el QR de tu tarjeta',
  403: 'No tienes permiso para hacer esto',
  404: 'Ese recuerdo ya no existe',
  429: 'Demasiados intentos, espera un momento',
}

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { credentials: 'same-origin', ...init })
  } catch {
    throw new ApiError(0, 'Sin conexión. Revisa el internet e intenta de nuevo')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    const isCode = !body?.message || /^[a-z-]+$/.test(body.message)
    const message = isCode ? (FRIENDLY[res.status] ?? 'Algo salió mal, intenta de nuevo') : body!.message!
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const postJson = <T = unknown>(url: string, body: unknown, method = 'POST') =>
  api<T>(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
