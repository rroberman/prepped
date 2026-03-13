import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf/parser";
import { createSession } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("cv") as File | null;
    const jobUrl = formData.get("jobUrl") as string | null;

    if (!file) {
      return NextResponse.json({ error: "CV file is required" }, { status: 400 });
    }

    if (!jobUrl) {
      return NextResponse.json({ error: "Job URL is required" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    // Parse PDF
    const buffer = Buffer.from(await file.arrayBuffer());
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

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
