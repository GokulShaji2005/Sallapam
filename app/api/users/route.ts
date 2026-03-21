import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongoose'
import User from '@/models/User'

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  await connectToDatabase()

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limitRaw = Number(req.nextUrl.searchParams.get('limit') ?? '30')
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(100, Math.trunc(limitRaw)))
    : 30

  const baseFilter = {
    _id: { $ne: authUser.userId },
  }

  const filter = q
    ? {
      ...baseFilter,
      $or: [
        { name: { $regex: escapeRegex(q), $options: 'i' } },
        { email: { $regex: escapeRegex(q), $options: 'i' } },
      ],
    }
    : baseFilter

  const users = await User.find(filter, {
    _id: 1,
    name: 1,
    email: 1,
    publicKey: 1,
  })
    .sort({ name: 1 })
    .limit(limit)
    .lean()

  return NextResponse.json({ success: true, data: users }, { status: 200 })
}

export async function PATCH(_req: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Implement profile update with field-level validation and authorization.
  return NextResponse.json(
    { success: false, error: 'Not implemented' },
    { status: 501 }
  )
}
