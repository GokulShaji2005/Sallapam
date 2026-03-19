'use client'

import { useRouter } from 'next/navigation'
import { Socket } from 'socket.io-client'

// ─── useLogout ────────────────────────────────────────────────────────────────
// Returns a logout() function you can call from any component.
//
// Usage:
//   const logout = useLogout()
//   <button onClick={() => logout(socket)}>Sign out</button>

export function useLogout() {
  const router = useRouter()

  return async function logout(socket?: Socket | null) {
    // 1. Clear the HttpOnly auth-token cookie server-side
    await fetch('/api/auth/logout', { method: 'DELETE' })

    // 2. Remove the encrypted private key from localStorage
    try {
      localStorage.removeItem('_pk')
    } catch {
      // localStorage may not be available in SSR — safe to ignore
    }

    // 3. Disconnect the socket if one was passed in
    if (socket?.connected) {
      socket.disconnect()
    }

    // 4. Redirect to login
    router.push('/login')
  }
}
