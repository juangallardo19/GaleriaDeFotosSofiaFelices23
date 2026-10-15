import { AppHeader } from '@/components/layout/AppHeader'
import { BackgroundCats } from '@/components/gallery/BackgroundCats'
import { GalleryApp } from '@/components/gallery/GalleryApp'
import { HomeHero } from '@/components/hero/HomeHero'

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <HomeHero />
        <div className="relative isolate px-4 md:px-8">
          <BackgroundCats />
          <div className="mx-auto max-w-[1440px]">
            <GalleryApp
              mode="todo"
              empty={{ title: 'El álbum está esperando sus primeros recuerdos', text: 'Las fotos y videos de la fiesta aparecerán aquí apenas alguien los suba.' }}
            />
          </div>
        </div>
      </main>
    </>
  )
}
