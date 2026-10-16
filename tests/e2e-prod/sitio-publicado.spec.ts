import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { generateGuestToken } from '@/features/auth/token'
import { envValue } from '@/server/env'
import { GoogleAuth } from '@/server/google/auth'
import { ConsoleMailer } from '@/server/mail/types'
import { ADMIN_VIEWER_ID } from '@/server/domain'
import { createPostgresRepos } from '@/server/repositories/postgres'
import type { Repos } from '@/server/container'
import { createMediaService } from '@/server/services/media-service'
import { GoogleDriveStorage } from '@/server/storage/google-drive'
import { BlobThumbStore, blobAccess } from '@/server/storage/thumbs'

const DIR = resolve(process.env.MEDIA_TEST_DIR ?? '../MediaTest')
const FILES = existsSync(DIR)
  ? readdirSync(DIR)
      .filter((f) => statSync(join(DIR, f)).isFile())
      .map((f) => join(DIR, f))
  : []
const NOMBRE = `Prueba sitio ${Date.now()}`

let repos: Repos
let guest: { id: string; token: string }

test.beforeAll(async () => {
  repos = await createPostgresRepos(envValue('DATABASE_URL')!)
  guest = await repos.guests.create({ name: NOMBRE, token: generateGuestToken() })
})

// Borra con la lógica real de la app: Drive, miniaturas en Blob, likes, comentarios y el registro
test.afterAll(async () => {
  const auth = new GoogleAuth({ clientId: envValue('GOOGLE_CLIENT_ID')!, clientSecret: envValue('GOOGLE_CLIENT_SECRET')!, refreshToken: envValue('GOOGLE_REFRESH_TOKEN')! })
  const media = createMediaService({
    ...repos,
    storage: new GoogleDriveStorage({ auth, apiKey: envValue('GOOGLE_API_KEY')! }),
    thumbs: new BlobThumbStore({ access: blobAccess(envValue('BLOB_ACCESS')), token: envValue('BLOB_READ_WRITE_TOKEN') }),
    mailer: new ConsoleMailer(),
    alertEmail: 'sofiacumpleanosgaleriadefotos@gmail.com',
  })
  const admin = { id: ADMIN_VIEWER_ID, role: 'admin' as const }
  const { items } = await media.list(admin, { sort: 'recientes', filter: { authorId: guest.id, includeHidden: true }, limit: 60 })
  for (const m of items) await media.remove(admin, m.id)
  await repos.guests.remove(guest.id)
})

test('sin QR: el visitante ve el álbum pero no puede subir', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /23 años desde que nació este/ })).toBeVisible()
  await expect(page.getByText('Para subir, comentar o dar like, escanea el QR de tu tarjeta')).toBeVisible()
  await page.goto('/subir')
  await expect(page).toHaveURL(/\/$/)
  const res = await page.request.post('/api/uploads/init', { data: { name: 'a.jpg', size: 10, type: 'image/jpeg' } })
  expect(res.status()).toBe(401)
})

test('con QR: sube fotos y videos reales desde el celular y se ven en el álbum', async ({ page }) => {
  test.skip(FILES.length === 0, 'Falta la carpeta MediaTest')
  await page.goto(`/i/${guest.token}`)
  await expect(page.getByText('la fiesta del siglo')).toBeVisible()
  await page.waitForURL(/\/$/)

  await page.goto('/subir')
  await page.getByLabel('Elegir de la galería').setInputFiles(FILES)
  await expect(page.getByText(/Subiendo \d+ de \d+/).first()).toBeVisible()
  // Sale a ver el álbum mientras sube: la mini barra sigue mostrando el avance
  await page.getByRole('link', { name: 'Inicio del álbum de Sofi' }).click()
  await page.waitForURL(/\/$/)
  const dock = page.getByRole('region', { name: 'Subida en curso' })
  await expect(dock).toBeVisible()
  await expect(dock).toContainText(/¡Listo!|no se pud/, { timeout: 12 * 60_000 })
  if (!(await dock.textContent())?.includes('¡Listo!')) {
    await dock.getByRole('button', { name: 'Ver archivos en subida' }).click()
    throw new Error(`La subida falló en el sitio publicado: ${await dock.innerText()}`)
  }
  await expect(dock).toContainText(`¡Listo! Tus ${FILES.length} recuerdos ya están en el álbum.`)

  await page.goto('/mis-recuerdos')
  await expect(page.getByRole('button', { name: new RegExp(`^Abrir (foto|video) de ${NOMBRE}$`) })).toHaveCount(FILES.length, { timeout: 30_000 })
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 1500)
  await expect
    .poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('[data-testid="media-frame"] img')].filter((img) => img.complete && img.naturalWidth > 0).length), {
      timeout: 30_000,
    })
    .toBe(FILES.length)

  // Lo que hace un invitado en la fiesta: like, comentario, sticker, editar, borrar
  page.on('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: `Abrir foto de ${NOMBRE}` }).first().click()
  await page.getByRole('button', { name: 'Me gusta · 0' }).click()
  await expect(page.getByRole('button', { name: 'Me gusta · 1' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('textbox', { name: 'Escribe un comentario' }).fill('Prueba automática: qué linda')
  await page.getByRole('button', { name: 'Enviar comentario' }).click()
  await expect(page.getByText('Prueba automática: qué linda')).toBeVisible()
  await page.getByRole('button', { name: 'Enviar sticker: gato aplaudiendo' }).click()
  await expect(page.getByRole('img', { name: 'Sticker: gato aplaudiendo' })).toBeVisible()
  await page.getByRole('button', { name: 'Editar comentario' }).first().click()
  await page.getByRole('textbox', { name: 'Editar el comentario' }).fill('Prueba automática: editado')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Prueba automática: editado')).toBeVisible()
  await expect(page.getByText('(editado)')).toBeVisible()
  await page.getByRole('button', { name: 'Borrar comentario' }).first().click()
  await expect(page.getByText('Prueba automática: editado')).toHaveCount(0)
  await expect(page.getByText('Comentarios (1)')).toBeVisible()

  // El invitado borra uno de sus recuerdos desde el visor (se borra también de Drive y de Blob)
  await page.getByRole('button', { name: 'Borrar', exact: true }).click()
  await expect(page.getByRole('button', { name: new RegExp(`^Abrir (foto|video) de ${NOMBRE}$`) })).toHaveCount(FILES.length - 1)

  await page.getByRole('button', { name: `Abrir video de ${NOMBRE}` }).first().click()
  await expect(page.locator('[data-testid="video-player"], iframe[title^="Video de"]').first()).toBeVisible()
  const href = await page.getByRole('link', { name: /^Descargar · \d+$/ }).getAttribute('href')
  const res = await page.request.get(href!, { maxRedirects: 0 })
  expect(res.status()).toBe(302)
  expect(res.headers().location).toContain('drive.google.com')
})
