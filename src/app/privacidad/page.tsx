export const metadata = { title: 'Privacidad · Álbum de Sofi' }

const CONTACT = 'sofiacumpleanosgaleriadefotos@gmail.com'

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 leading-relaxed">
      <p className="font-script text-5xl text-fucsia">Sofi</p>
      <h1 className="mt-2 font-serif text-3xl">Política de privacidad</h1>
      <p className="mt-1 text-sm opacity-70">Álbum de fotos de los 23 años de Sofi · Actualizada el 15 de octubre de 2026</p>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-xl">Qué es este sitio</h2>
        <p>Un álbum de fotos y videos de la fiesta de cumpleaños de Sofi. Cada invitado tiene una tarjeta con un código QR personal para subir recuerdos, comentar y dar like. Quien abre el enlace del álbum sin QR solo puede verlo y descargar.</p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-xl">Qué datos guardamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>El nombre de cada invitado, que escriben los anfitriones al crear su tarjeta.</li>
          <li>Las fotos y videos que cada invitado decide subir, con su fecha.</li>
          <li>Los likes, comentarios y la cantidad de descargas de cada recuerdo.</li>
          <li>La fecha de la última visita, para mostrar cuántas personas están viendo el álbum.</li>
        </ul>
        <p>No pedimos correo, teléfono ni contraseña a los invitados.</p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-xl">Dónde se guardan</h2>
        <p>
          Los archivos originales se guardan en la cuenta de Google Drive del álbum ({CONTACT}). Las miniaturas y los datos del álbum se guardan en los servicios de
          Vercel y Neon que alojan el sitio.
        </p>
        <p>
          El sitio usa el permiso de Google Drive solo para crear y leer los archivos que el propio álbum sube, y el permiso de Gmail solo para enviar avisos de
          almacenamiento a la cuenta del álbum. No accede a ningún otro archivo ni correo.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-xl">Quién puede verlos</h2>
        <p>Cualquier persona que tenga el enlace del álbum, que no aparece en buscadores. Los archivos se pueden descargar con su enlace. No se venden ni se comparten con terceros.</p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-xl">Cuánto tiempo</h2>
        <p>El álbum estará disponible al menos tres meses después de la fiesta. Cada invitado puede borrar lo que subió, y los anfitriones pueden borrar cualquier recuerdo.</p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-xl">Contacto</h2>
        <p>
          Para borrar o corregir algo, escribe a <a className="text-fucsia underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>
    </main>
  )
}
