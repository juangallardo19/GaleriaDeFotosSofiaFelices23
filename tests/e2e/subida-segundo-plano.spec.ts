import { resolve } from 'node:path'
import { expect, request, test } from '@playwright/test'

const ADMIN_PASSWORD = 'clave-admin-e2e'
const FOTOS = ['corazon.webp', 'estrella.webp', 'globo-rosa.webp'].map((f) => resolve('public/assets', f))

test('la subida sigue en la mini barra mientras el invitado ve el álbum, y avisa si intenta salir', async ({ page, baseURL }) => {
  const nombre = `Segundo plano ${Date.now()}`
  const admin = await request.newContext({ baseURL })
  await admin.post('/api/admin/login', { data: { password: ADMIN_PASSWORD } })
  const { url } = await (await admin.post('/api/admin/guests', { data: { name: nombre } })).json()
  await admin.dispose()
  await page.goto(url)
  await page.waitForURL(/\/$/)

  // Drive falso: retiene los archivos hasta que el invitado ya esté viendo el álbum
  let soltar!: () => void
  const retenidos = new Promise<void>((r) => (soltar = r))
  let n = 0
  await page.route('**/api/dev-upload/**', async (route) => {
    await retenidos
    await route.fulfill({ status: 200, json: { id: `e2e-segundo-plano-${++n}` } })
  })

  await page.goto('/subir')
  await page.getByLabel('Elegir de la galería').setInputFiles(FOTOS)
  await expect(page.getByText(/Subiendo \d+ de 3/).first()).toBeVisible()

  await page.getByRole('link', { name: 'Inicio del álbum de Sofi' }).click()
  await page.waitForURL(/\/$/)
  await expect(page.getByRole('heading', { name: /23 años desde que nació este/ })).toBeVisible()
  const dock = page.getByRole('region', { name: 'Subida en curso' })
  await expect(dock).toContainText(/Subiendo \d+ de 3/)
  await expect(dock).toContainText('Si cierras o sales de la página, la subida se detiene.')
  await dock.getByRole('button', { name: 'Ver archivos en subida' }).click()
  await expect(dock.getByText('corazon.webp')).toBeVisible()

  // Si intenta cerrar la página, el navegador pregunta antes de cortar la subida; el invitado decide quedarse
  const aviso = new Promise<string>((r) =>
    page.once('dialog', (d) => {
      r(d.type())
      void d.dismiss()
    }),
  )
  await page.close({ runBeforeUnload: true })
  expect(await aviso).toBe('beforeunload')
  expect(page.isClosed()).toBe(false)

  soltar()
  await expect(dock).toContainText('¡Listo! Tus 3 recuerdos ya están en el álbum.', { timeout: 30_000 })
  await dock.getByRole('button', { name: 'Cerrar aviso de subida' }).click()
  await expect(dock).toHaveCount(0)

  await page.goto('/mis-recuerdos')
  await expect(page.getByRole('button', { name: `Abrir foto de ${nombre}` })).toHaveCount(3)
})
