// app/(auth)/signup/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase-client'
import { createUserWithEmailAndPassword } from 'firebase/auth'
// Future imports (uncomment when adding phone auth):
// import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignUp() {
    setLoading(true)
    setError('')
    try {
      // Create Firebase user with email & password
      const credential = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const firebaseIdToken = await credential.user.getIdToken()

      // Call signup API — phone is saved to DB now, verified later
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseIdToken,
          name: form.name,
          email: form.email,
          phone: form.phone,     // ← stored in DB, not verified yet
          password: form.password,
          // Future: publicKey (for E2E encryption)
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      // Future: await savePrivateKey(privateKey, form.password)
      router.push(`/verify-email/pending?email=${encodeURIComponent(form.email)}`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Signup failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="p-8 rounded-2xl shadow-sm w-full max-w-md border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <h1 className="text-2xl font-medium mb-6" style={{ color: 'var(--text-primary)' }}>Create account</h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: 'rgb(239, 68, 68)' }}>
            {error}
          </div>
        )}
        <form
          onSubmit={e => { e.preventDefault(); handleSignUp(); }}
          className="space-y-4"
        >
          <input
            className="w-full px-4 py-3 border rounded-xl text-sm outline-none"
            placeholder="Full name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
          <input
            className="w-full px-4 py-3 border rounded-xl text-sm outline-none"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
          <div className="relative">
            <input
              className="w-full px-4 py-3 border rounded-xl text-sm outline-none"
              placeholder="Phone number (e.g. +91...)"
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              required
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
            {/* Small badge to indicate phone is not verified yet */}
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)' }}>
              saved for later
            </span>
          </div>
          <input
            className="w-full px-4 py-3 border rounded-xl text-sm outline-none"
            placeholder="Password (min 8 characters)"
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            minLength={8}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <a href="/login" className="hover:underline" style={{ color: 'var(--accent)' }}>Log in</a>
          </p>
        </form>

        {/* ── Phone OTP Section (add back when ready) ──────────────────────────
        
        STEP 1 — Send OTP:
        
        const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)
        const [step, setStep] = useState<'details' | 'otp'>('details')
        const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
        const [otp, setOtp] = useState('')

        useEffect(() => {
          if (!recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
              size: 'invisible',
            })
          }
          return () => {
            recaptchaVerifierRef.current?.clear()
            recaptchaVerifierRef.current = null
          }
        }, [])

        async function handleSendOTP() {
          if (!recaptchaVerifierRef.current) throw new Error('reCAPTCHA not initialized')
          const result = await signInWithPhoneNumber(auth, form.phone, recaptchaVerifierRef.current)
          setConfirmation(result)
          setStep('otp')
        }

        STEP 2 — Verify OTP (replace handleSignUp logic):

        async function handleVerifyOTP() {
          if (!confirmation) return
          const credential = await confirmation.confirm(otp)
          const firebaseIdToken = await credential.user.getIdToken()
          // ... rest of API call same as handleSignUp
        }

        JSX to add back:
        <div id="recaptcha-container" />
        ─────────────────────────────────────────────────────────────────────── */}
      </div>
    </div>
  )
}
