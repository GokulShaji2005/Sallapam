// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import User from '@/models/User'
import VerificationToken from '@/models/VerificationToken'
import bcrypt from 'bcryptjs'
import { signToken, cookieOptions, COOKIE_NAME } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'

// Validate the request body shape
const SignupSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  // publicKey: z.string().min(1), // base64 public key from tweetnacl — re-enable when needed
})

export async function POST(req: NextRequest) {
  try {
    // Rate limiting — max 5 signup attempts per IP per hour
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const rateLimitKey = `signup:attempts:${ip}`
    const attempts = await redis.get<number>(rateLimitKey) ?? 0

    if (attempts >= 5) {
      return NextResponse.json(
        { success: false, error: 'Too many signup attempts — wait 1 hour' },
        { status: 429 }
      )
    }

    await connectToDatabase()

    const body = await req.json()
    const parsed = SignupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    // Normalise phone — strip all non-digit characters so "+91 98765 43210" and "9876543210" match
    const phone = parsed.data.phone.replace(/\D/g, '')

    // Check if user already exists
    const existing = await User.findOne({ $or: [{ email }, { phone }] })
    if (existing) {
      // Count as an attempt to prevent email/phone enumeration via timing
      await redis.set(rateLimitKey, attempts + 1, { ex: 60 * 60 })
      return NextResponse.json(
        { success: false, error: 'Email or phone already registered' },
        { status: 409 }
      )
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create the user
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      // publicKey,      // re-enable when E2E encryption is added back
      // firebaseUid,    // re-enable when Firebase OTP is added back
      isVerified: false, // set to true once email/OTP verification is added
    })

    // Send verification email (fire-and-forget — failure must not block signup)
    try {
      const verifyToken = crypto.randomUUID()
      await VerificationToken.create({
        userId: user._id,
        token: verifyToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      })
      const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verifyToken}`
      await sendEmail({
        to: user.email,
        subject: 'Verify your email address — Sallapam',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#7c5cfc;">Welcome to Sallapam, ${user.name}!</h2>
            <p>Please verify your email address to unlock all features.</p>
            <a href="${verifyUrl}"
               style="display:inline-block;margin:16px 0;padding:12px 28px;
                      background:#7c5cfc;color:#fff;border-radius:8px;
                      text-decoration:none;font-weight:600;">
              Verify Email
            </a>
            <p style="color:#888;font-size:13px;">This link expires in 24 hours.</p>
          </div>
        `,
      })
    } catch (emailErr) {
      // Non-fatal — user can resend from the banner
      console.error('Signup verification email failed:', emailErr)
    }

    // Issue JWT and set cookie
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    })

    const response = NextResponse.json({
      success: true,
      data: {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
      }
    }, { status: 201 })

    response.cookies.set(COOKIE_NAME, token, cookieOptions)
    return response

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error — please try again' },
      { status: 500 }
    )
  }
}