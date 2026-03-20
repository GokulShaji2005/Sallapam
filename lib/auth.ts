// lib/auth.ts
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET env variable is not set — check .env.local')
const COOKIE_NAME = 'auth-token'

export interface JWTPayload {
  userId: string
  email: string
  name: string
}

// Sign a new token
export function signToken(payload: JWTPayload, expiresIn: jwt.SignOptions['expiresIn'] = '7d'): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn })
}

// Verify a token — returns payload or null
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as JWTPayload
  } catch {
    return null
  }
}

// Get the logged-in user from the cookie (use inside API routes)
export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// Cookie options — HttpOnly prevents JS from reading it (XSS protection)
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  path: '/',
}

export { COOKIE_NAME }