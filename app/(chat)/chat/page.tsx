'use client'

import ChatSidebar from '@/components/chat/ChatSidebar'

export default function ChatListPage() {
  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      <ChatSidebar />

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

    </div>
  )
}
