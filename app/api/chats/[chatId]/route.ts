// app/api/chats/[chatId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import { getAuthUser } from '@/lib/auth'
import Chat from '@/models/Chat'
import { z } from 'zod'
import mongoose from 'mongoose'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id)
}

// ─── GET /api/chats/[chatId] ──────────────────────────────────────────────────
// Returns a single chat with populated members and last message.
// 403 if the current user is not a member.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { chatId } = await params

  if (!isValidObjectId(chatId)) {
    return NextResponse.json({ success: false, error: 'Invalid chat ID' }, { status: 400 })
  }

  await connectToDatabase()

  const chat = await Chat.findById(chatId)
    .populate('lastMessageId', 'encryptedContent nonce senderId sentAt')
    .populate('memberIds', 'name phone publicKey')
    .lean()

  if (!chat) {
    return NextResponse.json({ success: false, error: 'Chat not found' }, { status: 404 })
  }

  // Membership check — ensure requesting user is in this chat
  const isMember = (chat.memberIds as any[]).some(
    (m) => m._id.toString() === authUser.userId
  )
  if (!isMember) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ success: true, data: chat })
}

// ─── PATCH /api/chats/[chatId] ────────────────────────────────────────────────
// Add or remove a member from a group chat.
// Only the group admin can call this.
const PatchChatSchema = z.object({
  action: z.enum(['add', 'remove']),
  userId: z.string().min(1),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { chatId } = await params

  if (!isValidObjectId(chatId)) {
    return NextResponse.json({ success: false, error: 'Invalid chat ID' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  if (!isValidObjectId(parsed.data.userId)) {
    return NextResponse.json({ success: false, error: 'Invalid userId' }, { status: 400 })
  }

  await connectToDatabase()

  const chat = await Chat.findById(chatId)

  if (!chat) {
    return NextResponse.json({ success: false, error: 'Chat not found' }, { status: 404 })
  }

  // Groups only
  if (chat.type !== 'group') {
    return NextResponse.json(
      { success: false, error: 'Cannot manage members of a direct chat' },
      { status: 400 }
    )
  }

  // Admin only
  if (chat.adminId?.toString() !== authUser.userId) {
    return NextResponse.json({ success: false, error: 'Forbidden — admin only' }, { status: 403 })
  }

  const targetId = new mongoose.Types.ObjectId(parsed.data.userId)

  // Prevent admin from removing themselves
  if (parsed.data.action === 'remove' && targetId.equals(new mongoose.Types.ObjectId(authUser.userId))) {
    return NextResponse.json(
      { success: false, error: 'Admin cannot remove themselves from the group' },
      { status: 400 }
    )
  }

  if (parsed.data.action === 'add') {
    // Idempotent — only push if not already a member
    const alreadyMember = chat.memberIds.some((m: mongoose.Types.ObjectId) => m.equals(targetId))
    if (!alreadyMember) {
      chat.memberIds.push(targetId)
      await chat.save()
    }
  } else {
    chat.memberIds = chat.memberIds.filter((m: mongoose.Types.ObjectId) => !m.equals(targetId)) as typeof chat.memberIds
    await chat.save()
  }

  return NextResponse.json({ success: true, data: { chatId: chat._id, memberIds: chat.memberIds } })
}
