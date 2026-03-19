'use client'

import { useState } from 'react'

interface EmailVerificationBannerProps {
  isVerified: boolean
}

export default function EmailVerificationBanner({ isVerified }: EmailVerificationBannerProps) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (isVerified || dismissed) return null

  async function handleResend() {
    setSending(true)
    try {
      await fetch('/api/auth/resend-verification', { method: 'POST' })
      setSent(true)
      // Auto-hide "Email sent!" after 3 seconds
      setTimeout(() => setSent(false), 3000)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
      style={{
        background: 'rgba(234,179,8,0.1)',
        borderBottom: '1px solid rgba(234,179,8,0.25)',
        color: '#fbbf24',
      }}>
      <div className="flex items-center gap-2 min-w-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="truncate">
          {sent
            ? '✓ Verification email sent! Check your inbox.'
            : 'Please verify your email address. Check your inbox for the verification link.'}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {!sent && (
          <button
            onClick={handleResend}
            disabled={sending}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(234,179,8,0.2)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(234,179,8,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(234,179,8,0.2)')}
          >
            {sending ? 'Sending…' : 'Resend email'}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
