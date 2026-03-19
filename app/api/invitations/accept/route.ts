// app/api/invitations/accept/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import Invitation from '@/models/Invitation'
import User from '@/models/User'
import { z } from 'zod'

const AcceptSchema = z.object({
  token: z.string().min(1),
})

// POST /api/invitations/accept
// No auth required — the new user may not have an account yet.
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = AcceptSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  await connectToDatabase()

  const invitation = await Invitation.findOne({
    token: parsed.data.token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })

  if (!invitation) {
    return NextResponse.json(
      { success: false, error: 'Invitation not found or has expired' },
      { status: 404 }
    )
  }

  // Mark as accepted
  invitation.status = 'accepted'
  await invitation.save()

  // Fetch the inviter's email so the signup page can show context
  const inviter = await User.findById(invitation.invitedBy, { email: 1 }).lean()

  return NextResponse.json({
    success: true,
    data: {
      inviterEmail: inviter?.email ?? null,
      prefillEmail: invitation.email,
    },
  })
}

// GET /api/invitations/check?token=xxx
// No auth required — used by the signup page on load to validate & pre-fill email.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ success: false, error: 'token query param is required' }, { status: 400 })
  }

  await connectToDatabase()

  const invitation = await Invitation.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).lean()

  return NextResponse.json({
    success: true,
    data: {
      valid: !!invitation,
      prefillEmail: invitation?.email ?? null,
    },
  })
}
