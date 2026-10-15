const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateGuestToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(16)))
}

export function isTokenFormatValid(token: string): boolean {
  return TOKEN_PATTERN.test(token)
}
