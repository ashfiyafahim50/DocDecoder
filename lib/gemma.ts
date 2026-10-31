
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
 * Normalize model identifier to prevent crashes from invalid or legacy names.
 */
function normalizeModelName(modelName?: string): string {
  if (!modelName) return "gemini-2.5-flash";
  const trimmed = modelName.trim().toLowerCase();
  if (trimmed.includes("3.8") || trimmed === "gemini-flash" || !trimmed.startsWith("gemini-")) {
    return "gemini-2.5-flash";
  }
  return trimmed;
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

  const primaryModel = normalizeModelName(process.env.GEMINI_MODEL);

  const client = new GoogleGenerativeAI(apiKey);

  return { client, primaryModel };
}

/**
 * Comprehensive fallback models in priority order.
 * Ensures resiliency against regional outages, 503 capacity spikes, and quota throttles.
 */
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
  "gemini-1.5-pro",
];

/**
 * Check whether an error is transient and can benefit from a retry on the same model.
 */
function isTransientError(message: string): boolean {
  const errMsg = message.toLowerCase();
  return (
    errMsg.includes("503") ||
    errMsg.includes("high demand") ||
    errMsg.includes("unavailable") ||
    errMsg.includes("429") ||
    errMsg.includes("quota") ||
    errMsg.includes("resource has been exhausted") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("overloaded") ||
    errMsg.includes("econnreset") ||
    errMsg.includes("etimedout") ||
    errMsg.includes("fetch failed")
  );
}

/**
 * Check whether an error should trigger model fallback.
 */
function shouldFallbackOnError(message: string): boolean {
  const errMsg = message.toLowerCase();

  return (
    isTransientError(errMsg) ||
    errMsg.includes("500") ||
    errMsg.includes("internal error") ||
    errMsg.includes("not found") ||
    errMsg.includes("404") ||
    errMsg.includes("empty response") ||
    errMsg.includes("temporarily") ||
    errMsg.includes("network") ||
    errMsg.includes("timeout") ||
    errMsg.includes("enotfound")
  );
}

/**
 * Generate response with model fallback and automatic retry on transient capacity spikes (503 / 429).
 */
async function generateWithModelFallback(
  client: GoogleGenerativeAI,
  parts: any[],
  generationConfig: any,
  preferredModel: string
): Promise<{ text: string; modelUsed: string }> {
  const normalizedPreferred = normalizeModelName(preferredModel);
  const modelsToTry = [
    ...new Set([
      normalizedPreferred,
      ...FALLBACK_MODELS.filter(
        (model) => model !== normalizedPreferred
      ),
    ]),
  ];

  let lastError: unknown = null;
  const MAX_RETRIES_PER_MODEL = 2; // Initial try + 1 retry for transient spikes

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        console.log(
          `[DocDecoder AI] Requesting inference from: ${modelName} (attempt ${attempt + 1}/${MAX_RETRIES_PER_MODEL})...`
        );

        const model = client.getGenerativeModel(
          {
            model: modelName,
            generationConfig,
          },
          {
            timeout: 45000,
          }
        );

        const startTime = Date.now();

        const result = await model.generateContent(parts);
        const responseText = result.response.text();

        const elapsedTime = (
          (Date.now() - startTime) / 1000
        ).toFixed(2);

        if (responseText && responseText.trim().length > 0) {
          console.log(
            `[DocDecoder AI] Successful response from ${modelName} in ${elapsedTime}s`
          );

          return {
            text: responseText,
            modelUsed: modelName,
          };
        }

        throw new Error(`Empty response from ${modelName}`);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : String(err);

        console.warn(
          `[DocDecoder AI] Model ${modelName} attempt ${attempt + 1} failed: ${message}`
        );

        lastError = err;

        // If the model ID was not found (404), do not retry; fall back to next model immediately.
        if (message.includes("404") || message.includes("not found")) {
          break;
        }

        // If it's a transient spike (503 Service Unavailable / 429 Rate Limit) and we have retries left, wait and retry.
        if (isTransientError(message) && attempt < MAX_RETRIES_PER_MODEL - 1) {
          const delay = (attempt + 1) * 1500;
          console.log(
            `[DocDecoder AI] Transient capacity spike (503/429). Retrying ${modelName} in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // If error is eligible for fallback to another model, break attempt loop to proceed to next model.
        if (shouldFallbackOnError(message)) {
          break;
        }

        // Fatal/unrecoverable error (e.g. invalid arguments or non-transient error)
        throw err;
      }
    }

    // Small delay before trying the next fallback model.
    await new Promise((resolve) =>
      setTimeout(resolve, 800)
    );
  }

  throw (
    lastError ||
    new Error(
      "All AI models are temporarily unavailable. Please retry in a few moments."
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

    const rawMessage = err instanceof Error ? err.message : String(err);
    let friendlyMessage = rawMessage;

    if (
      rawMessage.includes("503") ||
      rawMessage.includes("high demand") ||
      rawMessage.includes("unavailable")
    ) {
      friendlyMessage =
        "The AI model is experiencing a temporary demand surge on Google's servers. Please retry in a few moments.";
    }

    throw new Error(
      `Failed to process document: ${friendlyMessage}`
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
