import { AppHeader } from '@/components/layout/AppHeader'
import { PageTitle } from '@/components/layout/PageTitle'
import { BackgroundCats } from '@/components/gallery/BackgroundCats'
import { GalleryApp } from '@/components/gallery/GalleryApp'

export const metadata = { title: 'Mis recuerdos · Álbum de Sofi' }

export default function MisRecuerdosPage() {
  return (
    <>
      <AppHeader />
      <main className="relative isolate flex-1 px-4 md:px-8">
        <BackgroundCats />
        <PageTitle title="Lo que tú capturaste" accent="Mis Recuerdos" text="Todo lo que has subido. Puedes borrar lo que ya no quieras que esté." />
        <div className="mx-auto max-w-[1440px]">
          <GalleryApp
            mode="mios"
            empty={{ title: 'Todavía no has subido recuerdos', text: 'Las fotos y videos que subas aparecerán aquí.', action: { label: 'Subir recuerdos', href: '/subir' } }}
          />
        </div>
      </main>
    </>
  )
}
