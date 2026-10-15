// Obtiene el refresh token de Google para la cuenta del álbum y lo guarda en .env.local.
// Uso: npm run google:token  (requiere GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local)
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { exec } from 'node:child_process'

const ENV_FILE = '.env.local'
const PORT = 5555
const REDIRECT = `http://127.0.0.1:${PORT}/callback`
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/gmail.send']

function readEnv() {
  if (!existsSync(ENV_FILE)) return {}
  return Object.fromEntries(
    readFileSync(ENV_FILE, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
}

function writeEnv(key, value) {
  const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8').split(/\r?\n/) : []
  const i = lines.findIndex((l) => l.startsWith(`${key}=`))
  if (i >= 0) lines[i] = `${key}=${value}`
  else lines.push(`${key}=${value}`)
  writeFileSync(ENV_FILE, lines.filter((l, idx) => l !== '' || idx < lines.length - 1).join('\n') + '\n')
}

const env = readEnv()
if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  console.error('Falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en .env.local')
  process.exit(1)
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', REDIRECT)
  if (url.pathname !== '/callback') return res.end()
  const code = url.searchParams.get('code')
  if (!code) {
    res.end('No llegó el código de autorización. Revisa la consola.')
    return
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
  })
  const body = await tokenRes.json()
  if (!body.refresh_token) {
    console.error('Google no devolvió refresh token:', body.error ?? body)
    res.end('No se obtuvo el permiso. Revisa la consola.')
  } else {
    writeEnv('GOOGLE_REFRESH_TOKEN', body.refresh_token)
    console.log('Listo: GOOGLE_REFRESH_TOKEN guardado en .env.local')
    res.end('Listo. Ya puedes cerrar esta pestaña y volver a la terminal.')
  }
  server.close()
})

server.listen(PORT, '127.0.0.1', () => {
  console.log('Abriendo el navegador para autorizar la cuenta del álbum...')
  console.log('Si no se abre, copia este enlace:\n' + authUrl)
  const opener = process.platform === 'win32' ? `start "" "${authUrl}"` : process.platform === 'darwin' ? `open "${authUrl}"` : `xdg-open "${authUrl}"`
  exec(opener)
})
