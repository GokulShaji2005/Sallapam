import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// Protected routes that require authentication
const PROTECTED_PATHS = ["/chat", "/api/chats", "/api/messages", "/api/users", "/api/invitations"];

// Auth routes — redirect to /chat if already logged in
const AUTH_PATHS = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));

  // Verify JWT for protected routes
  if (isProtected) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      verifyToken(token);
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath && token) {
    try {
      verifyToken(token);
      return NextResponse.redirect(new URL("/chat", request.url));
    } catch {
      // Token invalid, allow access to auth pages
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
