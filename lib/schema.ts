
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
  .catch("unknown");

export type DocType = z.infer<typeof DocTypeEnum>;

export const FlagEnum = z
  .enum(["low", "normal", "high", "critical", "unknown"])
  .catch("unknown");

export type FlagType = z.infer<typeof FlagEnum>;

const flexibleNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((val) => {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") return Number.isFinite(val) ? val : null;

    const cleanStr = String(val).trim().replace(/[^0-9.-]/g, "");
    if (!cleanStr) return null;

    const parsed = parseFloat(cleanStr);
    return Number.isFinite(parsed) ? parsed : null;
  });

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
    .transform((v) => v || "low"),
  notes: z.string().nullish().transform((v) => v || undefined),
});

export type TestItem = z.infer<typeof TestSchema>;

export const TimingSchema = z.object({
  morning: z.boolean().nullish().transform((v) => v ?? false),
  afternoon: z.boolean().nullish().transform((v) => v ?? false),
  night: z.boolean().nullish().transform((v) => v ?? false),

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
    .transform((v) => v || undefined),

  scheduleText: z.string().nullish().transform((v) => v || undefined),
  howToTake: z.string().nullish().transform((v) => v || undefined),
});

export type Timing = z.infer<typeof TimingSchema>;

export const MedicineSchema = z.object({
  name: z.string().nullish().transform((v) => v || "Medicine"),
  genericName: z.string().nullish().transform((v) => v || undefined),
  dose: z.string().nullish().transform((v) => v || undefined),

  form: z
    .enum([
      "tablet",
      "capsule",
      "syrup",
      "injection",
      "drops",
      "ointment",
      "inhaler",
      "other",
    ])
    .nullish()
    .transform((v) => v || "other"),

  timing: TimingSchema.nullish().transform((v) => v || undefined),

  duration: z.string().nullish().transform((v) => v || undefined),
  purpose: z.string().nullish().transform((v) => v || undefined),
  precautions: z.string().nullish().transform((v) => v || undefined),
});

export type MedicineItem = z.infer<typeof MedicineSchema>;

export const RadiologyFindingSchema = z.object({
  bodyPart: z.string().nullish().transform((v) => v || "Not specified"),
  studyType: z.string().nullish().transform((v) => v || "Not specified"),
  observation: z
    .string()
    .nullish()
    .transform((v) => v || "Not specified in report"),
  impression: z
    .string()
    .nullish()
    .transform((v) => v || "Not specified in report"),
  isAbnormal: z.boolean().nullish().transform((v) => v ?? null),
  severity: z
    .enum(["unknown", "normal", "mild", "moderate", "urgent"])
    .nullish()
    .transform((v) => v || "unknown"),
});

export type RadiologyFinding = z.infer<typeof RadiologyFindingSchema>;

export const ExtractResponseSchema = z.object({
  docType: DocTypeEnum.nullish().transform((v) => v || "unknown"),
  documentTitle: z.string().nullish().transform((v) => v || undefined),
  doctorOrHospital: z.string().nullish().transform((v) => v || undefined),
  patientNotes: z.string().nullish().transform((v) => v || undefined),
  tests: z.array(TestSchema).nullish().transform((v) => v || []),
  medicines: z.array(MedicineSchema).nullish().transform((v) => v || []),
  radiologyFindings: z
    .array(RadiologyFindingSchema)
    .nullish()
    .transform((v) => v || []),
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

export const FindingSchema = z.object({
  parameterOrArea: z.string().nullish().transform((v) => v || "Parameter"),
  flagOrStatus: z.string().nullish().transform((v) => v || "unknown"),
  valueText: z.string().nullish().transform((v) => v || undefined),
  simpleExplanation: z
    .string()
    .nullish()
    .transform((v) => v || "Not specified in report"),
  clinicalSignificance: z.string().nullish().transform((v) => v || undefined),
});

export type Finding = z.infer<typeof FindingSchema>;

export const RiskAlertSchema = z.object({
  title: z.string().nullish().transform((v) => v || "Health Notice"),
  severity: z
    .enum(["urgent", "warning", "advisory"])
    .nullish()
    .transform((v) => v || "warning"),
  riskDetail: z
    .string()
    .nullish()
    .transform((v) => v || "Please review with your physician"),
  immediateAction: z
    .string()
    .nullish()
    .transform((v) => v || "Consult your treating doctor"),
});

export type RiskAlert = z.infer<typeof RiskAlertSchema>;

export const ExplainRequestSchema = z.object({
  docType: DocTypeEnum.nullish().transform((v) => v || "unknown"),
  language: z.string().default("hinglish"),
  documentTitle: z.string().nullish().transform((v) => v || undefined),
  tests: z.array(TestSchema).nullish().transform((v) => v || []),
  medicines: z.array(MedicineSchema).nullish().transform((v) => v || []),
  radiologyFindings: z
    .array(RadiologyFindingSchema)
    .nullish()
    .transform((v) => v || []),
  keyObservations: z.array(z.string()).nullish().transform((v) => v || []),
});

export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;

const ExplanationMedicineSchema = z.object({
  name: z.string().nullish().transform((v) => v || "Medicine"),
  genericName: z.string().nullish().transform((v) => v || undefined),
  dose: z.string().nullish().transform((v) => v || undefined),
  form: z.string().nullish().transform((v) => v || "Not specified"),
  purpose: z
    .string()
    .nullish()
    .transform((v) => v || "Not specified in prescription"),
  howToTake: z
    .string()
    .nullish()
    .transform((v) => v || "Not specified in prescription"),
  whenToTake: z
    .string()
    .nullish()
    .transform((v) => v || "Not specified in prescription"),
  mealTiming: z
    .string()
    .nullish()
    .transform((v) => v || "Not specified in prescription"),
  duration: z.string().nullish().transform((v) => v || undefined),
  keyPrecautions: z.string().nullish().transform((v) => v || undefined),
});

export const ExplainResponseSchema = z.object({
  summary: z
    .string()
    .nullish()
    .transform((v) => v || "Report summary generated."),
  docType: DocTypeEnum.nullish().transform((v) => v || "unknown"),
  risksAndAlerts: z.array(RiskAlertSchema).nullish().transform((v) => v || []),
  findings: z.array(FindingSchema).nullish().transform((v) => v || []),

  medicationRoutine: z
    .array(ExplanationMedicineSchema)
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
