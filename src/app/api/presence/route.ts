import { NextResponse, type NextRequest } from 'next/server'
import { presenceLabel } from '@/features/presence/presence'
import { getContainer } from '@/server/container'
import { errorResponse, viewerOrVisitor } from '@/server/http'

export async function POST(req: NextRequest) {
  try {
    const app = await getContainer()
    const viewer = await viewerOrVisitor(req, app)
    if (viewer.role === 'guest') await app.guests.heartbeat(viewer.id)
    const online = await app.guests.onlineCount()
    return NextResponse.json({ online, label: presenceLabel(online) })
  } catch (err) {
    return errorResponse(err)
  }
}
