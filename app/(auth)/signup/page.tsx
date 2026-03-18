// app/(auth)/signup/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase-client'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { generateKeyPair, savePrivateKey } from '@/lib/crypto'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [otp, setOtp] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Send OTP via Firebase
  async function handleSendOTP() {
    setLoading(true)
    setError('')
    try {
      // RecaptchaVerifier renders an invisible reCAPTCHA for abuse protection
      const recaptcha = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      })
      const result = await signInWithPhoneNumber(auth, form.phone, recaptcha)
      setConfirmation(result)
      setStep('otp')
    } catch (e: any) {
      setError(e.message ?? 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP + create account
  async function handleVerifyOTP() {
    if (!confirmation) return
    setLoading(true)
    setError('')
    try {
      // Verify OTP with Firebase — get ID token
      const credential = await confirmation.confirm(otp)
      const firebaseIdToken = await credential.user.getIdToken()

      // Generate E2E keypair in browser BEFORE calling the server
      const { publicKey, privateKey } = generateKeyPair()

      // Call our signup API
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseIdToken,
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          publicKey, // server stores this
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      // Encrypt and save private key locally — never sent to server
      await savePrivateKey(privateKey, form.password)

      router.push('/chat')
    } catch (e: any) {
      setError(e.message ?? 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md border border-gray-100">
        <h1 className="text-2xl font-medium text-gray-900 mb-6">
          {step === 'details' ? 'Create account' : 'Enter OTP'}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === 'details' ? (
          <div className="space-y-4">
            <input
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400"
              placeholder="Full name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            <input
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400"
              placeholder="Phone number (with country code, e.g. +91...)"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
            <input
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400"
              placeholder="Password (min 8 characters)"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
            {/* Invisible reCAPTCHA mounts here */}
            <div id="recaptcha-container" />
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <a href="/login" className="text-violet-600 hover:underline">Log in</a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">OTP sent to {form.phone}</p>
            <input
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 tracking-widest text-center text-lg"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value)}
            />
            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length < 6}
              className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
            <button
              onClick={() => setStep('details')}
              className="w-full py-3 text-gray-500 text-sm hover:text-gray-700"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}