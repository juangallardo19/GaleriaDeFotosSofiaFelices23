// Prueba de estrés: "¡escaneen el QR!" — 40 personas entran en 10 segundos.
// Uso: k6 run -e BASE_URL=https://<preview>.vercel.app -e TOKENS=tok1,tok2,... tests/load/pico-qr.js
// Correr contra un despliegue de prueba con almacenamiento simulado, nunca contra el Drive real.
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE = __ENV.BASE_URL || 'http://localhost:3000'
const TOKENS = (__ENV.TOKENS || 'E2ETIAMARTA00000000000').split(',')

export const options = {
  scenarios: {
    pico: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 40 },
        { duration: '1m', target: 40 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{tipo:qr}': ['p(95)<800'],
    'http_req_duration{tipo:galeria}': ['p(95)<800'],
    'http_req_duration{tipo:presencia}': ['p(95)<500'],
  },
}

export default function () {
  const token = TOKENS[(__VU - 1) % TOKENS.length]
  const jar = http.cookieJar()

  const qr = http.get(`${BASE}/i/${token}`, { redirects: 0, tags: { tipo: 'qr' } })
  check(qr, { 'QR redirige a la bienvenida': (r) => r.status === 307 && String(r.headers.Location).includes('/bienvenida') })

  for (let i = 0; i < 5; i++) {
    const page = http.get(`${BASE}/api/media?sort=recientes&limit=24`, { tags: { tipo: 'galeria' } })
    check(page, { 'galería 200': (r) => r.status === 200 })
    http.post(`${BASE}/api/presence`, null, { tags: { tipo: 'presencia' } })
    sleep(2 + Math.random() * 3)
  }
  jar.clear(BASE)
}
