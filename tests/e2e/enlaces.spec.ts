import { expect, test } from '@playwright/test'

const ADMIN_PASSWORD = 'clave-admin-e2e'
const TOKEN = 'E2ETIAMARTA00000000000'

test('el admin ve el link de cada QR para enviarlo por WhatsApp, y el link general del álbum', async ({ page }) => {
  await page.goto('/admin')
  await expect(async () => {
    await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('heading', { name: 'Invitados' })).toBeVisible({ timeout: 5000 })
  }).toPass({ timeout: 30_000 })

  await page.goto('/admin/enlaces')
  const marta = page.getByRole('listitem', { name: 'Tía Marta' })
  await expect(marta).toContainText(`/i/${TOKEN}`)
  const whatsapp = marta.getByRole('link', { name: 'Enviar a Tía Marta por WhatsApp' })
  const href = new URL((await whatsapp.getAttribute('href'))!)
  expect(href.origin).toBe('https://wa.me')
  expect(href.searchParams.get('text')).toContain(`/i/${TOKEN}`)

  // El link personal entra igual que el QR
  const res = await page.request.get(`/i/${TOKEN}`, { maxRedirects: 0 })
  expect(res.headers().location).toContain('/bienvenida')

  await expect(page.getByRole('region', { name: 'Link general del álbum' })).toContainText(new URL(page.url()).origin)
})
