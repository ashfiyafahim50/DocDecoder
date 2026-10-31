import { RiskAlert } from "./schema";

/**
 * Forbidden assertive clinical phrases that must never be stated dogmatically to patients.
 * AI is allowed to explain physiology, radiology observations, and prescribed medicines,
 * but should frame them respectfully around doctor consultation.
 */
const FORBIDDEN_PATTERNS = [
  /\byou (have|suffer from|are diagnosed with)\b/i,
  /\bstart taking\b/i,
  /\bstop taking\b/i,
  /\bincrease your dose\b/i,
  /\bdecrease your dose\b/i,
  /\bi prescribe\b/i,
  /\bself-medicate\b/i,
  /\byou have cancer\b/i,
  /\bdefinitely indicates you have\b/i,
];

export const STANDARD_DISCLAIMER =
  "Important: Doc Decoder provides educational summaries to help you understand your reports, prescriptions, and radiology scans, and to prepare questions for your doctor. It is NOT a substitute for professional medical diagnosis or clinical judgment. Always review all results and prescriptions with your licensed healthcare provider.";

export function sanitizeExplanationText(text: string): {
  sanitized: string;
  violationsFound: boolean;
} {
  let sanitized = text;
  let violationsFound = false;

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sanitized)) {
      violationsFound = true;
      sanitized = sanitized.replace(
        pattern,
        "it is important to discuss with your doctor whether you may have"
      );
    }
  }

  return { sanitized, violationsFound };
}

/**
 * Merges deterministic code-generated risk alerts with AI-extracted risks
 */
export function mergeRiskAlerts(codeAlerts: RiskAlert[], aiAlerts: RiskAlert[] = []): RiskAlert[] {
  const map = new Map<string, RiskAlert>();

  // Code-generated deterministic alerts take precedence
  for (const a of codeAlerts) {
    map.set(a.title.toLowerCase(), a);
  }

  for (const a of aiAlerts) {
    const key = a.title.toLowerCase();
    if (!map.has(key)) {
      map.set(key, a);
    }
  }

  return Array.from(map.values());
}
