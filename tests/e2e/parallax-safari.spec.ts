import { expect, test, type Page } from '@playwright/test'

// Corre con el motor de Safari en un iPhone (proyecto "iphone-safari"). Safari desincroniza las animaciones de scroll
// de CSS y al soltar el dedo las capas saltaban a otra posición; aquí se mueven con JavaScript, ligadas directo al scroll

const frames = (page: Page, n: number) =>
  page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        let i = 0
        const step = () => (++i >= n ? resolve() : requestAnimationFrame(step))
        requestAnimationFrame(step)
      }),
    n,
  )

test('al soltar el dedo la portada se queda donde está, aunque se haya bajado muy lejos y vuelto', async ({ page }) => {
  await page.goto('/')
  const banderines = page.getByTestId('capa-banderines')
  await expect(banderines).toBeVisible()
  // Espera a que la página cargue su JavaScript: ahí las capas reciben su posición
  await expect.poll(() => banderines.evaluate((el) => el.style.transform)).not.toBe('')
  await expect(page.locator('.parallax-scroll')).toHaveCount(0)
  const translateY = () => banderines.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)

  for (const y of [900, 150, 5000, 600, 1200, 0]) {
    await page.evaluate((y) => window.scrollTo(0, y), y)
    await frames(page, 2)
    const real = await page.evaluate(() => window.scrollY)
    const alLlegar = await translateY()
    // Banderines va a velocidad 0,25: se desplaza 0,75 px por cada px de scroll, hasta 1200 px como en Chrome
    expect(alLlegar).toBeCloseTo(Math.min(real, 1200) * 0.75, 0)
    await frames(page, 15)
    expect(await translateY()).toBe(alLlegar)
  }
})

test('al soltar el dedo las cards no se siguen acomodando', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-testid="media-frame"]').first()).toBeAttached()
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.will-change-transform')].some((el) => el.style.transform !== ''))).toBe(true)
  const posiciones = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="media-frame"]')]
        .map((frame) => frame.closest<HTMLElement>('.will-change-transform'))
        .filter((card): card is HTMLElement => {
          if (!card) return false
          const r = card.getBoundingClientRect()
          return r.bottom > 0 && r.top < innerHeight
        })
        .map((card) => new DOMMatrix(getComputedStyle(card).transform).m42),
    )

  for (const y of [1400, 2600, 1800]) {
    await page.evaluate((y) => window.scrollTo(0, y), y)
    await frames(page, 2)
    const alLlegar = await posiciones()
    expect(alLlegar.length).toBeGreaterThan(0)
    expect(alLlegar.some((ty) => ty !== 0)).toBe(true)
    await frames(page, 15)
    expect(await posiciones()).toEqual(alLlegar)
  }
})
