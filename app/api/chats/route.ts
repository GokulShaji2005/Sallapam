// app/api/chats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import { getAuthUser } from '@/lib/auth'
import Chat from '@/models/Chat'
import { z } from 'zod'
import mongoose from 'mongoose'

const CreateChatSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('direct'),
    memberIds: z.array(z.string().min(1)).length(1), // exactly 1 other user
  }),
  z.object({
    type: z.literal('group'),
    memberIds: z.array(z.string().min(1)).min(1),
    groupName: z.string().min(1).max(100),
  }),
])

// ─── GET /api/chats ───────────────────────────────────────────────────────────
// Returns all chats the current user is a member of, sorted by updatedAt desc.
export async function GET(_req: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  await connectToDatabase()

  const chats = await Chat.find({ memberIds: new mongoose.Types.ObjectId(authUser.userId) })
    .sort({ updatedAt: -1 })
    .populate('lastMessageId', 'encryptedContent nonce senderId sentAt')
    .populate('memberIds', 'name phone publicKey') // excludes passwordHash by whitelist
    .lean()

  return NextResponse.json({ success: true, data: chats })
}

// ─── POST /api/chats ──────────────────────────────────────────────────────────
// Creates a new direct or group chat.
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  await connectToDatabase()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const currentUserId = new mongoose.Types.ObjectId(authUser.userId)

  if (parsed.data.type === 'direct') {
    const otherUserId = new mongoose.Types.ObjectId(parsed.data.memberIds[0])

    // Prevent creating a chat with yourself
    if (otherUserId.equals(currentUserId)) {
      return NextResponse.json(
        { success: false, error: 'Cannot create a chat with yourself' },
        { status: 400 }
      )
    }

    // Check if a direct chat already exists between these two users
    const existing = await Chat.findOne({
      type: 'direct',
      memberIds: { $all: [currentUserId, otherUserId], $size: 2 },
    })

    if (existing) {
      return NextResponse.json({ success: true, data: { chatId: existing._id } })
    }

    const chat = await Chat.create({
      type: 'direct',
      memberIds: [currentUserId, otherUserId],
    })

    return NextResponse.json({ success: true, data: { chatId: chat._id } }, { status: 201 })
  }

  // Group chat
  const memberObjectIds = [
    currentUserId,
    ...parsed.data.memberIds.map((id) => new mongoose.Types.ObjectId(id)),
  ]

  // Deduplicate in case current user was also listed in memberIds
  const uniqueIds = [...new Map(memberObjectIds.map((id) => [id.toString(), id])).values()]

  const chat = await Chat.create({
    type: 'group',
    groupName: parsed.data.groupName,
    memberIds: uniqueIds,
    adminId: currentUserId,
  })

  return NextResponse.json({ success: true, data: { chatId: chat._id } }, { status: 201 })
}
