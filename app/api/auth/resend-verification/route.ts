// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'
import VerificationToken from '@/models/VerificationToken'
import { sendEmail } from '@/lib/email'

// POST /api/auth/resend-verification
// Auth required — user must be logged in to resend.
export async function POST(_req: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  await connectToDatabase()

  const user = await User.findById(authUser.userId)
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  if (user.isVerified) {
    return NextResponse.json(
      { success: false, error: 'Your email is already verified' },
      { status: 400 }
    )
  }

  // Remove any existing token for this user
  await VerificationToken.deleteMany({ userId: user._id })

  // Generate a fresh token
  const token = crypto.randomUUID()
  await VerificationToken.create({
    userId: user._id,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`

  await sendEmail({
    to: user.email,
    subject: 'Verify your email address — Sallapam',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#7c5cfc;">Verify your email</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:#7c5cfc;
                  color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Verify Email
        </a>
        <p style="color:#888;font-size:13px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
