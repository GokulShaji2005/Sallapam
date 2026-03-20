// app/api/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import { getAuthUser } from '@/lib/auth'
import Chat from '@/models/Chat'
import User from '@/models/User'
import Invitation from '@/models/Invitation'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'
import mongoose from 'mongoose'

function buildDirectKey(a: mongoose.Types.ObjectId, b: mongoose.Types.ObjectId): string {
  return [a.toString(), b.toString()].sort().join(':')
}

const InviteSchema = z.object({
  email: z.string().email(),
})

// POST /api/invitations
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

  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const email = parsed.data.email.trim().toLowerCase()

  // Prevent inviting yourself
  if (email === authUser.email.toLowerCase()) {
    return NextResponse.json(
      { success: false, error: 'You cannot invite yourself' },
      { status: 400 }
    )
  }

  await connectToDatabase()

  const currentUserId = new mongoose.Types.ObjectId(authUser.userId)

  // ── CASE A: User already exists ──────────────────────────────────────────
  const existingUser = await User.findOne({ email }).lean()

  if (existingUser) {
    const otherUserId = existingUser._id as mongoose.Types.ObjectId
    const directKey = buildDirectKey(currentUserId, otherUserId)

    const existingChat = await Chat.findOne({ directKey }, { _id: 1 }).lean()

    const newChat = await Chat.findOneAndUpdate(
      { directKey },
      {
        $setOnInsert: {
          type: 'direct',
          memberIds: [currentUserId, otherUserId],
          directKey,
        },
      },
      {
        new: true,
        upsert: true,
      }
    )

    return NextResponse.json({
      success: true,
      data: { chatId: newChat._id, alreadyExists: !!existingChat },
    }, { status: 201 })
  }

  // ── CASE B: User does not exist — send invite email ──────────────────────
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await Invitation.create({
    email,
    invitedBy: currentUserId,
    token,
    status: 'pending',
    expiresAt,
  })

  const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/signup?invite=${token}`

  await sendEmail({
    to: email,
    subject: "Sallapam — You've been invited to chat",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>You've been invited!</h2>
        <p><strong>${authUser.name}</strong> has invited you to chat on <strong>Sallapam</strong>.</p>
        <p>
          <a href="${signupUrl}"
             style="display:inline-block;padding:12px 24px;background:#4f46e5;
                    color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
            Accept Invitation
          </a>
        </p>
        <p style="color:#888;font-size:13px;">This link expires in 7 days.</p>
      </div>
    `,
  })

  return NextResponse.json({ success: true, data: { invited: true } }, { status: 201 })
}
