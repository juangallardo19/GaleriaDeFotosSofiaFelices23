import { AppHeader } from '@/components/layout/AppHeader'
import { PageTitle } from '@/components/layout/PageTitle'
import { GalleryApp } from '@/components/gallery/GalleryApp'

export const metadata = { title: 'Mis recuerdos · Álbum de Sofi' }

export default function MisRecuerdosPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 px-4 md:px-8">
        <PageTitle title="Lo que tú capturaste" accent="Mis Recuerdos" text="Todo lo que has subido. Toca «Seleccionar» para borrar varios de una vez." />
        <div className="mx-auto max-w-[1440px]">
          <GalleryApp
            mode="mios"
            selectable
            empty={{ title: 'Todavía no has subido recuerdos', text: 'Las fotos y videos que subas aparecerán aquí.', action: { label: 'Subir recuerdos', href: '/subir' } }}
          />
        </div>
      </main>
    </>
  )
}
