import { NextResponse } from "next/server";
import { getGroupInsights } from "@/lib/insights";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const decoded = decodeURIComponent(groupId);
  const insights = getGroupInsights(decoded);
  if (!insights) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  return NextResponse.json(insights);
}
