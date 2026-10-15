import { expect, request, test, type Page } from '@playwright/test'

const ADMIN_PASSWORD = 'clave-admin-e2e'
const recuerdo = () => ({ driveFileId: `e2e-${Math.random()}`, kind: 'photo', thumbUrl: '/assets/sofi.webp', width: 656, height: 900, dominantColor: '#e9b7c6', durationSec: null, sizeBytes: 1000 })

async function nuevoInvitadoConRecuerdos(page: Page, baseURL: string, name: string, cuantos: number) {
  const admin = await request.newContext({ baseURL })
  await admin.post('/api/admin/login', { data: { password: ADMIN_PASSWORD } })
  const { url } = await (await admin.post('/api/admin/guests', { data: { name } })).json()
  await admin.dispose()
  await page.goto(url)
  await page.waitForURL(/\/$/)
  for (let i = 0; i < cuantos; i++) expect((await page.request.post('/api/media', { data: recuerdo() })).status()).toBe(201)
}

test('un invitado elige varios de sus recuerdos y los borra de una vez', async ({ page, baseURL }) => {
  const nombre = `Lotes ${Date.now()}`
  await nuevoInvitadoConRecuerdos(page, baseURL!, nombre, 3)
  await page.goto('/mis-recuerdos')
  const fotos = page.getByRole('button', { name: `Abrir foto de ${nombre}` })
  await expect(fotos).toHaveCount(3)

  await page.getByRole('button', { name: 'Seleccionar' }).click()
  const casillas = page.getByRole('checkbox', { name: `Seleccionar foto de ${nombre}` })
  await casillas.nth(0).click()
  await casillas.nth(1).click()
  await expect(page.getByText('2 seleccionados')).toBeVisible()
  page.on('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Borrar (2)' }).click()
  await expect(page.getByText('Se borraron 2 recuerdos')).toBeVisible()
  await expect(fotos).toHaveCount(1)
})

test('el admin elige varios recuerdos en Contenido y los oculta', async ({ page, baseURL }) => {
  const nombre = `Moderar ${Date.now()}`
  await nuevoInvitadoConRecuerdos(page, baseURL!, nombre, 2)
  await page.context().clearCookies()
  await page.goto('/admin')
  await expect(async () => {
    await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('heading', { name: 'Invitados' })).toBeVisible({ timeout: 5000 })
  }).toPass({ timeout: 30_000 })

  await page.goto('/admin/contenido')
  await page.getByRole('button', { name: 'Seleccionar' }).click()
  const casillas = page.getByRole('checkbox', { name: `Seleccionar foto de ${nombre}` })
  await expect(casillas).toHaveCount(2)
  await casillas.nth(0).click()
  await casillas.nth(1).click()
  await page.getByRole('button', { name: 'Ocultar' }).click()
  await expect(page.getByText('2 recuerdos ocultos')).toBeVisible()
})
