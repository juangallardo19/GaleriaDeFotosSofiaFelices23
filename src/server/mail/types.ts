export interface Mailer {
  send(message: { to: string; subject: string; text: string }): Promise<void>
}

export class ConsoleMailer implements Mailer {
  async send(message: { to: string; subject: string; text: string }) {
    console.info(`[correo a ${message.to}] ${message.subject}\n${message.text}`)
  }
}
