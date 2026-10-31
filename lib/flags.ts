
import referenceData from "./reference-ranges.json";
import { FlagType, TestItem, RiskAlert } from "./schema";

export interface ReferenceTest {
  id: string;
  canonicalName: string;
  aliases: string[];
  unit: string;
  defaultLow: number | null;
  defaultHigh: number | null;
  criticalLow: number | null;
  criticalHigh: number | null;
  category: string;
  description: string;
}

const testsDatabase: ReferenceTest[] = referenceData.tests;

function cleanName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Exact matching only. No partial or substring matching.
export function normalizeTestName(rawName: string): ReferenceTest | null {
  if (!rawName) return null;

  const clean = cleanName(rawName);

  const matches = testsDatabase.filter((item) => {
    if (cleanName(item.canonicalName) === clean) return true;

    return item.aliases.some((alias) => cleanName(alias) === clean);
  });

  // Ambiguous names must not be mapped automatically.
  return matches.length === 1 ? matches[0] : null;
}

function normalizeUnit(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .replace(/[μµ]/g, "u")
    .replace(/\s+/g, "")
    .replace(/³/g, "3");
}

function areUnitsCompatible(actual: string, expected: string): boolean {
  const actualUnit = normalizeUnit(actual);
  const expectedUnit = normalizeUnit(expected);

  if (!actualUnit || !expectedUnit) return false;
  if (actualUnit === expectedUnit) return true;

  // Equivalent count-per-volume formats.
  const countUnits = ["/ul", "/cmm", "/mm3", "cells/ul", "cell/ul"];

  if (
    countUnits.includes(actualUnit) &&
    countUnits.includes(expectedUnit)
  ) {
    return true;
  }

  return false;
}

export function lookupReferenceRange(testName: string) {
  const match = normalizeTestName(testName);

  if (!match) {
    return {
      found: false,
      message: `No unambiguous standard reference range found for "${testName}". Please check the printed report.`,
    };
  }

  return {
    found: true,
    test: match.canonicalName,
    unit: match.unit,
    standardRange: {
      low: match.defaultLow,
      high: match.defaultHigh,
    },
    criticalLimits: {
      low: match.criticalLow,
      high: match.criticalHigh,
    },
    category: match.category,
    description: match.description,
  };
}

export function evaluateTestFlag(test: TestItem): {
  flag: FlagType;
  refLow: number | null;
  refHigh: number | null;
  unit: string | null;
  canonicalName: string;
  isCritical: boolean;
  criticalReason?: string;
} {
  const norm = normalizeTestName(test.name);
  const canonicalName = norm ? norm.canonicalName : test.name;

  const originalUnit = test.unit?.trim() || null;

  // Unknown or ambiguous test names cannot be evaluated safely.
  if (!norm) {
    return {
      flag: "unknown",
      refLow: test.refLow ?? null,
      refHigh: test.refHigh ?? null,
      unit: originalUnit,
      canonicalName: test.name,
      isCritical: false,
    };
  }

  // Never compare values when the unit is missing or incompatible.
  if (!originalUnit || !areUnitsCompatible(originalUnit, norm.unit)) {
    return {
      flag: "unknown",
      refLow: test.refLow ?? null,
      refHigh: test.refHigh ?? null,
      unit: originalUnit,
      canonicalName,
      isCritical: false,
    };
  }

  const refLow = test.refLow ?? norm.defaultLow;
  const refHigh = test.refHigh ?? norm.defaultHigh;
  const val = test.value;

  if (val === null || !Number.isFinite(val)) {
    return {
      flag: "unknown",
      refLow,
      refHigh,
      unit: originalUnit,
      canonicalName,
      isCritical: false,
    };
  }

  if (norm.criticalLow !== null && val <= norm.criticalLow) {
    return {
      flag: "critical",
      refLow,
      refHigh,
      unit: originalUnit,
      canonicalName,
      isCritical: true,
      criticalReason: `${canonicalName} value (${val} ${originalUnit}) is below the configured critical threshold (${norm.criticalLow} ${norm.unit}). This requires verification against the original report and clinical review.`,
    };
  }

  if (norm.criticalHigh !== null && val >= norm.criticalHigh) {
    return {
      flag: "critical",
      refLow,
      refHigh,
      unit: originalUnit,
      canonicalName,
      isCritical: true,
      criticalReason: `${canonicalName} value (${val} ${originalUnit}) is above the configured critical threshold (${norm.criticalHigh} ${norm.unit}). This requires verification against the original report and clinical review.`,
    };
  }

  if (refLow !== null && val < refLow) {
    return {
      flag: "low",
      refLow,
      refHigh,
      unit: originalUnit,
      canonicalName,
      isCritical: false,
    };
  }

  if (refHigh !== null && val > refHigh) {
    return {
      flag: "high",
      refLow,
      refHigh,
      unit: originalUnit,
      canonicalName,
      isCritical: false,
    };
  }

  if (refLow !== null || refHigh !== null) {
    return {
      flag: "normal",
      refLow,
      refHigh,
      unit: originalUnit,
      canonicalName,
      isCritical: false,
    };
  }

  return {
    flag: "unknown",
    refLow,
    refHigh,
    unit: originalUnit,
    canonicalName,
    isCritical: false,
  };
}

export function flagAllTests(tests: TestItem[]): {
  flaggedTests: TestItem[];
  riskAlerts: RiskAlert[];
} {
  const riskAlerts: RiskAlert[] = [];

  const flaggedTests = tests.map((test) => {
    const result = evaluateTestFlag(test);

    if (result.isCritical && result.criticalReason) {
      riskAlerts.push({
        title: `Critical Alert: ${result.canonicalName}`,
        severity: "urgent",
        riskDetail: result.criticalReason,
        immediateAction:
          "Verify this result against the original laboratory report and seek prompt review from a qualified healthcare professional.",
      });
    }

    return {
      ...test,
      name: result.canonicalName,
      refLow: result.refLow,
      refHigh: result.refHigh,
      unit: result.unit || "",
      flag: result.flag,
    };
  });

  return { flaggedTests, riskAlerts };
}
