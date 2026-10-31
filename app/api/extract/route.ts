import { NextRequest, NextResponse } from "next/server";
import { ExtractRequestSchema } from "@/lib/schema";
import { extractFromImage } from "@/lib/gemma";
import { flagAllTests } from "@/lib/flags";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ExtractRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { image, mimeType } = parsed.data;

    // AI Pass 1: Multimodal Extraction of any clinical document
    const extracted = await extractFromImage(image, mimeType);

    // Code Pass: Apply deterministic flagging and canonical naming on any lab tests found
    const { flaggedTests, riskAlerts } = flagAllTests(extracted.tests);

    const warnings = [...extracted.warnings];
    if (riskAlerts.length > 0) {
      warnings.push(
        `Critical value detected in: ${riskAlerts.map((r) => r.title).join(", ")}.`
      );
    }

    return NextResponse.json({
      ...extracted,
      tests: flaggedTests,
      riskAlerts,
      warnings,
      hasCriticalValues: riskAlerts.length > 0,
    });
  } catch (err: any) {
    console.error("Error in /api/extract:", err);
    return NextResponse.json(
      {
        error: err.message || "Failed to extract data from image",
        hint: "Please ensure the photo is in focus and well-lit.",
      },
      { status: 500 }
    );
  }
}
