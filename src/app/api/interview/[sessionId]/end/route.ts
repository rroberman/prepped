import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getInterviewBySession,
  updateInterview,
} from "@/lib/db/queries";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const interview = getInterviewBySession(sessionId);
  if (!interview) {
    return NextResponse.json({ error: "No interview found" }, { status: 400 });
  }

  if (interview.status === "active") {
    updateInterview(interview.id, {
      status: "completed",
      ended_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
