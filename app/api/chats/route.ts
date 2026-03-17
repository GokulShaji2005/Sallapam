import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // TODO: Get all chats for authenticated user
  return NextResponse.json({ chats: [] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // TODO: Create a new chat
    return NextResponse.json({ message: "Chat created" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
