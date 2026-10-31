import { z } from "zod";

export const DocTypeEnum = z
  .enum([
    "lab_report",
    "prescription",
    "radiology_imaging",
    "discharge_summary",
    "consultation_note",
    "other",
    "unknown",
  ])
  .catch("lab_report");
export type DocType = z.infer<typeof DocTypeEnum>;

export const FlagEnum = z
  .enum(["low", "normal", "high", "critical", "unknown"])
  .catch("unknown");
export type FlagType = z.infer<typeof FlagEnum>;

// Helper to accept string | number | null | undefined and turn into a clean number or null
const flexibleNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((val) => {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") return isNaN(val) ? null : val;
    const cleanStr = String(val).trim().replace(/[^0-9.-]/g, "");
    if (!cleanStr) return null;
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? null : parsed;
  });

// Lab Test Schema (Bulletproof to nulls)
export const TestSchema = z.object({
  name: z.string().nullish().transform((v) => v || "Unnamed Test"),
  value: flexibleNumber,
  unit: z.string().nullish().transform((v) => v || ""),
  refLow: flexibleNumber,
  refHigh: flexibleNumber,
  flag: FlagEnum.nullish().transform((v) => v || "unknown"),
  confidence: z
    .enum(["high", "medium", "low"])
    .nullish()
    .transform((v) => v || "high"),
  notes: z.string().nullish().transform((v) => v || undefined),
});
export type TestItem = z.infer<typeof TestSchema>;

// Detailed Prescription Medicine Schema
export const TimingSchema = z.object({
  morning: z.boolean().nullish().transform((v) => Boolean(v)),
  afternoon: z.boolean().nullish().transform((v) => Boolean(v)),
  night: z.boolean().nullish().transform((v) => Boolean(v)),
  mealTiming: z
    .enum([
      "before_food",
      "after_food",
      "with_food",
      "empty_stomach",
      "at_bedtime",
      "as_needed",
      "anytime",
    ])
    .nullish()
    .transform((v) => v || "after_food"),
  scheduleText: z.string().nullish().transform((v) => v || undefined),
  howToTake: z.string().nullish().transform((v) => v || undefined),
});
export type Timing = z.infer<typeof TimingSchema>;

export const MedicineSchema = z.object({
  name: z.string().nullish().transform((v) => v || "Medicine"),
  genericName: z.string().nullish().transform((v) => v || undefined),
  dose: z.string().nullish().transform((v) => v || undefined),
  form: z
    .enum(["tablet", "capsule", "syrup", "injection", "drops", "ointment", "inhaler", "other"])
    .nullish()
    .transform((v) => v || "tablet"),
  timing: TimingSchema.nullish().transform(
    (v): Timing =>
      v || {
        morning: true,
        afternoon: false,
        night: true,
        mealTiming: "after_food",
        scheduleText: undefined,
        howToTake: undefined,
      }
  ),
  duration: z.string().nullish().transform((v) => v || undefined),
  purpose: z.string().nullish().transform((v) => v || undefined),
  precautions: z.string().nullish().transform((v) => v || undefined),
});
export type MedicineItem = z.infer<typeof MedicineSchema>;

// Radiology & Imaging (X-Ray, CT, MRI, USG, ECG)
export const RadiologyFindingSchema = z.object({
  bodyPart: z.string().nullish().transform((v) => v || "Area examined"),
  studyType: z.string().nullish().transform((v) => v || "Imaging scan"),
  observation: z.string().nullish().transform((v) => v || "No specific abnormal findings"),
  impression: z.string().nullish().transform((v) => v || "Evaluation complete"),
  isAbnormal: z.boolean().nullish().transform((v) => Boolean(v)),
  severity: z
    .enum(["normal", "mild", "moderate", "urgent"])
    .nullish()
    .transform((v) => v || "normal"),
});
export type RadiologyFinding = z.infer<typeof RadiologyFindingSchema>;

// Unified Extract Response
export const ExtractResponseSchema = z.object({
  docType: DocTypeEnum.nullish().transform((v) => v || "lab_report"),
  documentTitle: z.string().nullish().transform((v) => v || undefined),
  doctorOrHospital: z.string().nullish().transform((v) => v || undefined),
  patientNotes: z.string().nullish().transform((v) => v || undefined),
  tests: z.array(TestSchema).nullish().transform((v) => v || []),
  medicines: z.array(MedicineSchema).nullish().transform((v) => v || []),
  radiologyFindings: z.array(RadiologyFindingSchema).nullish().transform((v) => v || []),
  keyObservations: z.array(z.string()).nullish().transform((v) => v || []),
  warnings: z.array(z.string()).nullish().transform((v) => v || []),
});
export type ExtractResponse = z.infer<typeof ExtractResponseSchema>;

export const ExtractRequestSchema = z.object({
  image: z.string().min(1, "Base64 image is required"),
  mimeType: z.string().default("image/jpeg"),
  targetLanguage: z.string().default("hinglish"),
});
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

// Detailed Finding for Report
export const FindingSchema = z.object({
  parameterOrArea: z.string().nullish().transform((v) => v || "Parameter"),
  flagOrStatus: z.string().nullish().transform((v) => v || "normal"),
  valueText: z.string().nullish().transform((v) => v || undefined),
  simpleExplanation: z.string().nullish().transform((v) => v || "Standard observation"),
  clinicalSignificance: z.string().nullish().transform((v) => v || undefined),
});
export type Finding = z.infer<typeof FindingSchema>;

// Risks & Red-Flags Schema
export const RiskAlertSchema = z.object({
  title: z.string().nullish().transform((v) => v || "Health Notice"),
  severity: z
    .enum(["urgent", "warning", "advisory"])
    .nullish()
    .transform((v) => v || "warning"),
  riskDetail: z.string().nullish().transform((v) => v || "Please review with your physician"),
  immediateAction: z.string().nullish().transform((v) => v || "Consult your treating doctor"),
});
export type RiskAlert = z.infer<typeof RiskAlertSchema>;

// Explanation Request & Response
export const ExplainRequestSchema = z.object({
  docType: DocTypeEnum.nullish().transform((v) => v || "lab_report"),
  language: z.string().default("hinglish"),
  documentTitle: z.string().nullish().transform((v) => v || undefined),
  tests: z.array(TestSchema).nullish().transform((v) => v || []),
  medicines: z.array(MedicineSchema).nullish().transform((v) => v || []),
  radiologyFindings: z.array(RadiologyFindingSchema).nullish().transform((v) => v || []),
  keyObservations: z.array(z.string()).nullish().transform((v) => v || []),
});
export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;

export const ExplainResponseSchema = z.object({
  summary: z.string().nullish().transform((v) => v || "Report summary generated."),
  docType: DocTypeEnum.nullish().transform((v) => v || "lab_report"),
  risksAndAlerts: z.array(RiskAlertSchema).nullish().transform((v) => v || []),
  findings: z.array(FindingSchema).nullish().transform((v) => v || []),
  medicationRoutine: z
    .array(
      z.object({
        name: z.string().nullish().transform((v) => v || "Medicine"),
        genericName: z.string().nullish().transform((v) => v || undefined),
        dose: z.string().nullish().transform((v) => v || undefined),
        form: z.string().nullish().transform((v) => v || "tablet"),
        purpose: z.string().nullish().transform((v) => v || "Treatment"),
        howToTake: z.string().nullish().transform((v) => v || "Take as advised by doctor"),
        whenToTake: z.string().nullish().transform((v) => v || "Daily"),
        mealTiming: z.string().nullish().transform((v) => v || "After food"),
        duration: z.string().nullish().transform((v) => v || undefined),
        keyPrecautions: z.string().nullish().transform((v) => v || undefined),
      })
    )
    .nullish()
    .transform((v) => v || []),
  doctorQuestions: z.array(z.string()).nullish().transform((v) => v || []),
  lifestyleAndCareNotes: z.string().nullish().transform((v) => v || undefined),
  disclaimer: z
    .string()
    .nullish()
    .transform(
      (v) =>
        v ||
        "Important: Doc Decoder provides educational summaries to help you understand your reports. Always review all results with your licensed healthcare provider."
    ),
});
export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;
