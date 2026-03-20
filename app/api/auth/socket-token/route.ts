import { NextResponse } from 'next/server'
import { getAuthUser, signToken } from '@/lib/auth'

// GET /api/auth/socket-token
// Issues a short-lived JWT for Socket.IO auth without exposing the cookie token.
export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const token = signToken(
    {
      userId: authUser.userId,
      email: authUser.email,
      name: authUser.name,
    },
    '10m'
  )

  return NextResponse.json({ success: true, data: { token } })
}