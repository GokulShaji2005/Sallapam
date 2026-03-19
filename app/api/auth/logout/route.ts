// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'

// Shared logout logic — clears the auth cookie
function logoutResponse() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // immediately expires the cookie
    path: '/',
  })
  return response
}

// POST /api/auth/logout
export async function POST() {
  return logoutResponse()
}

// DELETE /api/auth/logout
export async function DELETE() {
  return logoutResponse()
}