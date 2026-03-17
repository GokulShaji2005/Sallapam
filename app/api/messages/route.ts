import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");
  // TODO: Get messages for a chat
  return NextResponse.json({ messages: [] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // TODO: Send a new message
    return NextResponse.json({ message: "Message sent" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
