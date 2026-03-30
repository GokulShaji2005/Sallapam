// app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
// import { loadPrivateKey } from '@/lib/crypto'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          router.push(`/verify-email/pending?email=${encodeURIComponent(form.email)}`)
          return
        }
        throw new Error(data.error)
      }

      // Load the private key from localStorage using their password
      // This just verifies it's accessible — it stays in memory during the session
      // const privateKey = await loadPrivateKey(form.password)
      // if (!privateKey) {
      //   // Key missing means they're on a new device — handle gracefully
      //   console.warn('Private key not found in localStorage — new device?')
      // }

      router.push('/chat')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Login failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="p-8 rounded-2xl shadow-sm w-full max-w-md border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <h1 className="text-2xl font-medium mb-6" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: 'rgb(239, 68, 68)' }}>
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            className="w-full px-4 py-3 border rounded-xl text-sm outline-none"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />

          <input
            className="w-full px-4 py-3 border rounded-xl text-sm outline-none"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            No account?{' '}
            <a href="/signup" className="hover:underline" style={{ color: 'var(--accent)' }}>Sign up</a>
          </p>
        </div>
      </div>
    </div>
  )
}