import { AppHeader } from '@/components/layout/AppHeader'
import { PageTitle } from '@/components/layout/PageTitle'
import { UploadScreen } from '@/components/upload/UploadScreen'

export const metadata = { title: 'Subir recuerdos · Álbum de Sofi' }

export default function SubirPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <PageTitle title="Captura tus" accent="Recuerdos" text="Sube las fotos y videos que tomaste en la fiesta." />
        <UploadScreen />
      </main>
    </>
  )
}
