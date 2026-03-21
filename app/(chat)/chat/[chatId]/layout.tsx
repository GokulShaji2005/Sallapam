import ChatSidebar from '@/components/chat/ChatSidebar'

export default async function ChatDetailLayout(
  {
    children,
    params,
  }: {
    children: React.ReactNode
    params: Promise<{ chatId: string }>
  }
) {
  const { chatId } = await params

  return (
    <div className="h-screen md:flex" style={{ background: 'var(--bg-primary)' }}>
      <div className="hidden md:block">
        <ChatSidebar activeChatId={chatId} />
      </div>
      <div className="h-full w-full min-w-0 flex-1">{children}</div>
    </div>
  )
}
