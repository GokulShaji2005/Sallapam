'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type PendingClientProps = {
  initialEmail: string
}

export function VerifyEmailPendingClient({ initialEmail }: PendingClientProps) {
  const [email, setEmail] = useState(initialEmail)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const canResend = useMemo(() => /\S+@\S+\.\S+/.test(email), [email])

  async function handleResend() {
    if (!canResend || isSubmitting) return

    setIsSubmitting(true)
    setMessage('')

    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setMessage('If this account exists and is not verified, a new verification email has been sent.')
    } catch {
      setMessage('Could not send email right now. Please try again in a moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 border"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <h1 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Verify your email
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          We sent a verification link to your inbox. Please verify your email before logging in.
        </p>

        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          Email address
        </label>
        <input
          className="w-full px-4 py-3 border rounded-xl text-sm outline-none"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend || isSubmitting}
          className="w-full mt-4 py-3 text-white rounded-xl text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {isSubmitting ? 'Sending...' : 'Resend verification email'}
        </button>

        {message && (
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            {message}
          </p>
        )}

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
          Already verified?{' '}
          <Link href="/login" className="hover:underline" style={{ color: 'var(--accent)' }}>
            Go to login
          </Link>
        </p>
      </div>
    </div>
  )
}
