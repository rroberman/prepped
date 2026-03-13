import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/db/queries";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  deleteSession(sessionId);

  return NextResponse.json({ success: true });
}
