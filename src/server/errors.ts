export type ErrorCode = 'invalido' | 'no-autorizado' | 'prohibido' | 'no-encontrado' | 'limite' | 'servicio'

const STATUS: Record<ErrorCode, number> = {
  invalido: 400,
  'no-autorizado': 401,
  prohibido: 403,
  'no-encontrado': 404,
  limite: 429,
  servicio: 503,
}

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string = code,
  ) {
    super(message)
    this.name = 'AppError'
  }

  get status() {
    return STATUS[this.code]
  }
}
