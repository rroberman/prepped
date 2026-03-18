import { NextResponse } from "next/server";
import { getSessionGroups } from "@/lib/insights";

export async function GET() {
  const groups = getSessionGroups();
  return NextResponse.json({ groups });
}
