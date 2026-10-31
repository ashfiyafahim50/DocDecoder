
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
    .replace(/³/g, "3")
    .replace(/mil-lion/g, "million")
    .replace(/mill/g, "million");
}

function areUnitsCompatible(actual: string, expected: string): boolean {
  const actualUnit = normalizeUnit(actual);
  const expectedUnit = normalizeUnit(expected);

  if (!actualUnit || !expectedUnit) return false;
  if (actualUnit === expectedUnit) return true;

  // Equivalent count-per-volume formats (WBC, Platelets, Absolute DLC)
  const countUnits = [
    "/ul",
    "ul",
    "/cumm",
    "cumm",
    "/cmm",
    "cmm",
    "/mm3",
    "mm3",
    "cells/ul",
    "cell/ul",
    "cells/cumm",
    "cell/cumm",
  ];

  if (countUnits.includes(actualUnit) && countUnits.includes(expectedUnit)) {
    return true;
  }

  // Equivalent million per volume formats (for RBC)
  const millionUnits = [
    "million/ul",
    "million/cumm",
    "million/cmm",
    "million/mm3",
    "mil/cumm",
    "mil/ul",
    "10^6/ul",
    "10^6/cumm",
  ];
  if (millionUnits.includes(actualUnit) && millionUnits.includes(expectedUnit)) {
    return true;
  }

  // Grams per deciliter (Hemoglobin, MCHC)
  const gdlUnits = ["g/dl", "gm/dl", "g/100ml", "gm/100ml"];
  if (gdlUnits.includes(actualUnit) && gdlUnits.includes(expectedUnit)) {
    return true;
  }

  // Femtoliters (MCV, MPV, RDW-SD)
  const flUnits = ["fl", "femtoliter", "femtoliters"];
  if (flUnits.includes(actualUnit) && flUnits.includes(expectedUnit)) {
    return true;
  }

  // Picograms (MCH)
  const pgUnits = ["pg", "picogram", "picograms"];
  if (pgUnits.includes(actualUnit) && pgUnits.includes(expectedUnit)) {
    return true;
  }

  // Percentage (DLC differentials, Hct/PCV, RDW-CV)
  const pctUnits = ["%", "percent", "percentage"];
  if (pctUnits.includes(actualUnit) && pctUnits.includes(expectedUnit)) {
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
  const val = test.value;

  // 1. If standard test exists in dictionary and units match, evaluate standard ranges + critical limits
  if (norm && (!originalUnit || areUnitsCompatible(originalUnit, norm.unit))) {
    const refLow = test.refLow ?? norm.defaultLow;
    const refHigh = test.refHigh ?? norm.defaultHigh;

    if (val === null || !Number.isFinite(val)) {
      return {
        flag: "unknown",
        refLow,
        refHigh,
        unit: originalUnit || norm.unit,
        canonicalName,
        isCritical: false,
      };
    }

    if (norm.criticalLow !== null && val <= norm.criticalLow) {
      return {
        flag: "critical",
        refLow,
        refHigh,
        unit: originalUnit || norm.unit,
        canonicalName,
        isCritical: true,
        criticalReason: `${canonicalName} value (${val} ${originalUnit || norm.unit}) is below the configured critical threshold (${norm.criticalLow} ${norm.unit}). This requires clinical review.`,
      };
    }

    if (norm.criticalHigh !== null && val >= norm.criticalHigh) {
      return {
        flag: "critical",
        refLow,
        refHigh,
        unit: originalUnit || norm.unit,
        canonicalName,
        isCritical: true,
        criticalReason: `${canonicalName} value (${val} ${originalUnit || norm.unit}) is above the configured critical threshold (${norm.criticalHigh} ${norm.unit}). This requires clinical review.`,
      };
    }

    if (refLow !== null && val < refLow) {
      return {
        flag: "low",
        refLow,
        refHigh,
        unit: originalUnit || norm.unit,
        canonicalName,
        isCritical: false,
      };
    }

    if (refHigh !== null && val > refHigh) {
      return {
        flag: "high",
        refLow,
        refHigh,
        unit: originalUnit || norm.unit,
        canonicalName,
        isCritical: false,
      };
    }

    if (refLow !== null || refHigh !== null) {
      return {
        flag: "normal",
        refLow,
        refHigh,
        unit: originalUnit || norm.unit,
        canonicalName,
        isCritical: false,
      };
    }
  }

  // 2. Fallback to printed report reference ranges if available on the document
  const reportRefLow = test.refLow ?? null;
  const reportRefHigh = test.refHigh ?? null;

  if (val !== null && Number.isFinite(val) && (reportRefLow !== null || reportRefHigh !== null)) {
    if (reportRefLow !== null && val < reportRefLow) {
      return {
        flag: "low",
        refLow: reportRefLow,
        refHigh: reportRefHigh,
        unit: originalUnit,
        canonicalName,
        isCritical: false,
      };
    }
    if (reportRefHigh !== null && val > reportRefHigh) {
      return {
        flag: "high",
        refLow: reportRefLow,
        refHigh: reportRefHigh,
        unit: originalUnit,
        canonicalName,
        isCritical: false,
      };
    }
    return {
      flag: "normal",
      refLow: reportRefLow,
      refHigh: reportRefHigh,
      unit: originalUnit,
      canonicalName,
      isCritical: false,
    };
  }

  return {
    flag: test.flag && test.flag !== "unknown" ? test.flag : "unknown",
    refLow: reportRefLow,
    refHigh: reportRefHigh,
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
