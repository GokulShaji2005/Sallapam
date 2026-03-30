'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NewChatModal from '@/components/chat/NewChatModal'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useSocket } from '@/hooks/useSocket'
import { useLogout } from '@/hooks/useLogout'

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

interface ChatSidebarProps {
  activeChatId?: string
}

function getChatName(chat: Chat, currentUserId: string): string {
  if (chat.type === 'group') return chat.groupName ?? 'Group Chat'
  const other = chat.memberIds.find((member) => member._id !== currentUserId)
  return other?.name ?? 'Unknown'
}

function formatTime(iso: string, now: number): string {
  const d = new Date(iso)
  const diff = now - d.getTime()

  if (diff < 86400000) {
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }
  if (diff < 604800000) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
  }
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`
}

function dedupeChatsById(items: Chat[]): Chat[] {
  const deduped: Chat[] = []
  const indexById = new Map<string, number>()

  for (const item of items) {
    const index = indexById.get(item._id)
    if (index === undefined) {
      indexById.set(item._id, deduped.length)
      deduped.push(item)
    } else {
      deduped[index] = item
    }
  }

  return deduped
}

export default function ChatSidebar({ activeChatId }: ChatSidebarProps) {
  const router = useRouter()
  const logout = useLogout()
  const { socket } = useSocket()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [now, setNow] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    setNow(Date.now())
  }, [])

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return
      const json = await res.json()
      if (json.success && json.data?._id) {
        setCurrentUserId(json.data._id)
      }
    } catch {
      // Non-fatal: chat list can still render with fallback names.
    }
  }, [])

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats')
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setError('')
      setChats(dedupeChatsById(json.data))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load chats'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchCurrentUser()
    fetchChats()
  }, [fetchCurrentUser, fetchChats])

  useEffect(() => {
    if (!socket) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const refreshChatsSoon = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        fetchChats()
      }, 250)
    }

    socket.on('message:receive', refreshChatsSoon)
    socket.on('connect', refreshChatsSoon)

    return () => {
      if (timer) clearTimeout(timer)
      socket.off('message:receive', refreshChatsSoon)
      socket.off('connect', refreshChatsSoon)
    }
  }, [socket, fetchChats])

  useEffect(() => {
    if (!socket || chats.length === 0) return

    const roomIds = chats.map((chat) => chat._id)

    const rejoin = () => {
      socket.emit('chat:rejoin', roomIds)
    }

    // Join all known chat rooms so sidebar can receive room-scoped realtime events.
    if (socket.connected) {
      rejoin()
    }

    socket.on('connect', rejoin)
    return () => {
      socket.off('connect', rejoin)
    }
  }, [socket, chats])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  const initials = (name: string) => name.split(' ').map((word) => word[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      <aside
        className="flex h-full min-h-dvh w-full max-w-full shrink-0 flex-col md:w-80"
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-4"
          style={{ borderBottom: '1px solid var(--border)', paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          <div className="min-w-0 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="truncate font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Sallapam</span>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => router.push('/chat/group/new')}
              title="Create Group"
              className="h-9 min-w-17 rounded-lg px-3 text-xs font-medium transition-all"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
            >
              Group
            </button>
            <button
              onClick={() => setShowModal(true)}
              title="New Chat"
              className="h-9 w-9 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'var(--accent)', color: '#fff' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <ThemeToggle fixed={false} className="md:hidden inline-flex" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col gap-3 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 rounded-full shrink-0" style={{ background: 'var(--bg-tertiary)' }}/>
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
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
              >
                Start a conversation
              </button>
            </div>
          )}

          {!loading && chats.map((chat) => {
            const name = getChatName(chat, currentUserId)
            const isActive = activeChatId === chat._id
            return (
              <button
                key={chat._id}
                onClick={() => router.push(`/chat/${chat._id}`)}
                className="w-full flex items-center gap-3 px-3 py-3 text-left transition-all sm:px-4"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isActive ? 'var(--bg-hover)' : 'transparent'
                }}
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    {initials(name)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                    style={{ background: 'var(--online)', borderColor: 'var(--bg-secondary)' }}/>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                    {chat.updatedAt && now > 0 && (
                      <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(chat.updatedAt, now)}
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

        <div
          className="p-3"
          style={{ borderTop: '1px solid var(--border)', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full h-10 rounded-lg text-sm font-medium transition-all disabled:opacity-60"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => {
              if (!loggingOut) e.currentTarget.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)'
            }}
          >
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </aside>

      {showModal && <NewChatModal onClose={() => { setShowModal(false); fetchChats() }} />}
    </>
  )
}
