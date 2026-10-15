async function digest(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

export async function checkAdminPassword(input: string, expected: string | undefined): Promise<boolean> {
  if (!expected || !input) return false
  // Comparar hashes de igual longitud evita filtrar la longitud y el contenido por tiempo
  const [a, b] = await Promise.all([digest(input), digest(expected)])
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
