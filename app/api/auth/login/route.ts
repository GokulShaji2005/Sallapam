// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { signToken, cookieOptions, COOKIE_NAME } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { z } from 'zod'

function getClientFingerprint(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  const userAgent = req.headers.get('user-agent')?.trim() ?? 'unknown-agent'
  const ip = forwardedFor || realIp || 'unknown-ip'
  return `${ip}:${userAgent}`
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase()

    const body = await req.json()
    const parsed = LoginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password format' },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data
    const clientFingerprint = getClientFingerprint(req)
    const rateLimitKey = `login:attempts:${email.toLowerCase()}:${clientFingerprint}`
    const attempts = await redis.get<number>(rateLimitKey) ?? 0

    if (attempts >= 5) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts — wait 15 minutes' },
        { status: 429 }
      )
    }

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      // Increment attempts even on "user not found" to prevent email enumeration
      await redis.set(rateLimitKey, attempts + 1, { ex: 60 * 15 })
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      await redis.set(rateLimitKey, attempts + 1, { ex: 60 * 15 })
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          error: 'Please verify your email before logging in',
        },
        { status: 403 }
      )
    }

    // Clear rate limit on successful login
    await redis.del(rateLimitKey)

    // Issue JWT
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
        publicKey: user.publicKey,
      }
    })

    response.cookies.set(COOKIE_NAME, token, cookieOptions)
    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}