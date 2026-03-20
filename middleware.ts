// middleware.ts  (root of project, next to package.json)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'auth-token'

// Pages that require login
const protectedRoutes = ['/chat', '/profile', '/settings']
// Pages that logged-in users shouldn't see
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const { pathname } = request.nextUrl

  let isLoggedIn = false

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
      await jwtVerify(token, secret)
      isLoggedIn = true
    } catch {
      // token invalid or expired
      isLoggedIn = false
    }
  }

  // Redirect logged-out users away from protected pages
  if (protectedRoutes.some(r => pathname.startsWith(r)) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from login/signup
  if (authRoutes.some(r => pathname.startsWith(r)) && isLoggedIn) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}