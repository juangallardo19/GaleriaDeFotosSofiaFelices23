import type { Metadata, Viewport } from 'next'
import { Montserrat, Pinyon_Script, Radley } from 'next/font/google'
import { UploadDockContainer } from '@/components/upload/UploadDockContainer'
import { UploadProvider } from '@/components/upload/UploadProvider'
import './globals.css'

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' })
const radley = Radley({ subsets: ['latin'], weight: '400', variable: '--font-radley', display: 'swap' })
const pinyon = Pinyon_Script({ subsets: ['latin'], weight: '400', variable: '--font-pinyon', display: 'swap' })

export const metadata: Metadata = {
  title: 'Álbum de Sofi · 23',
  description: 'Las fotos y videos de los 23 años de Sofi.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#FFF7F0',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${montserrat.variable} ${radley.variable} ${pinyon.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <UploadProvider>
          {children}
          <UploadDockContainer />
        </UploadProvider>
      </body>
    </html>
  )
}
