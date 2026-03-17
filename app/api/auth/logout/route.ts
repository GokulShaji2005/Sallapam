import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // TODO: Implement logout logic (clear cookies/invalidate token)
    return NextResponse.json({ message: "Logged out" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
