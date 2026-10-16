import { expect, test } from '@playwright/test'

// Con un scroll rapidísimo (un salto de cientos de píxeles en un cuadro) las capas no deben quedarse atrás ni saltar:
// la animación ligada al scroll las pone en su lugar en el mismo cuadro
test('el parallax de la portada sigue al scroll aunque sea rapidísimo', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.parallax-scroll')).toHaveCount(11)
  const frame = () => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
  const banderines = page.getByTestId('capa-banderines').locator('.parallax-scroll')

  for (const y of [900, 150, 1200, 0]) {
    await page.evaluate((y) => window.scrollTo(0, y), y)
    await frame()
    const real = await page.evaluate(() => window.scrollY)
    const translateY = await banderines.evaluate((el) => Number.parseFloat(getComputedStyle(el).translate.split(' ')[1] ?? '0') || 0)
    // Banderines va a velocidad 0,25: se desplaza 0,75 px por cada px de scroll
    expect(translateY).toBeCloseTo(Math.min(real, 1200) * 0.75, 0)
  }
})

test('las cards y el fondo usan parallax ligado al scroll', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
  await expect(page.locator('[data-testid="media-frame"]').first()).toBeAttached()
  const conVista = await page.locator('.parallax-vista').count()
  expect(conVista).toBeGreaterThan(0)
})
