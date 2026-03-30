import { Suspense } from 'react'
import { VerifyEmailClient } from './verify-email-client'

function VerifyEmailFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Loading verification...
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Please wait
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailClient />
    </Suspense>
  )
}
