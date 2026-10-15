import { describe, expect, it } from 'vitest'
import { configFromEnv } from '@/server/container'
import { envValue } from '@/server/env'

describe('Variables de entorno pegadas a mano en Vercel', () => {
  it('quita comillas y espacios que se cuelan al copiar', () => {
    const env = { A: '"valor"', B: "'valor'", C: '  valor \n', D: 'valor', E: '""', F: '' }
    expect(envValue('A', env)).toBe('valor')
    expect(envValue('B', env)).toBe('valor')
    expect(envValue('C', env)).toBe('valor')
    expect(envValue('D', env)).toBe('valor')
    expect(envValue('E', env)).toBeUndefined()
    expect(envValue('F', env)).toBeUndefined()
    expect(envValue('NO_EXISTE', env)).toBeUndefined()
  })

  it('no toca comillas que son parte del valor', () => {
    expect(envValue('X', { X: 'ab"c' })).toBe('ab"c')
    expect(envValue('X', { X: '"abc' })).toBe('"abc')
  })

  it('la configuración usa los valores limpios', () => {
    const config = configFromEnv({ SESSION_SECRET: '"secreto-de-pruebas-0123456789-abcdefghij"', ADMIN_PASSWORD: ' clave ', NEXT_PUBLIC_SITE_URL: '"https://sofi23.vercel.app"' })
    expect(config.sessionSecret).toBe('secreto-de-pruebas-0123456789-abcdefghij')
    expect(config.adminPassword).toBe('clave')
    expect(config.baseUrl).toBe('https://sofi23.vercel.app')
    expect(config.secureCookies).toBe(true)
  })
})
