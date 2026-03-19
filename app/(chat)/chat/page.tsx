'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import NewChatModal from '@/components/chat/NewChatModal'

interface Member {
  _id: string
  name: string
  phone?: string
  publicKey?: string
}

interface LastMessage {
  encryptedContent: string
  sentAt: string
  senderId: string
}

interface Chat {
  _id: string
  type: 'direct' | 'group'
  groupName?: string
  memberIds: Member[]
  lastMessageId?: LastMessage
  updatedAt: string
}

// Derive display name: for direct chats show the other person's name
function getChatName(chat: Chat, currentUserId: string): string {
  if (chat.type === 'group') return chat.groupName ?? 'Group Chat'
  const other = chat.memberIds.find(m => m._id !== currentUserId)
  return other?.name ?? 'Unknown'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function ChatListPage() {
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats')
      if (res.status === 401) { router.push('/login'); return }
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setChats(json.data)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load chats')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Get current user from cookie-backed endpoint (reuse login response pattern)
  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col w-full md:w-80 flex-shrink-0"
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Sallapam</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            title="New Chat"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'var(--accent)', color: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col gap-3 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: 'var(--bg-tertiary)' }}/>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded" style={{ background: 'var(--bg-tertiary)', width: '60%' }}/>
                    <div className="h-3 rounded" style={{ background: 'var(--bg-tertiary)', width: '80%' }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="m-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {!loading && !error && chats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 px-8 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No chats yet</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
                style={{ background: 'var(--accent)', color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
              >
                Start a conversation
              </button>
            </div>
          )}

          {!loading && chats.map(chat => {
            const name = getChatName(chat, currentUserId)
            return (
              <button
                key={chat._id}
                onClick={() => router.push(`/chat/${chat._id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    {initials(name)}
                  </div>
                  {/* Online badge — placeholder, wire to socket presence */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                    style={{ background: 'var(--online)', borderColor: 'var(--bg-secondary)' }}/>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                    {chat.updatedAt && (
                      <span className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(chat.updatedAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {chat.lastMessageId ? '🔒 Encrypted message' : 'No messages yet'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Empty state (desktop only) ── */}
      <main className="hidden md:flex flex-1 items-center justify-center flex-col gap-4"
        style={{ background: 'var(--bg-primary)' }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Select a chat to start messaging</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Or press <kbd className="px-1.5 py-0.5 rounded text-xs mx-1" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>+</kbd> to start a new conversation</p>
        </div>
      </main>

      {/* ── Modal ── */}
      {showModal && <NewChatModal onClose={() => { setShowModal(false); fetchChats() }} />}
    </div>
  )
}
