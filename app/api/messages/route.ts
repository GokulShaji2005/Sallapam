// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import { getAuthUser } from '@/lib/auth'
import Chat from '@/models/Chat'
import Message from '@/models/Message'
import User from '@/models/User'
import { z } from 'zod'
import mongoose from 'mongoose'

const PAGE_SIZE = 50

// ─── GET /api/messages?chatId=xxx&page=1 ─────────────────────────────────────
// Returns paginated messages (oldest-first) for a chat, with sender publicKey.
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const chatId = searchParams.get('chatId')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
    return NextResponse.json({ success: false, error: 'Invalid or missing chatId' }, { status: 400 })
  }

  await connectToDatabase()

  // Membership check
  const chat = await Chat.findOne({
    _id: chatId,
    memberIds: new mongoose.Types.ObjectId(authUser.userId),
  }).lean()

  if (!chat) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const skip = (page - 1) * PAGE_SIZE

  // Fetch one extra to determine hasMore
  const rawMessages = await Message.find({ chatId })
    .sort({ sentAt: -1 }) // newest first for pagination
    .skip(skip)
    .limit(PAGE_SIZE + 1)
    .lean()

  const hasMore = rawMessages.length > PAGE_SIZE
  const pageMessages = hasMore ? rawMessages.slice(0, PAGE_SIZE) : rawMessages

  // Collect unique sender IDs and fetch their publicKeys in one query
  const senderIds = [...new Set(pageMessages.map((m) => m.senderId.toString()))]
  const senders = await User.find(
    { _id: { $in: senderIds } },
    { publicKey: 1 } // only fetch _id and publicKey
  ).lean()

  const senderMap = new Map(senders.map((s) => [s._id.toString(), s.publicKey ?? null]))

  // Attach senderPublicKey and reverse so oldest is first for display
  const messages = pageMessages
    .map((msg) => ({
      ...msg,
      senderPublicKey: senderMap.get(msg.senderId.toString()) ?? null,
    }))
    .reverse()

  return NextResponse.json({ success: true, data: { messages, hasMore } })
}

// ─── POST /api/messages ───────────────────────────────────────────────────────
// Sends a new encrypted message to a chat.
const SendMessageSchema = z.object({
  chatId: z.string().min(1),
  encryptedContent: z.string().min(1),
  nonce: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = SendMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { chatId, encryptedContent, nonce } = parsed.data

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return NextResponse.json({ success: false, error: 'Invalid chatId' }, { status: 400 })
  }

  await connectToDatabase()

  // Membership check
  const chat = await Chat.findOne({
    _id: chatId,
    memberIds: new mongoose.Types.ObjectId(authUser.userId),
  })

  if (!chat) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  // Create message
  const message = await Message.create({
    chatId: new mongoose.Types.ObjectId(chatId),
    senderId: new mongoose.Types.ObjectId(authUser.userId),
    encryptedContent,
    nonce,
    status: 'sent',
  })

  // Update chat's lastMessageId and bump updatedAt so GET /chats sorts correctly
  chat.lastMessageId = message._id
  chat.updatedAt = new Date()
  await chat.save()

  // Non-blocking socket server notification — failure here must NOT fail the response
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
        event: 'message:receive',
        room: chatId,
        data: message,
      }),
    }).catch((err) => {
      console.error('[socket emit] Failed to notify socket server:', err)
    })
  }

  return NextResponse.json({ success: true, data: message }, { status: 201 })
}
