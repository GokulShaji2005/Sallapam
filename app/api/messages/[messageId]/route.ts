import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import { getAuthUser } from '@/lib/auth'
import Chat from '@/models/Chat'
import Message from '@/models/Message'
import mongoose from 'mongoose'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { messageId } = await params
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return NextResponse.json({ success: false, error: 'Invalid messageId' }, { status: 400 })
  }

  await connectToDatabase()

  const message = await Message.findById(messageId)
  if (!message) {
    return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 })
  }

  const currentUserId = new mongoose.Types.ObjectId(authUser.userId)

  const chat = await Chat.findOne({
    _id: message.chatId,
    memberIds: currentUserId,
  })

  if (!chat) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  if (!message.senderId.equals(currentUserId)) {
    return NextResponse.json(
      { success: false, error: 'You can only delete your own messages' },
      { status: 403 }
    )
  }

  await Message.deleteOne({ _id: message._id })

  const latestMessage = await Message.findOne({ chatId: message.chatId })
    .sort({ sentAt: -1 })
    .select('_id')
    .lean()

  chat.lastMessageId = latestMessage?._id
  chat.updatedAt = new Date()
  await chat.save()

  const socketUrl = process.env.SOCKET_SERVER_URL
  const emitSecret = process.env.EMIT_SECRET
  if (socketUrl && emitSecret) {
    fetch(`${socketUrl}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${emitSecret}`,
      },
      body: JSON.stringify({
        event: 'message:delete',
        room: message.chatId.toString(),
        data: { messageId: message._id.toString(), chatId: message.chatId.toString() },
      }),
    })
      .then(async (emitRes) => {
        if (emitRes.ok) return
        const details = await emitRes.text().catch(() => '')
        console.error('[socket emit] Socket server rejected delete event:', emitRes.status, details)
      })
      .catch((err) => {
        console.error('[socket emit] Failed to notify socket server about delete:', err)
      })
  }

  return NextResponse.json({ success: true, data: { messageId: message._id.toString() } })
}
