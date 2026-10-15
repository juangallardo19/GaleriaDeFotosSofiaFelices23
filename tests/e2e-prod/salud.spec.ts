import { expect, test } from '@playwright/test'

// Revisión rápida después de cada despliegue: páginas, recursos, conexión con Google y permisos de la API

test.describe('Páginas', () => {
  for (const path of ['/', '/descargar', '/privacidad', '/qr-invalido', '/admin']) {
    test(`${path} carga bien`, async ({ page }) => {
      const res = await page.goto(path)
      expect(res?.status()).toBe(200)
    })
  }

  for (const path of ['/subir', '/mis-recuerdos', '/mis-likes', '/bienvenida']) {
    test(`${path} sin QR lleva al álbum`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/$/)
    })
  }

  test('las secciones del admin piden iniciar sesión', async ({ page }) => {
    await page.goto('/admin/invitados')
    await expect(page).toHaveURL(/\/admin$/)
  })

  test('un QR inválido muestra la ayuda', async ({ page }) => {
    await page.goto('/i/esto-no-es-un-token')
    await expect(page).toHaveURL(/\/qr-invalido$/)
    await expect(page.getByRole('heading', { name: 'Uy, este código no funciona' })).toBeVisible()
  })

  test('el álbum no aparece en buscadores', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('la portada muestra todas las capas del parallax', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid^="capa-"] img')).toHaveCount(11)
    await expect(page.getByRole('link', { name: 'Desliza para ver los recuerdos' })).toBeVisible()
  })
})

test.describe('Recursos', () => {
  const ASSETS = [
    '/assets/papel.jpg',
    '/assets/banderines.webp',
    '/assets/banderines.png',
    '/assets/sofi.webp',
    '/assets/pastel.webp',
    '/assets/happy-birthday.webp',
    '/assets/globo-2.webp',
    '/assets/globo-3.webp',
    '/assets/corazon.webp',
    '/assets/estrella.webp',
    '/assets/placeholder-foto.webp',
    '/assets/placeholder-video.webp',
    '/assets/fondo/botellita-1.webp',
    '/stickers/gato-aplaudiendo.webp',
    '/icons/icon-192.png',
  ]
  for (const path of ASSETS) {
    test(`${path} existe`, async ({ request }) => {
      const res = await request.get(path)
      expect(res.status()).toBe(200)
      expect(res.headers()['content-type']).toMatch(/^image\//)
    })
  }
})

test.describe('API para visitantes', () => {
  test('sin QR se es visitante', async ({ request }) => {
    expect(await (await request.get('/api/me')).json()).toMatchObject({ role: 'visitor' })
  })

  test('la galería responde', async ({ request }) => {
    const res = await request.get('/api/media?sort=recientes&limit=24')
    expect(res.status()).toBe(200)
    expect(Array.isArray((await res.json()).items)).toBe(true)
  })

  test('Google Drive está conectado (carpetas de fotos y videos distintas)', async ({ request }) => {
    const { folders } = await (await request.get('/api/media/resumen')).json()
    expect(folders.all).toContain('drive.google.com')
    expect(new Set([folders.all, folders.photos, folders.videos]).size).toBe(3)
  })

  test('la presencia responde', async ({ request }) => {
    expect((await request.post('/api/presence')).status()).toBe(200)
  })
})

test.describe('API protegida', () => {
  const GUEST_ONLY: [string, string, unknown][] = [
    ['POST', '/api/uploads/init', { name: 'a.jpg', size: 10, type: 'image/jpeg' }],
    ['POST', '/api/media', {}],
    ['POST', '/api/media/x/like', {}],
    ['POST', '/api/media/x/comments', { text: 'hola' }],
  ]
  for (const [method, path, data] of GUEST_ONLY) {
    test(`${method} ${path} sin QR responde 401`, async ({ request }) => {
      const res = await request.fetch(path, { method, data })
      expect(res.status()).toBe(401)
      expect((await res.json()).message).toMatch(/QR/)
    })
  }

  for (const path of ['/api/admin/guests', '/api/admin/stats', '/api/admin/cards']) {
    test(`${path} sin sesión de admin responde 401`, async ({ request }) => {
      expect((await request.get(path)).status()).toBe(401)
    })
  }

  test('una contraseña de admin equivocada se rechaza', async ({ request }) => {
    const res = await request.post('/api/admin/login', { data: { password: 'esta-no-es-la-clave' } })
    expect(res.status()).toBe(401)
  })
})
