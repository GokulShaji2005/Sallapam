'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

interface UserItem {
  _id: string
  name: string
  email: string
  publicKey?: string
}

export default function NewGroupPage() {
  const router = useRouter()

  const [groupName, setGroupName] = useState('')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [loadingUsers, setLoadingUsers] = useState(true)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let aborted = false
    const timeoutId = window.setTimeout(async () => {
      setLoadingUsers(true)
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(query.trim())}&limit=60`)
        if (!res.ok) {
          throw new Error('Failed to load users')
        }

        const json = await res.json()
        if (!json.success) {
          throw new Error(json.error ?? 'Failed to load users')
        }

        if (!aborted) {
          setUsers(json.data ?? [])
        }
      } catch (err: unknown) {
        if (!aborted) {
          const message = err instanceof Error ? err.message : 'Failed to load users'
          setError(message)
        }
      } finally {
        if (!aborted) {
          setLoadingUsers(false)
        }
      }
    }, 250)

    return () => {
      aborted = true
      window.clearTimeout(timeoutId)
    }
  }, [query])

  const selectedCount = selectedIds.size

  const canCreate = useMemo(() => {
    return groupName.trim().length > 0 && selectedCount > 0 && !creatingGroup
  }, [groupName, selectedCount, creatingGroup])

  function toggleSelect(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  async function handleCreateGroup() {
    if (!canCreate) return

    setCreatingGroup(true)
    setError('')
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          groupName: groupName.trim(),
          memberIds: [...selectedIds],
        }),
      })

      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error ?? 'Failed to create group')
      }

      router.push(`/chat/${json.data.chatId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create group'
      setError(message)
    } finally {
      setCreatingGroup(false)
    }
  }

  const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen px-4 py-6 md:px-8" style={{ background: 'var(--bg-primary)' }}>
      <div className="mx-auto w-full max-w-2xl rounded-2xl p-5 md:p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Create Group</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Give your group a name and select people already using this chat app.
            </p>
          </div>
          <button
            onClick={() => router.push('/chat')}
            className="px-3 py-2 text-sm rounded-lg"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
        </div>

        <div className="mt-6">
          <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Friends, Team Alpha, Project Squad..."
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="mt-5">
          <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Add People</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {loadingUsers ? (
            <div className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>No users found.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {users.map((user) => {
                const checked = selectedIds.has(user._id)
                return (
                  <button
                    key={user._id}
                    onClick={() => toggleSelect(user._id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    style={{
                      background: checked ? 'var(--accent-glow)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    >
                      {initials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                    </div>
                    <div
                      className="w-5 h-5 rounded border flex items-center justify-center"
                      style={{ borderColor: checked ? 'var(--accent)' : 'var(--border)', background: checked ? 'var(--accent)' : 'transparent' }}
                    >
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {selectedCount} {selectedCount === 1 ? 'person selected' : 'people selected'}
          </p>

          <button
            onClick={handleCreateGroup}
            disabled={!canCreate}
            className="px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {creatingGroup ? 'Creating...' : 'Create Group'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
