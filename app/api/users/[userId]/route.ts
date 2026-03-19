// app/api/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'
import mongoose from 'mongoose'

// GET /api/users/[userId]
// Returns safe profile fields — never passwordHash.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await params

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 })
  }

  await connectToDatabase()

  const user = await User.findById(
    userId,
    { _id: 1, name: 1, email: 1, phone: 1, publicKey: 1, isVerified: 1 } // safe fields only
  ).lean()

  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: user })
}
