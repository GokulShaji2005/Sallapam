import { cookies } from 'next/headers'
import EmailVerificationBanner from '@/components/EmailVerificationBanner'
import { SocketProvider } from '@/hooks/useSocket'

async function getIsVerified(): Promise<boolean> {
  try {
    // Read JWT from cookie to check isVerified without an extra DB call
    // isVerified is NOT in the JWT (it can change), so we do a quick API check
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/me`, {
      cache: 'no-store',
      headers: { cookie: (await cookies()).toString() },
    })
    if (!res.ok) return true // if we can't check, don't block the user with the banner
    const json = await res.json()
    return json.data?.isVerified ?? true
  } catch {
    return true
  }
}

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const isVerified = await getIsVerified()
  return (
    <SocketProvider>
      <EmailVerificationBanner isVerified={isVerified} />
      {children}
    </SocketProvider>
  )
}
