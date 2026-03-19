// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import VerificationToken from '@/models/VerificationToken'
import User from '@/models/User'
import { z } from 'zod'

const VerifySchema = z.object({ token: z.string().min(1) })

// POST /api/auth/verify-email
// No auth required — user may not be logged in yet.
export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = VerifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 })
  }

  await connectToDatabase()

  const record = await VerificationToken.findOne({
    token: parsed.data.token,
    expiresAt: { $gt: new Date() },
  })

  if (!record) {
    return NextResponse.json(
      { success: false, error: 'Link expired or invalid' },
      { status: 400 }
    )
  }

  // Mark user as verified
  await User.findByIdAndUpdate(record.userId, { isVerified: true })

  // Single-use: delete the token
  await VerificationToken.deleteOne({ _id: record._id })

  return NextResponse.json({ success: true })
}
