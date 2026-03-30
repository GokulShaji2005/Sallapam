// app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value)
}

// GET /api/auth/me — returns the current logged-in user's profile including isVerified
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser || !isValidObjectId(authUser.userId)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    const user = await User.findById(authUser.userId, {
      _id: 1, name: 1, email: 1, phone: 1, publicKey: 1, isVerified: 1,
    }).lean()

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Me route error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
