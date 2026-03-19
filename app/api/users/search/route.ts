// app/api/users/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'

// GET /api/users/search?email=someone@example.com
// Returns the matched user (safe fields only), or data: null if not found.
// Null is intentional — the UI shows an "invite them" button when null.
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ success: false, error: 'email query param is required' }, { status: 400 })
  }

  await connectToDatabase()

  const user = await User.findOne(
    {
      email,
      _id: { $ne: authUser.userId }, // exclude the currently logged-in user
    },
    { _id: 1, name: 1, email: 1, publicKey: 1 } // never return passwordHash
  ).lean()

  return NextResponse.json({ success: true, data: user ?? null })
}
