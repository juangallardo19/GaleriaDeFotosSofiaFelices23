import type { GoogleAuth } from '../google/auth'
import type { Mailer } from './types'

const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64')

export class GmailMailer implements Mailer {
  private readonly fetchFn: typeof fetch

  constructor(private readonly opts: { auth: GoogleAuth; from: string; fetch?: typeof fetch }) {
    this.fetchFn = opts.fetch ?? fetch
  }

  async send(message: { to: string; subject: string; text: string }) {
    const mime = [
      `From: Álbum de Sofi <${this.opts.from}>`.replace('Álbum', `=?UTF-8?B?${b64('Álbum')}?=`),
      `To: ${message.to}`,
      `Subject: =?UTF-8?B?${b64(message.subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64(message.text),
    ].join('\r\n')
    const token = await this.opts.auth.accessToken()
    const res = await this.fetchFn(SEND_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ raw: Buffer.from(mime, 'utf8').toString('base64url') }),
    })
    if (!res.ok) throw new Error(`Gmail no envió el correo (${res.status})`)
  }
}
