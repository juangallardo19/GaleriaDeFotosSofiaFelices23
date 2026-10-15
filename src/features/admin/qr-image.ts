import QRCode from 'qrcode'

// Corrección de errores alta: el QR sigue leyéndose aunque la tarjeta se doble o se manche
const OPTIONS = { errorCorrectionLevel: 'H' as const, margin: 1, width: 600, color: { dark: '#5A1238', light: '#FFFFFF' } }

export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, OPTIONS)
}

export async function qrPng(text: string): Promise<Uint8Array> {
  return new Uint8Array(await QRCode.toBuffer(text, { ...OPTIONS, type: 'png' }))
}
