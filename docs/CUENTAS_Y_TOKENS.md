# Cuentas y tokens (lo que hay que conseguir)

Todo va en el archivo `.env.local` de tu computador (no se sube a GitHub) y luego en Vercel → Settings → Environment Variables. **Nunca pegues contraseñas ni tokens en el chat.**

## 1. Vercel (hosting)
1. Entra a vercel.com con tu cuenta de GitHub.
2. *Add New → Project* → importa `GaleriaDeFotosSofiaFelices23`.
3. En *Settings → Domains* elige el subdominio: por ejemplo `sofi23.vercel.app`. Esa es la URL que irá en los QR.

## 2. Base de datos y miniaturas (en Vercel)
1. Proyecto → *Storage → Create → Neon (Postgres)* → plan gratis → conectar al proyecto. Queda `DATABASE_URL`.
2. *Storage → Create → Blob* → conectar. Queda `BLOB_READ_WRITE_TOKEN`.
3. Copia ambas variables a tu `.env.local` (*Storage → .env.local → Copy*).

## 3. Google Cloud (Drive y correo) con la cuenta del álbum
Entra a console.cloud.google.com **con sofiacumpleanosgaleriadefotos@gmail.com**.

1. Crea un proyecto: "Album Sofi 23".
2. *APIs y servicios → Biblioteca*: habilita **Google Drive API** y **Gmail API**.
3. *Pantalla de consentimiento de OAuth*:
   - Tipo **Externo**. Nombre "Álbum de Sofi". Correo de soporte: el del álbum.
   - Permisos: `.../auth/drive.file` y `.../auth/gmail.send`.
   - Al final, **Publicar app → En producción**. Si queda en "Prueba", el permiso vence a los 7 días y la subida se caería a mitad de semana.
4. *Credenciales → Crear → ID de cliente de OAuth* → tipo **App de escritorio**. Copia el ID y el secreto en `.env.local` como `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
5. *Credenciales → Crear → Clave de API* → restríngela a **Google Drive API**. Va en `GOOGLE_API_KEY`; sirve para reproducir los videos en la página.
6. En la terminal del proyecto: `npm run google:token`. Se abre Google: entra con la cuenta del álbum y acepta. Aparecerá un aviso de "app no verificada": dale *Avanzado → Ir a Álbum de Sofi*. El script guarda `GOOGLE_REFRESH_TOKEN` solo.

## 4. Secretos propios
- `SESSION_SECRET`: lo genero yo (texto aleatorio largo).
- `ADMIN_PASSWORD`: la genero yo y te la paso para que la guardes.

## 5. Crear las tablas
`npm run db:setup`

## 6. Archivos para las pruebas reales
Crea la carpeta `test-media/` dentro del proyecto (está ignorada por git) y pon ahí:
- 3 o 4 fotos de iPhone (HEIC) y de Android (JPG).
- 2 videos de iPhone (.MOV) y 1 de Android (.MP4), ojalá uno grande (más de 300 MB).

Los demás formatos y tamaños (PNG, WebP, archivos enormes, PDF y MP3 para verificar que se rechazan) los genero yo automáticamente.
