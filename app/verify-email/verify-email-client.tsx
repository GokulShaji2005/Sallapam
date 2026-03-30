'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Status = 'loading' | 'success' | 'error' | 'no-token'

export function VerifyEmailClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'no-token')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) return

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) setStatus('success')
        else {
          setStatus('error')
          setErrorMsg(json.error ?? 'Verification failed')
        }
      })
      .catch(() => {
        setStatus('error')
        setErrorMsg('Network error — please try again')
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center fade-up"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        {status === 'loading' && (
          <>
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}
            >
              <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeOpacity="0.3" strokeWidth="3" />
                <path d="M22 12a10 10 0 00-10-10" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Verifying your email…
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Just a moment
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.3)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="var(--online)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Email verified!
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Your account is now verified. Please log in to continue.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Go to Login →
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Verification failed
            </h1>
            <p className="text-sm mb-6" style={{ color: '#f87171' }}>
              {errorMsg}
            </p>
            <Link
              href="/chat"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              Back to app
            </Link>
          </>
        )}

        {status === 'no-token' && (
          <>
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="#f87171"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M12 9v4M12 17h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Invalid verification link
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              This link is missing a token. Use the link from your email.
            </p>
            <Link
              href="/chat"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              Back to app
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
