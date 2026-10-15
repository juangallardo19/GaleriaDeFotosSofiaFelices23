import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { checkAdminPassword } from '@/features/auth/admin-password'
import { getContainer } from '@/server/container'
import { AppError } from '@/server/errors'
import { clientIp, errorResponse, readJson, setAdminCookie } from '@/server/http'

const Body = z.object({ password: z.string().min(1).max(200) })

export async function POST(req: NextRequest) {
  try {
    const app = await getContainer()
    if (!app.adminLimiter.hit(clientIp(req))) throw new AppError('limite', 'Demasiados intentos, espera un minuto')
    const parsed = Body.safeParse(await readJson(req))
    if (!parsed.success) throw new AppError('invalido')
    if (!(await checkAdminPassword(parsed.data.password, app.config.adminPassword))) throw new AppError('no-autorizado', 'Contraseña incorrecta')
    const res = new NextResponse(null, { status: 204 })
    await setAdminCookie(res, app)
    return res
  } catch (err) {
    return errorResponse(err)
  }
}
