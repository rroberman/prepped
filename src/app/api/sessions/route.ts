import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf/parser";
import { createSession } from "@/lib/db/queries";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { allowed } = rateLimit(ip, { maxRequests: 10, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("cv") as File | null;
    const jobUrl = formData.get("jobUrl") as string | null;

    if (!file) {
      return NextResponse.json({ error: "CV file is required" }, { status: 400 });
    }

    if (!jobUrl) {
      return NextResponse.json({ error: "Job URL is required" }, { status: 400 });
    }

    // Validate file type and size
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 413 });
    }

    // Parse PDF — also verify magic bytes since MIME type is client-controlled
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length < 5 || buffer.toString("ascii", 0, 5) !== "%PDF-") {
      return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 });
    }
    let cvText: string;
    try {
      cvText = await extractTextFromPDF(buffer);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse PDF. Please ensure it's a valid PDF file." },
        { status: 400 }
      );
    }

    if (!cvText || cvText.length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text from the PDF. Please try a different file." },
        { status: 400 }
      );
    }

    // Create session
    const session = createSession(cvText, file.name, jobUrl);

    const { cv_text: _omit, ...safeSession } = session;
    return NextResponse.json({ session: safeSession });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
