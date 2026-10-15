import { AppHeader } from '@/components/layout/AppHeader'
import { PageTitle } from '@/components/layout/PageTitle'
import { DownloadScreen } from '@/components/gallery/DownloadScreen'

export const metadata = { title: 'Descargar el álbum · Álbum de Sofi' }

export default function DescargarPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 px-4 pb-16">
        <PageTitle title="Llévate los recuerdos" accent="Descargar" />
        <DownloadScreen />
      </main>
    </>
  )
}
