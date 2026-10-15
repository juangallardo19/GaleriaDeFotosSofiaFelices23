import { NextResponse, type NextRequest } from 'next/server'
import { presenceLabel } from '@/features/presence/presence'
import { getContainer } from '@/server/container'
import { errorResponse, requireViewer } from '@/server/http'

export async function POST(req: NextRequest) {
  try {
    const app = await getContainer()
    const viewer = await requireViewer(req, app)
    if (viewer.role === 'guest') await app.guests.heartbeat(viewer.id)
    const online = await app.guests.onlineCount()
    return NextResponse.json({ online, label: presenceLabel(online) })
  } catch (err) {
    return errorResponse(err)
  }
}
