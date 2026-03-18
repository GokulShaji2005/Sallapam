// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { adminAuth } from '@/lib/firebase-admin'
import User from '@/models/User'
import Key from '@/models/Key'
import bcrypt from 'bcryptjs'
import { signToken, cookieOptions, COOKIE_NAME } from '@/lib/auth'
import { z } from 'zod'

// Validate the request body shape
const SignupSchema = z.object({
  firebaseIdToken: z.string().min(1),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  publicKey: z.string().min(1), // base64 public key from tweetnacl
})

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    const body = await req.json()
    const parsed = SignupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { firebaseIdToken, name, email, phone, password, publicKey } = parsed.data

    // Step 1: Verify the Firebase ID token
    // This confirms the user actually completed OTP verification
    let firebaseUser
    try {
      firebaseUser = await adminAuth.verifyIdToken(firebaseIdToken)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid Firebase token — OTP may have expired' },
        { status: 401 }
      )
    }

    // Step 2: Check if user already exists
    const existing = await User.findOne({ $or: [{ email }, { phone }] })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email or phone already registered' },
        { status: 409 }
      )
    }

    // Step 3: Hash the password
    const passwordHash = await bcrypt.hash(password, 12)

    // Step 4: Create the user
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      publicKey,
      firebaseUid: firebaseUser.uid,
      isVerified: true,
    })

    // Step 5: Save the public key to the Keys collection too
    await Key.create({
      userId: user._id,
      publicKey,
    })

    // Step 6: Issue JWT and set cookie
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