'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface FoundUser {
  _id: string
  name: string
  email: string
  publicKey?: string
}

interface NewChatModalProps {
  onClose: () => void
}

export default function NewChatModal({ onClose }: NewChatModalProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [foundUser, setFoundUser] = useState<FoundUser | null | undefined>(undefined) // undefined = not searched yet
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    // Close on Escape
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setSearching(true)
    setError('')
    setFoundUser(undefined)
    setInviteSuccess(false)
    try {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(trimmed)}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setFoundUser(json.data) // null means not found
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Search failed'
      setError(message)
    } finally {
      setSearching(false)
    }
  }

  async function handleStartChat() {
    if (!foundUser) return
    setStarting(true)
    setError('')
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'direct', memberIds: [foundUser._id] }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      onClose()
      router.push(`/chat/${json.data.chatId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create chat'
      setError(message)
    } finally {
      setStarting(false)
    }
  }

  async function handleInvite() {
    setInviting(true)
    setError('')
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setInviteSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation'
      setError(message)
    } finally {
      setInviting(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="fade-up relative w-full max-w-md mx-4 rounded-2xl p-6"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>New Chat</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Find someone by email to start chatting</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setFoundUser(undefined); setInviteSuccess(false) }}
            placeholder="name@example.com"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            type="submit"
            disabled={searching || !email.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
            onMouseEnter={e => { if (!searching) e.currentTarget.style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            {searching ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            ) : 'Search'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <p className="text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}

        {/* Result: user found */}
        {foundUser !== undefined && foundUser !== null && (
          <div className="fade-up rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
              {foundUser.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{foundUser.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{foundUser.email}</p>
            </div>
            <button
              onClick={handleStartChat}
              disabled={starting}
              className="px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-all disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
              onMouseEnter={e => { if (!starting) e.currentTarget.style.background = 'var(--accent-hover)' }}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              {starting ? 'Opening…' : 'Start Chat'}
            </button>
          </div>
        )}

        {/* Result: not found */}
        {foundUser === null && !inviteSuccess && (
          <div className="fade-up rounded-xl p-4 text-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              No account found for <span style={{ color: 'var(--text-primary)' }}>{email}</span>
            </p>
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { if (!inviting) e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {inviting ? 'Sending…' : '✉ Send invitation email'}
            </button>
          </div>
        )}

        {/* Invite success */}
        {inviteSuccess && (
          <div className="fade-up rounded-xl p-4 text-center" style={{ background: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.25)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--online)' }}>✓ Invitation sent to {email}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>They&apos;ll get a link to sign up and chat with you.</p>
          </div>
        )}
      </div>
    </div>
  )
}
