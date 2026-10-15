# Pruebas

Se escribieron **antes del código** (TDD): primero en rojo y luego se implementó hasta ponerlas en verde.

| Comando | Qué corre |
|---|---|
| `npm test` | Unitarias + integración + componentes (Vitest) |
| `npm run test:e2e` | Flujos completos en navegador (Playwright, celular y escritorio) |
| `npm run test:real` | Servicios reales: Neon, Drive, Blob y los archivos de `../MediaTest` (sube, verifica y borra) |
| `npm run test:e2e:real` | De punta a punta con servicios reales: un invitado sube los archivos de `../MediaTest` desde el celular y al final se borra todo |
| `npm run test:api` | Contrato de la API (colección de Postman con Newman) |
| `npm run test:carga` | Pico de 40 personas escaneando el QR en 10 s (k6) |

## Matriz de trazabilidad

| Requerimiento | Pruebas |
|---|---|
| RF-01 Login con QR | `unit/auth/token-y-sesion`, `integration/servicio-invitados`, `integration/rutas`, `e2e/qr-y-admin` |
| RF-01b Bienvenida con el nombre | `components/navegacion-y-flujos` (WelcomeScreen), `e2e` |
| RF-02 QR inválido | `unit/auth`, `integration/rutas`, `components` (página), `integration/proxy` |
| RF-03 Portada con parallax por capas | `unit/gallery/masonry-parallax`, `components/pantallas` (HeroParallax) |
| RF-04 Masonry | `unit/gallery/masonry-parallax`, `integration/servicio-medios` |
| RF-05 Card con autor y contadores | `components/galeria` (MediaCard) |
| RF-06 Subir varios archivos | `unit/media/archivos`, `unit/upload/*`, `integration/api-completa`, `components/pantallas` (UploadPicker) |
| RF-07 Descargar el original | `integration/servicio-medios`, `integration/api-completa`, `components/pantallas` (MediaViewer) |
| RF-08 Likes | `unit/social/comentarios-likes`, `integration/*`, `components/galeria` |
| RF-09 Comentarios, emojis y sticker | `unit/social`, `integration/*`, `components/navegacion-y-flujos`, `components/pantallas` |
| RF-10/11 Ordenar y filtrar | `unit/gallery/orden-filtros-paginas`, `integration/contrato-repositorios`, `components/pantallas` (SortSheet) |
| RF-12 Detalle y video en la página | `components/pantallas` (MediaViewer) |
| RF-13 Menú sin admin | `components/navegacion-y-flujos`, `e2e` |
| RF-14 Admin en /admin, QR y PDF | `unit/admin/*`, `integration/rutas`, `integration/api-completa`, `integration/proxy`, `components/admin-y-hooks`, `e2e` |
| RF-15 Moderación | `integration/servicio-medios`, `integration/api-completa` |
| RF-16 Resumen para descargar y carpetas de Drive | `integration/servicio-medios`, `integration/visitantes`, `unit/infra/google`, `components/pantallas` (DownloadSheet) |
| Quién está viendo (/api/me) y estado de la galería | `integration/quien-soy`, `unit/gallery/estado-galeria` |
| RF-18 Visitantes sin QR (solo ver y descargar) | `integration/visitantes`, `integration/servicio-medios`, `integration/proxy`, `integration/miniaturas`, `components/*` (readOnly), `e2e` |
| Fotos nuevas en vivo | `unit/gallery/vivo-y-presencia`, `components/galeria` (NewItemsPill) |
| Personas viendo el álbum | `unit/gallery/vivo-y-presencia`, `integration/rutas`, `components/galeria` |
| Alerta de almacenamiento por correo | `unit/infra/almacenamiento-y-cache`, `integration/servicio-medios`, `unit/infra/google` (Gmail) |
| RNF-01/02/03 Skeleton, color e miniaturas | `unit/media/archivos`, `unit/infra/miniaturas-blob`, `integration/miniaturas`, `components/galeria` |
| RNF-04 Paginación por cursor | `unit/gallery`, `integration/contrato-repositorios` (memoria y Postgres) |
| RNF-06 Subida reanudable | `unit/upload/partes-y-eta`, `unit/upload/subida-drive` |
| RNF-08/09 Cola, progreso, segundo plano | `unit/upload/cola`, `unit/upload/segundo-plano`, `components/admin-y-hooks` |
| RNF-10 1 GB y 30 por tanda | `unit/media/archivos`, `integration/api-completa` |
| RNF-15 Accesibilidad y reducir movimiento | `components/*`, `unit/gallery/masonry-parallax` |
| RNF-16 Caché | `unit/infra/almacenamiento-y-cache` |
| RNF-17 Seguridad (firma, límite de intentos) | `unit/auth`, `integration/rutas`, `integration/proxy` |
| Drive y Google | `unit/infra/google` |
| Pico de 40 personas | `load/pico-qr.js` |
