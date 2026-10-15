import { AppHeader } from '@/components/layout/AppHeader'
import { PageTitle } from '@/components/layout/PageTitle'
import { GalleryApp } from '@/components/gallery/GalleryApp'

export const metadata = { title: 'Mis likes · Álbum de Sofi' }

export default function MisLikesPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 px-4 md:px-8">
        <PageTitle title="Los recuerdos que más te gustaron" accent="Mis Likes" />
        <div className="mx-auto max-w-[1440px]">
          <GalleryApp
            mode="likes"
            empty={{
              title: 'Aún no le has dado amor a ningún recuerdo',
              text: 'Toca el corazón en las fotos que más te gusten y aparecerán aquí.',
              action: { label: 'Explorar el álbum', href: '/' },
            }}
          />
        </div>
      </main>
    </>
  )
}
