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
      router.push('/chat')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Signup failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md border border-gray-100">
        <h1 className="text-2xl font-medium text-gray-900 mb-6">Create account</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <form
          onSubmit={e => { e.preventDefault(); handleSignUp(); }}
          className="space-y-4"
        >
          <input
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 placeholder:text-gray-500"
            placeholder="Full name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 placeholder:text-gray-500"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
          <div className="relative">
            <input
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 placeholder:text-gray-500"
              placeholder="Phone number (e.g. +91...)"
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              required
            />
            {/* Small badge to indicate phone is not verified yet */}
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              saved for later
            </span>
          </div>
          <input
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 placeholder:text-gray-500"
            placeholder="Password (min 8 characters)"
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            minLength={8}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="text-violet-600 hover:underline">Log in</a>
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
