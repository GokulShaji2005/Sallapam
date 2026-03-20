import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Implement list users when requirements are finalized.
  return NextResponse.json({ success: true, data: [] }, { status: 200 })
}

export async function PATCH(_req: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Implement profile update with field-level validation and authorization.
  return NextResponse.json(
    { success: false, error: 'Not implemented' },
    { status: 501 }
  )
}
