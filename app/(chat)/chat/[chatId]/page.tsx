'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useChat } from '@/hooks/useSocket'

interface Member {
  _id: string
  name: string
  publicKey?: string
}

interface Message {
  _id: string
  senderId: string | { _id: string }
  encryptedContent: string
  nonce: string
  status: 'sent' | 'delivered' | 'read'
  sentAt: string
  senderPublicKey?: string
}

interface Chat {
  _id: string
  type: 'direct' | 'group'
  groupName?: string
  memberIds: Member[]
}

function getSenderId(msg: Message): string {
  if (typeof msg.senderId === 'string') return msg.senderId
  return msg.senderId._id
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dedupeMessagesById(items: Message[]): Message[] {
  const deduped: Message[] = []
  const indexById = new Map<string, number>()

  for (const item of items) {
    const index = indexById.get(item._id)
    if (index === undefined) {
      indexById.set(item._id, deduped.length)
      deduped.push(item)
    } else {
      // Keep newest payload for an existing message id (status/content updates).
      deduped[index] = item
    }
  }

  return deduped
}

const SKELETON_WIDTHS = ['95px', '138px', '112px', '164px', '124px', '146px']

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const chatId = params.chatId as string

  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [loadingMsgs, setLoadingMsgs] = useState(true)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [sendError, setSendError] = useState('')
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Socket — join/leave room, sendTyping, markDelivered
  const { socket, isConnected, sendTyping, markDelivered } = useChat(chatId)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?._id) {
          setCurrentUserId(json.data._id)
        }
      })
      .catch(() => {
        // Non-fatal: messages still load, but ownership alignment may be degraded.
      })
  }, [])

  // ── Fetch chat metadata ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/chats/${chatId}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) { router.push('/chat'); return }
        setChat(json.data)
      })
      .catch(() => router.push('/chat'))
  }, [chatId, router])

  // ── Fetch messages ───────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (p: number) => {
    setLoadingMsgs(true)
    try {
      const res = await fetch(`/api/messages?chatId=${chatId}&page=${p}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      if (p === 1) {
        setMessages(dedupeMessagesById(json.data.messages))
      } else {
        setMessages(prev => dedupeMessagesById([...json.data.messages, ...prev])) // prepend older
      }
      setHasMore(json.data.hasMore)
    } finally {
      setLoadingMsgs(false)
    }
  }, [chatId])

  useEffect(() => { fetchMessages(1) }, [fetchMessages])

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Socket events ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const onReceive = (msg: Message) => {
      setMessages(prev => dedupeMessagesById([...prev, msg]))
      markDelivered(msg._id)
    }

    const onTyping = ({ userId }: { userId: string; chatId: string }) => {
      setTypingUsers(prev => new Set(prev).add(userId))
      // Clear typing indicator after 2s of silence
      setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      }, 2000)
    }

    socket.on('message:receive', onReceive)
    socket.on('chat:typing', onTyping)

    return () => {
      socket.off('message:receive', onReceive)
      socket.off('chat:typing', onTyping)
    }
  }, [socket, markDelivered])

  // ── Send message ─────────────────────────────────────────────────────────
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          encryptedContent: trimmed, // placeholder until E2E encryption is wired
          nonce: crypto.randomUUID(),
        }),
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error ?? 'Failed to send message')
      }
      setMessages(prev => dedupeMessagesById([...prev, json.data]))
      setText('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send message'
      setSendError(message)
    } finally {
      setSending(false)
    }
  }

  // Typing indicator — debounced emit
  function handleTyping(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    if (sendError) setSendError('')
    sendTyping()
    if (typingTimer.current) clearTimeout(typingTimer.current)
  }

  // Send on Enter (Shift+Enter for newline)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Derive other user's name
  const otherMember = chat?.memberIds.find(m => m._id !== currentUserId)
  const chatName = chat?.type === 'group' ? chat.groupName ?? 'Group' : otherMember?.name ?? '…'

  const typingList = [...typingUsers]
  const showTyping = typingList.length > 0

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        {/* Back button (mobile) */}
        <button
          onClick={() => router.push('/chat')}
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Avatar */}
        <div className="relative">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            {chatName[0]?.toUpperCase() ?? '?'}
          </div>
          {isConnected && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
              style={{ background: 'var(--online)', borderColor: 'var(--bg-secondary)' }}/>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{chatName}</p>
          <p className="text-xs" style={{ color: isConnected ? 'var(--online)' : 'var(--text-muted)' }}>
            {isConnected ? 'Online' : 'Connecting…'}
          </p>
        </div>
      </header>

      {/* ── Message thread ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mb-2">
            <button
              onClick={() => { const p = page + 1; setPage(p); fetchMessages(p) }}
              disabled={loadingMsgs}
              className="text-xs px-4 py-1.5 rounded-full transition-all"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              {loadingMsgs ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}

        {loadingMsgs && messages.length === 0 && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="h-10 rounded-2xl animate-pulse" style={{
                  width: SKELETON_WIDTHS[i] ?? '120px',
                  background: 'var(--bg-tertiary)'
                }}/>
              </div>
            ))}
          </div>
        )}

        {messages.map(msg => {
          const mine = getSenderId(msg) === currentUserId
          return (
            <div key={msg._id} className={`flex fade-up ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: mine ? 'var(--bubble-mine)' : 'var(--bubble-theirs)',
                  color: 'var(--text-primary)',
                  border: mine ? 'none' : '1px solid var(--border)',
                  borderBottomRightRadius: mine ? '4px' : '16px',
                  borderBottomLeftRadius: mine ? '16px' : '4px',
                }}
              >
                <p>🔒 {msg.encryptedContent}</p>
                <p className="text-right text-xs mt-1 opacity-60">{formatTime(msg.sentAt)}</p>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {showTyping && (
          <div className="flex justify-start fade-up">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1"
              style={{ background: 'var(--bubble-theirs)', border: '1px solid var(--border)' }}>
              <span className="typing-dot"/>
              <span className="typing-dot"/>
              <span className="typing-dot"/>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </main>

      {/* ── Input bar ── */}
      <footer className="shrink-0 px-4 py-3" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
        {sendError && (
          <p className="mb-2 text-xs" style={{ color: '#ef4444' }}>
            {sendError}
          </p>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <textarea
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              maxHeight: '120px',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
            onMouseEnter={e => { if (text.trim()) e.currentTarget.style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            {sending ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.25" strokeWidth="3"/>
                <path d="M22 12a10 10 0 00-10-10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </form>
      </footer>
    </div>
  )
}
