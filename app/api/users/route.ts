import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // TODO: Search or list users
  return NextResponse.json({ users: [] }, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    // TODO: Update user profile
    return NextResponse.json({ message: "User updated" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
