import { expect, test, type Page } from '@playwright/test'

// Datos sembrados cuando el servidor corre con E2E_SEED=1 (ver src/server/container.ts)
const TOKEN = 'E2ETIAMARTA00000000000'
const ADMIN_PASSWORD = 'clave-admin-e2e'

test.describe('Invitado', () => {
  test('escanea su QR, ve la bienvenida con su nombre y llega al álbum', async ({ page }) => {
    await page.goto(`/i/${TOKEN}`)
    await expect(page.getByText('la fiesta del siglo')).toBeVisible()
    await expect(page.getByText('Tía Marta')).toBeVisible()
    await page.waitForURL('/')
    await expect(page.getByRole('heading', { name: /23 años desde que nació este/ })).toBeVisible()
  })

  test('un QR inválido muestra la pantalla de ayuda', async ({ page }) => {
    await page.goto('/i/esto-no-es-un-token')
    await expect(page).toHaveURL(/\/qr-invalido$/)
    await expect(page.getByRole('heading', { name: 'Uy, este código no funciona' })).toBeVisible()
  })

  test('RF-18 · sin QR entra como visitante: ve el álbum pero no puede subir', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Para subir, comentar o dar like, escanea el QR de tu tarjeta')).toBeVisible()
    await page.goto('/subir')
    await expect(page).toHaveURL(/\/$/)
  })

  test('el menú tiene las secciones del invitado y no el admin (lateral en celular, barra en escritorio)', async ({ page, isMobile }) => {
    await page.goto(`/i/${TOKEN}`)
    await page.waitForURL('/')
    if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click()
    const nav = page.getByRole('navigation', { name: isMobile ? 'Menú principal' : 'Navegación' })
    await expect(nav.getByRole('link')).toHaveText(['Inicio', 'Subir recuerdos', 'Mis recuerdos', 'Mis likes', 'Descargar álbum'])
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0)
  })
})

test.describe('Admin en /admin', () => {
  // En desarrollo la página puede tardar en hidratarse: se reintenta hasta que el formulario responda
  async function login(page: Page, password: string, until: () => Promise<void>) {
    await page.goto('/admin')
    await expect(async () => {
      await page.getByLabel('Contraseña').fill(password)
      await page.getByRole('button', { name: 'Entrar' }).click()
      await until()
    }).toPass({ timeout: 30_000 })
  }

  test('pide contraseña y rechaza una incorrecta', async ({ page }) => {
    await login(page, 'incorrecta', () => expect(page.getByRole('alert').filter({ hasText: 'Contraseña incorrecta' })).toBeVisible({ timeout: 3000 }))
  })

  test('con la contraseña correcta crea un invitado y ve su QR', async ({ page }) => {
    await login(page, ADMIN_PASSWORD, () => expect(page.getByRole('heading', { name: 'Invitados' })).toBeVisible({ timeout: 5000 }))
    await page.getByRole('button', { name: 'Nuevo invitado' }).click()
    await page.getByLabel('Nombre del invitado').fill('Prima Valentina')
    await page.getByRole('button', { name: 'Guardar invitado' }).click()
    await expect(page.getByRole('img', { name: 'QR de Prima Valentina' })).toBeVisible()
  })
})
