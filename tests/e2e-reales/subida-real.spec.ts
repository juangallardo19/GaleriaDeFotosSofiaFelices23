import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { REAL_ADMIN_PASSWORD } from '../../playwright.real.config'

const DIR = resolve(process.env.MEDIA_TEST_DIR ?? '../MediaTest')
const FILES = existsSync(DIR)
  ? readdirSync(DIR)
      .filter((f) => statSync(join(DIR, f)).isFile())
      .map((f) => join(DIR, f))
  : []
const NOMBRE = `Prueba E2E ${Date.now()}`

interface Media {
  id: string
  kind: 'photo' | 'video'
  downloadPath: string
}

test.skip(FILES.length === 0, 'Falta la carpeta MediaTest con archivos de prueba')

test('un invitado sube fotos y videos reales desde el celular, se ven en el álbum y después se borra todo', async ({ page, request }) => {
  const login = await request.post('/api/admin/login', { data: { password: REAL_ADMIN_PASSWORD } })
  expect(login.status()).toBe(204)
  const created = await (await request.post('/api/admin/guests', { data: { name: NOMBRE } })).json()
  const guestId: string = created.guest.id

  try {
    await page.goto(created.url)
    await expect(page.getByText('la fiesta del siglo')).toBeVisible()
    await page.waitForURL('/')

    await page.goto('/subir')
    await page.getByLabel('Elegir de la galería').setInputFiles(FILES)
    await expect(page.getByText(/Subiendo \d+ de \d+/).first()).toBeVisible()
    // El invitado se va a ver el álbum mientras sube: la subida sigue en la mini barra
    await page.getByRole('link', { name: 'Inicio del álbum de Sofi' }).click()
    await page.waitForURL(/\/$/)
    const dock = page.getByRole('region', { name: 'Subida en curso' })
    await expect(dock).toBeVisible()
    await expect(dock).toContainText(`¡Listo! Tus ${FILES.length} recuerdos ya están en el álbum.`, { timeout: 12 * 60_000 })

    await page.goto('/mis-recuerdos')
    const cards = page.getByRole('button', { name: new RegExp(`^Abrir (foto|video) de ${NOMBRE}$`) })
    await expect(cards).toHaveCount(FILES.length, { timeout: 30_000 })

    // Las miniaturas salen del almacén privado de Blob a través del sitio
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 1500)
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('[data-testid="media-frame"] img')].filter((img) => img.complete && img.naturalWidth > 0).length), {
        timeout: 30_000,
      })
      .toBe(FILES.length)

    // Un video se abre en la página: con el reproductor nativo o, si el formato no es compatible, con el de Google
    await page.getByRole('button', { name: `Abrir video de ${NOMBRE}` }).first().click()
    await expect(page.locator('[data-testid="video-player"], iframe[title^="Video de"]').first()).toBeVisible()
    const download = page.getByRole('link', { name: /^Descargar · \d+$/ })
    const res = await request.get((await download.getAttribute('href'))!, { maxRedirects: 0 })
    expect(res.status()).toBe(302)
    expect(res.headers().location).toContain('drive.google.com')
  } finally {
    const { items } = (await (await request.get(`/api/media?author=${guestId}&hidden=1&limit=60`)).json()) as { items: Media[] }
    for (const m of items) expect((await request.delete(`/api/media/${m.id}`)).status()).toBe(204)
    expect((await request.delete(`/api/admin/guests/${guestId}`)).status()).toBe(204)
    const left = (await (await request.get(`/api/media?author=${guestId}&hidden=1`)).json()) as { items: Media[] }
    expect(left.items).toEqual([])
  }
})
