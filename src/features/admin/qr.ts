export function guestUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/i/${token}`
}
