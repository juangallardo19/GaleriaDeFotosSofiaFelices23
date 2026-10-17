import { expect, test } from '@playwright/test'

const ADMIN_PASSWORD = 'clave-admin-e2e'

test('el admin agrega capitanes de mesa, ve su tarjeta para la botella y la puede cambiar', async ({ page }) => {
  // La lista se guarda completa y es una sola: dos corridas a la vez se pisarían; basta la de escritorio
  test.skip(test.info().project.name !== 'escritorio', 'Una sola corrida para no pisar la misma lista')
  const nombre = `Capitana ${Date.now()}`
  page.on('dialog', (d) => void d.accept())
  await page.goto('/admin')
  await expect(async () => {
    await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('heading', { name: 'Invitados' })).toBeVisible({ timeout: 5000 })
  }).toPass({ timeout: 30_000 })

  await page.goto('/admin/capitanes')
  await expect(page.getByRole('heading', { name: 'Capitanes de mesa' })).toBeVisible()
  // Espera a que la página cargue su JavaScript y la lista
  await expect(page.getByText('Todavía no hay capitanes de mesa.').or(page.getByRole('list', { name: 'Capitanes' }))).toBeVisible()
  await page.getByLabel('Nombre', { exact: true }).fill(nombre)
  await page.getByRole('radio', { name: 'Capitana', exact: true }).check()
  await page.getByRole('button', { name: 'Agregar' }).click()
  const fila = page.getByRole('listitem', { name: nombre })
  await expect(fila).toContainText('Capitana de mesa')
  await expect(page.getByTestId('vista-capitan-nombre')).not.toHaveText('')

  const pdf = await page.request.get('/api/admin/capitanes/tarjetas?ver=1')
  expect(pdf.headers()['content-type']).toBe('application/pdf')
  expect(pdf.headers()['content-disposition']).toMatch(/^inline;/)

  await fila.getByRole('button', { name: `Editar a ${nombre}` }).click()
  await page.getByRole('textbox', { name: `Nuevo nombre de ${nombre}` }).fill(`${nombre} Gómez`)
  await page.getByRole('button', { name: 'Guardar' }).click()
  const renombrada = page.getByRole('listitem', { name: `${nombre} Gómez` })
  await expect(renombrada).toBeVisible()

  await renombrada.getByRole('button', { name: `Borrar a ${nombre} Gómez` }).click()
  await expect(renombrada).toHaveCount(0)
})
