
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  UNIVERSAL_EXTRACTION_PROMPT,
  buildUniversalExplanationPrompt,
} from "./prompts";
import {
  ExtractResponse,
  ExtractResponseSchema,
  ExplainResponse,
  ExplainResponseSchema,
  TestItem,
  MedicineItem,
  RadiologyFinding,
} from "./schema";

/**
 * Parse JSON returned by the AI model.
 */
export function cleanAndParseJSON<T>(rawText: string): T {
  let cleaned = rawText.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI response does not contain valid JSON.");
  }

  cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  return JSON.parse(cleaned) as T;
}

/**
 * Strict number parser.
 * Does not convert values such as <5 or scientific notation
 * into misleading numbers.
 */
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) return null;

  const validNumber =
    /^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/;

  if (!validNumber.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized.replace(/,/g, ""));

  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Initialize Gemini client.
 */
export function getGeminiClient(): {
  client: GoogleGenerativeAI;
  primaryModel: string;
} {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured in .env.local. Please check your API key."
    );
  }

  const primaryModel =
    process.env.GEMINI_MODEL || "gemini-3.8-flash";

  const client = new GoogleGenerativeAI(apiKey);

  return { client, primaryModel };
}

/**
 * Fallback models.
 * Keep only model IDs that you have verified are available
 * for your Gemini API account.
 */
const FALLBACK_MODELS = [
  "gemini-flash-latest",
];

/**
 * Check whether an error should trigger model fallback.
 */
function shouldFallbackOnError(message: string): boolean {
  const errMsg = message.toLowerCase();

  return (
    errMsg.includes("500") ||
    errMsg.includes("internal error") ||
    errMsg.includes("503") ||
    errMsg.includes("high demand") ||
    errMsg.includes("unavailable") ||
    errMsg.includes("429") ||
    errMsg.includes("quota") ||
    errMsg.includes("resource has been exhausted") ||
    errMsg.includes("not found") ||
    errMsg.includes("404") ||
    errMsg.includes("empty response") ||
    errMsg.includes("overloaded") ||
    errMsg.includes("temporarily")
  );
}

/**
 * Generate response with model fallback.
 */
async function generateWithModelFallback(
  client: GoogleGenerativeAI,
  parts: any[],
  generationConfig: any,
  preferredModel: string
): Promise<{ text: string; modelUsed: string }> {
  const modelsToTry = [
    ...new Set([
      preferredModel,
      ...FALLBACK_MODELS.filter(
        (model) => model !== preferredModel
      ),
    ]),
  ];

  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(
        `[DocDecoder AI] Requesting inference from: ${modelName}...`
      );

      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig,
      });

      const result = await model.generateContent(parts);
      const responseText = result.response.text();

      if (responseText && responseText.trim().length > 0) {
        console.log(
          `[DocDecoder AI] Successful response from: ${modelName}`
        );

        return {
          text: responseText,
          modelUsed: modelName,
        };
      }

      lastError = new Error(
        `Empty response from ${modelName}`
      );

      console.warn(
        `[DocDecoder AI] Empty response from ${modelName}. Trying next model...`
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);

      console.warn(
        `[DocDecoder AI] Model ${modelName} returned error: ${message}`
      );

      lastError = err;

      if (shouldFallbackOnError(message)) {
        console.log(
          `[DocDecoder AI] Temporary/model error. Trying next fallback model...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );

        continue;
      }

      throw err;
    }
  }

  throw (
    lastError ||
    new Error(
      "All AI models are temporarily unavailable. Please retry."
    )
  );
}

/**
 * Safely converts extracted AI data into application schema.
 * Missing medicine instructions remain missing.
 */
function safeSanitizeExtraction(raw: any): ExtractResponse {
  const tests: TestItem[] = Array.isArray(raw?.tests)
    ? raw.tests.map((t: any) => ({
      name: t?.name ? String(t.name) : "Unnamed Test",
      value: parseNumber(t?.value),
      unit: t?.unit ? String(t.unit) : "",
      refLow: parseNumber(t?.refLow),
      refHigh: parseNumber(t?.refHigh),
      flag: t?.flag || "unknown",
      confidence: t?.confidence || "low",
      notes: t?.notes ? String(t.notes) : undefined,
    }))
    : [];

  const medicines: MedicineItem[] = Array.isArray(raw?.medicines)
    ? raw.medicines.map((m: any) => {
      const rawTiming = m?.timing;

      return {
        name: m?.name ? String(m.name) : "Medicine",

        genericName: m?.genericName
          ? String(m.genericName)
          : undefined,

        dose: m?.dose ? String(m.dose) : undefined,

        form: [
          "tablet",
          "capsule",
          "syrup",
          "injection",
          "drops",
          "ointment",
          "inhaler",
          "other",
        ].includes(m?.form)
          ? m.form
          : "other",

        timing:
          rawTiming && typeof rawTiming === "object"
            ? {
              morning: rawTiming.morning === true,
              afternoon: rawTiming.afternoon === true,
              night: rawTiming.night === true,

              mealTiming: [
                "before_food",
                "after_food",
                "with_food",
                "empty_stomach",
                "at_bedtime",
                "as_needed",
                "anytime",
              ].includes(rawTiming.mealTiming)
                ? rawTiming.mealTiming
                : undefined,

              scheduleText:
                typeof rawTiming.scheduleText === "string"
                  ? rawTiming.scheduleText
                  : undefined,

              howToTake:
                typeof rawTiming.howToTake === "string"
                  ? rawTiming.howToTake
                  : undefined,
            }
            : undefined,

        duration: m?.duration ? String(m.duration) : undefined,
        purpose: m?.purpose ? String(m.purpose) : undefined,

        precautions: m?.precautions
          ? String(m.precautions)
          : undefined,
      };
    })
    : [];

  const radiologyFindings: RadiologyFinding[] = Array.isArray(
    raw?.radiologyFindings
  )
    ? raw.radiologyFindings.map((r: any) => ({
      bodyPart: r?.bodyPart
        ? String(r.bodyPart)
        : "Not specified",

      studyType: r?.studyType
        ? String(r.studyType)
        : "Not specified",

      observation: r?.observation
        ? String(r.observation)
        : "Not specified in report",

      impression: r?.impression
        ? String(r.impression)
        : "Not specified in report",

      isAbnormal:
        r?.isAbnormal === true
          ? true
          : r?.isAbnormal === false
            ? false
            : null,

      severity: [
        "unknown",
        "normal",
        "mild",
        "moderate",
        "urgent",
      ].includes(r?.severity)
        ? r.severity
        : "unknown",
    }))
    : [];

  return {
    docType: raw?.docType || "unknown",

    documentTitle: raw?.documentTitle
      ? String(raw.documentTitle)
      : undefined,

    doctorOrHospital: raw?.doctorOrHospital
      ? String(raw.doctorOrHospital)
      : undefined,

    patientNotes: raw?.patientNotes
      ? String(raw.patientNotes)
      : undefined,

    tests,
    medicines,
    radiologyFindings,

    keyObservations: Array.isArray(raw?.keyObservations)
      ? raw.keyObservations.map(String)
      : [],

    warnings: Array.isArray(raw?.warnings)
      ? raw.warnings.map(String)
      : [],
  };
}

/**
 * Pass 1: Extract information from uploaded document.
 */
export async function extractFromImage(
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<ExtractResponse> {
  const { client, primaryModel } = getGeminiClient();

  const cleanBase64 = base64Data.includes("base64,")
    ? base64Data.split("base64,")[1]
    : base64Data;

  if (!cleanBase64?.trim()) {
    throw new Error("The uploaded document image is empty.");
  }

  const parts = [
    { text: UNIVERSAL_EXTRACTION_PROMPT },
    {
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    },
  ];

  const config = {
    temperature: 0.1,
    topP: 0.95,
    responseMimeType: "application/json",
  };

  try {
    const { text: responseText } =
      await generateWithModelFallback(
        client,
        parts,
        config,
        primaryModel
      );

    const parsed = cleanAndParseJSON<unknown>(responseText);

    const validated = ExtractResponseSchema.safeParse(parsed);

    if (validated.success) {
      return validated.data;
    }

    console.warn(
      "[DocDecoder AI] Extraction schema validation failed:",
      validated.error.flatten()
    );

    const sanitized = safeSanitizeExtraction(parsed);

    const sanitizedValidation =
      ExtractResponseSchema.safeParse(sanitized);

    if (!sanitizedValidation.success) {
      console.error(
        "[DocDecoder AI] Sanitized extraction validation failed:",
        sanitizedValidation.error.flatten()
      );

      throw new Error(
        "Extracted information could not be validated safely. Please try another clear document."
      );
    }

    return sanitizedValidation.data;
  } catch (err: unknown) {
    console.error(
      "Extraction error after failover cascade:",
      err
    );

    throw new Error(
      `Failed to process document: ${err instanceof Error
        ? err.message
        : "Invalid JSON or unreadable image"
      }`
    );
  }
}

/**
 * Pass 2: Generate a plain-language explanation.
 */
export async function explainReport(params: {
  docType: string;
  language: string;
  documentTitle?: string;
  tests: TestItem[];
  medicines: MedicineItem[];
  radiologyFindings?: RadiologyFinding[];
  keyObservations?: string[];
}): Promise<ExplainResponse> {
  const { client, primaryModel } = getGeminiClient();

  const prompt = buildUniversalExplanationPrompt({
    docType: params.docType,
    language: params.language,
    documentTitle: params.documentTitle,

    testsJson: JSON.stringify(params.tests, null, 2),
    medicinesJson: JSON.stringify(params.medicines, null, 2),

    radiologyJson: JSON.stringify(
      params.radiologyFindings || [],
      null,
      2
    ),

    keyObservationsJson: JSON.stringify(
      params.keyObservations || [],
      null,
      2
    ),
  });

  const config = {
    temperature: 0.2,
    topP: 0.95,
    responseMimeType: "application/json",
  };

  const {
    text: responseText,
    modelUsed,
  } = await generateWithModelFallback(
    client,
    [{ text: prompt }],
    config,
    primaryModel
  );

  console.log(
    `[DocDecoder AI] Explanation synthesized successfully using ${modelUsed}`
  );

  const parsed = cleanAndParseJSON<unknown>(responseText);

  const validated = ExplainResponseSchema.safeParse(parsed);

  if (!validated.success) {
    console.error(
      "[DocDecoder AI] Explanation schema validation failed:",
      validated.error.flatten()
    );

    throw new Error(
      "AI explanation response did not match the expected format. Please retry."
    );
  }

  return validated.data;
}
