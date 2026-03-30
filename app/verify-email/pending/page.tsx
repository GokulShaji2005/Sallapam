import { VerifyEmailPendingClient } from './pending-client'

type PendingPageProps = {
  searchParams: Promise<{ email?: string }>
}

export default async function VerifyEmailPendingPage({ searchParams }: PendingPageProps) {
  const params = await searchParams
  const email = typeof params.email === 'string' ? params.email : ''

  return <VerifyEmailPendingClient initialEmail={email} />
}
