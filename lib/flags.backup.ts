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

export function normalizeTestName(rawName: string): ReferenceTest | null {
  if (!rawName) return null;
  const clean = rawName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const item of testsDatabase) {
    const canonicalClean = item.canonicalName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (canonicalClean === clean) return item;

    for (const alias of item.aliases) {
      const aliasClean = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (aliasClean === clean) return item;
      if (clean.startsWith(aliasClean) && aliasClean.length > 2) return item;
    }
  }

  for (const item of testsDatabase) {
    for (const alias of item.aliases) {
      const aliasClean = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (aliasClean.length >= 3 && clean.includes(aliasClean)) {
        return item;
      }
    }
  }

  return null;
}

export function lookupReferenceRange(testName: string) {
  const match = normalizeTestName(testName);
  if (!match) {
    return {
      found: false,
      message: `No standard reference range on file for "${testName}". Please look for printed values on the report.`,
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

  let refLow = test.refLow ?? null;
  let refHigh = test.refHigh ?? null;
  let unit = test.unit ?? null;

  if ((refLow === null || refHigh === null) && norm) {
    if (refLow === null) refLow = norm.defaultLow;
    if (refHigh === null) refHigh = norm.defaultHigh;
    if (!unit) unit = norm.unit;
  }

  const val = test.value;

  if (val === null || isNaN(val)) {
    return {
      flag: "unknown",
      refLow,
      refHigh,
      unit,
      canonicalName,
      isCritical: false,
    };
  }

  // Check critical thresholds
  if (norm) {
    if (norm.criticalLow !== null && val <= norm.criticalLow) {
      return {
        flag: "critical",
        refLow,
        refHigh,
        unit,
        canonicalName,
        isCritical: true,
        criticalReason: `${canonicalName} value (${val} ${unit || ""}) is critically low (below safety threshold ${norm.criticalLow} ${unit || ""}).`,
      };
    }
    if (norm.criticalHigh !== null && val >= norm.criticalHigh) {
      return {
        flag: "critical",
        refLow,
        refHigh,
        unit,
        canonicalName,
        isCritical: true,
        criticalReason: `${canonicalName} value (${val} ${unit || ""}) is critically elevated (above danger threshold ${norm.criticalHigh} ${unit || ""}).`,
      };
    }
  }

  // Standard ranges
  if (refLow !== null && val < refLow) {
    return {
      flag: "low",
      refLow,
      refHigh,
      unit,
      canonicalName,
      isCritical: false,
    };
  }

  if (refHigh !== null && val > refHigh) {
    return {
      flag: "high",
      refLow,
      refHigh,
      unit,
      canonicalName,
      isCritical: false,
    };
  }

  if (refLow !== null || refHigh !== null) {
    return {
      flag: "normal",
      refLow,
      refHigh,
      unit,
      canonicalName,
      isCritical: false,
    };
  }

  return {
    flag: "unknown",
    refLow,
    refHigh,
    unit,
    canonicalName,
    isCritical: false,
  };
}

export function flagAllTests(tests: TestItem[]): {
  flaggedTests: TestItem[];
  riskAlerts: RiskAlert[];
} {
  const riskAlerts: RiskAlert[] = [];

  const flaggedTests = tests.map((t) => {
    const evalResult = evaluateTestFlag(t);

    if (evalResult.isCritical && evalResult.criticalReason) {
      riskAlerts.push({
        title: `Critical Alert: ${evalResult.canonicalName}`,
        severity: "urgent",
        riskDetail: evalResult.criticalReason,
        immediateAction: "Immediate physician review recommended due to vital safety parameter.",
      });
    }

    return {
      ...t,
      name: evalResult.canonicalName,
      refLow: evalResult.refLow,
      refHigh: evalResult.refHigh,
      unit: evalResult.unit || "",
      flag: evalResult.flag,
    };
  });

  return { flaggedTests, riskAlerts };
}
