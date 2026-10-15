import { expect, test } from '@playwright/test'

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

  test('sin haber escaneado no puede ver el álbum', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/qr-invalido$/)
  })

  test('el menú tiene las secciones del invitado y no el admin', async ({ page }) => {
    await page.goto(`/i/${TOKEN}`)
    await page.waitForURL('/')
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    const nav = page.getByRole('navigation', { name: 'Menú principal' })
    await expect(nav.getByRole('link')).toHaveText(['Inicio', 'Subir recuerdos', 'Mis recuerdos', 'Mis likes', 'Descargar álbum'])
  })
})

test.describe('Admin en /admin', () => {
  test('pide contraseña y rechaza una incorrecta', async ({ page }) => {
    await page.goto('/admin')
    await page.getByLabel('Contraseña').fill('incorrecta')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toHaveText('Contraseña incorrecta')
  })

  test('con la contraseña correcta crea un invitado y ve su QR', async ({ page }) => {
    await page.goto('/admin')
    await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('heading', { name: 'Invitados' })).toBeVisible()
    await page.getByRole('button', { name: 'Nuevo invitado' }).click()
    await page.getByLabel('Nombre del invitado').fill('Prima Valentina')
    await page.getByRole('button', { name: 'Guardar invitado' }).click()
    await expect(page.getByRole('img', { name: 'QR de Prima Valentina' })).toBeVisible()
  })
})
