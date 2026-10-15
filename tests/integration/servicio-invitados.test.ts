import { describe, expect, it, vi } from 'vitest'
import { createGuestService } from '@/server/services/guest-service'
import { MemoryGuestRepository } from '@/server/repositories/memory'
import { isTokenFormatValid } from '@/features/auth/token'
import { clock } from '../helpers/fakes'

function setup() {
  const c = clock()
  const repo = new MemoryGuestRepository()
  const service = createGuestService({ guests: repo, baseUrl: 'https://sofi23.vercel.app', now: c.now })
  return { c, repo, service }
}

describe('RF-14 · crear invitados', () => {
  it('crea un invitado solo con el nombre y le genera token y URL del QR', async () => {
    const { service } = setup()
    const { guest, url } = await service.create('  Tía Marta ')
    expect(guest.name).toBe('Tía Marta')
    expect(isTokenFormatValid(guest.token)).toBe(true)
    expect(url).toBe(`https://sofi23.vercel.app/i/${guest.token}`)
  })

  it('rechaza nombres vacíos o demasiado largos', async () => {
    const { service } = setup()
    await expect(service.create('   ')).rejects.toMatchObject({ code: 'invalido' })
    await expect(service.create('x'.repeat(61))).rejects.toMatchObject({ code: 'invalido' })
  })

  it('importa un CSV saltando los que ya existen', async () => {
    const { service } = setup()
    await service.create('Laura')
    const r = await service.importCsv('nombre\nLaura\nCamilo\nAbuela Rosa\n')
    expect(r.created.map((g) => g.name)).toEqual(['Camilo', 'Abuela Rosa'])
    expect(r.skipped).toEqual(['Laura'])
    expect((await service.list()).map((g) => g.name)).toEqual(['Abuela Rosa', 'Camilo', 'Laura'])
  })

  it('puede eliminar un invitado', async () => {
    const { service } = setup()
    const { guest } = await service.create('Juan')
    await service.remove(guest.id)
    expect(await service.list()).toEqual([])
  })
})

describe('RF-14 · editar el nombre de un invitado', () => {
  it('cambia el nombre y conserva el mismo QR', async () => {
    const { service } = setup()
    const { guest, url } = await service.create('Valeria (2)')
    const renamed = await service.rename(guest.id, '  Valeria   Gómez ')
    expect(renamed.name).toBe('Valeria Gómez')
    expect(service.urlFor(renamed)).toBe(url)
    expect((await service.list()).map((g) => g.name)).toEqual(['Valeria Gómez'])
  })

  it('valida el nombre nuevo', async () => {
    const { service } = setup()
    const { guest } = await service.create('Luis')
    await expect(service.rename(guest.id, '   ')).rejects.toMatchObject({ code: 'invalido' })
    await expect(service.rename(guest.id, 'x'.repeat(61))).rejects.toMatchObject({ code: 'invalido' })
  })

  it('si el invitado no existe avisa', async () => {
    const { service } = setup()
    await expect(service.rename('no-existe', 'Alguien')).rejects.toMatchObject({ code: 'no-encontrado' })
  })
})

describe('RF-01/02 · entrar con el QR', () => {
  it('un token válido devuelve al invitado y registra su última visita', async () => {
    const { service, c } = setup()
    const { guest } = await service.create('Camilo')
    const logged = await service.loginWithToken(guest.token)
    expect(logged?.id).toBe(guest.id)
    expect(logged?.lastSeenAt).toEqual(c.now())
  })

  it('un token con formato inválido ni siquiera consulta la base', async () => {
    const { service, repo } = setup()
    const spy = vi.spyOn(repo, 'findByToken')
    expect(await service.loginWithToken('../../hack')).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('un token desconocido no entra', async () => {
    const { service } = setup()
    expect(await service.loginWithToken('A'.repeat(22))).toBeNull()
  })
})

describe('Personas viendo el álbum', () => {
  it('cuenta a quienes enviaron señal en el último minuto', async () => {
    const { service, c } = setup()
    const a = (await service.create('A')).guest
    const b = (await service.create('B')).guest
    await service.heartbeat(a.id)
    c.advance(30_000)
    await service.heartbeat(b.id)
    expect(await service.onlineCount()).toBe(2)
    c.advance(45_000)
    expect(await service.onlineCount()).toBe(1)
  })
})
