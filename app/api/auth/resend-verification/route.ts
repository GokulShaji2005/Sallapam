// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import User from '@/models/User'
import VerificationToken from '@/models/VerificationToken'
import { sendEmail } from '@/lib/email'
import { redis } from '@/lib/redis'
import { z } from 'zod'

const ResendSchema = z.object({
  email: z.string().email(),
})

function getClientFingerprint(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  const userAgent = req.headers.get('user-agent')?.trim() ?? 'unknown-agent'
  const ip = forwardedFor || realIp || 'unknown-ip'
  return `${ip}:${userAgent}`
}

// POST /api/auth/resend-verification
// Accepts email and responds generically to avoid account enumeration.
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: true })
  }

  const parsed = ResendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: true })
  }

  const email = parsed.data.email.toLowerCase().trim()
  const clientFingerprint = getClientFingerprint(req)
  const rateLimitKey = `resend-verification:${email}:${clientFingerprint}`
  const attempts = (await redis.get<number>(rateLimitKey)) ?? 0

  if (attempts >= 5) {
    return NextResponse.json({ success: true })
  }

  await redis.set(rateLimitKey, attempts + 1, { ex: 60 * 60 })

  await connectToDatabase()

  const user = await User.findOne({ email })
  if (!user || user.isVerified) return NextResponse.json({ success: true })

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
