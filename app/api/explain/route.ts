
import { NextRequest, NextResponse } from "next/server";
import { ExplainRequestSchema } from "@/lib/schema";
import { explainReport } from "@/lib/gemma";
import { flagAllTests } from "@/lib/flags";
import {
  sanitizeExplanationText,
  STANDARD_DISCLAIMER,
  mergeRiskAlerts,
} from "@/lib/safety";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ExplainRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      docType,
      language,
      documentTitle,
      tests,
      medicines,
      radiologyFindings,
      keyObservations,
    } = parsed.data;

    // Recheck extracted tests using deterministic rules.
    const { flaggedTests, riskAlerts: deterministicAlerts } =
      flagAllTests(tests);

    // Generate AI explanation.
    const aiExplanation = await explainReport({
      docType,
      language,
      documentTitle,
      tests: flaggedTests,
      medicines,
      radiologyFindings,
      keyObservations,
    });

    // Sanitize report summary.
    const sanitizedSummary =
      sanitizeExplanationText(aiExplanation.summary).sanitized;

    // Remove empty or placeholder AI findings.
    const aiFindings = (aiExplanation.findings || []).filter((f) => {
      const name = f.parameterOrArea?.trim().toLowerCase() || "";

      return (
        name !== "" &&
        name !== "parameter" &&
        name !== "unknown" &&
        name !== "finding not specified"
      );
    });

    const finalFindings = aiFindings.map((f) => ({
      ...f,
      simpleExplanation: sanitizeExplanationText(
        f.simpleExplanation
      ).sanitized,
      clinicalSignificance: f.clinicalSignificance
        ? sanitizeExplanationText(f.clinicalSignificance).sanitized
        : undefined,
    }));

    // Add any extracted test missing from the AI findings.
    const normalizeName = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, " ");

    for (const test of flaggedTests) {
      const testName = test.name?.trim();

      if (
        !testName ||
        testName.toLowerCase() === "unnamed test"
      ) {
        continue;
      }

      const alreadyExists = finalFindings.some(
        (finding) =>
          normalizeName(finding.parameterOrArea || "") ===
          normalizeName(testName)
      );

      if (alreadyExists) continue;

      const valueText =
        test.value !== null && test.value !== undefined
          ? `${test.value}${test.unit ? ` ${test.unit}` : ""}`
          : undefined;

      const referenceText =
        test.refLow !== null &&
          test.refLow !== undefined &&
          test.refHigh !== null &&
          test.refHigh !== undefined
          ? ` Reported reference range: ${test.refLow}–${test.refHigh}${test.unit ? ` ${test.unit}` : ""}.`
          : "";

      finalFindings.push({
        parameterOrArea: testName,
        flagOrStatus: test.flag || "unknown",
        valueText,
        simpleExplanation:
          `The report records ${testName}${valueText ? ` as ${valueText}` : ""}.` +
          referenceText +
          " Please review this result with your healthcare professional.",
        clinicalSignificance: undefined,
      });
    }

    // Add any verified radiology finding missing from the AI findings
    for (const rad of radiologyFindings || []) {
      const bodyPart = rad.bodyPart?.trim();
      if (!bodyPart || bodyPart.toLowerCase() === "not specified") continue;

      const alreadyExists = finalFindings.some(
        (finding) =>
          normalizeName(finding.parameterOrArea || "").includes(normalizeName(bodyPart))
      );

      if (!alreadyExists) {
        finalFindings.push({
          parameterOrArea: `${rad.bodyPart}${rad.studyType && rad.studyType !== "Not specified" ? ` (${rad.studyType})` : ""}`,
          flagOrStatus:
            rad.severity === "urgent"
              ? "critical"
              : rad.isAbnormal
              ? "high"
              : rad.isAbnormal === false
              ? "normal"
              : "unknown",
          valueText: rad.impression || rad.observation,
          simpleExplanation:
            rad.observation ||
            rad.impression ||
            "Radiographic scan finding recorded for this area.",
          clinicalSignificance: rad.impression,
        });
      }

      if (rad.isAbnormal || rad.severity === "urgent") {
        deterministicAlerts.push({
          title: `Radiology Alert: ${rad.bodyPart}`,
          severity: rad.severity === "urgent" ? "urgent" : "warning",
          riskDetail:
            rad.impression || rad.observation || "Abnormal radiographic finding observed.",
          immediateAction:
            "Consult an orthopedic doctor or emergency physician promptly for clinical examination and proper immobilization.",
        });
      }
    }

    // Merge deterministic alerts with AI alerts.
    const finalRiskAlerts = mergeRiskAlerts(
      deterministicAlerts,
      aiExplanation.risksAndAlerts || []
    );

    return NextResponse.json({
      summary: sanitizedSummary,
      docType: aiExplanation.docType || docType,
      risksAndAlerts: finalRiskAlerts,
      findings: finalFindings,
      medicationRoutine: aiExplanation.medicationRoutine || [],
      doctorQuestions: aiExplanation.doctorQuestions || [],
      lifestyleAndCareNotes: aiExplanation.lifestyleAndCareNotes,
      disclaimer: STANDARD_DISCLAIMER,
    });
  } catch (err: unknown) {
    console.error("Error in /api/explain:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to generate report explanation",
      },
      { status: 500 }
    );
  }
}
