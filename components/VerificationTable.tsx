
"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  Eye,
  ShieldCheck,
  Check,
  Pill,
  Activity,
  Scan,
} from "lucide-react";
import {
  TestItem,
  MedicineItem,
  RadiologyFinding,
  DocType,
} from "@/lib/schema";
import { evaluateTestFlag } from "@/lib/flags";

interface VerificationTableProps {
  docType: DocType;
  tests: TestItem[];
  medicines: MedicineItem[];
  radiologyFindings?: RadiologyFinding[];
  warnings: string[];
  previewUrl: string | null;
  onConfirm: (
    verifiedTests: TestItem[],
    verifiedMedicines: MedicineItem[],
    verifiedRadiology: RadiologyFinding[]
  ) => void;
  isLoading: boolean;
}

export function VerificationTable({
  docType,
  tests: initialTests,
  medicines: initialMedicines,
  radiologyFindings: initialRadiology = [],
  warnings,
  previewUrl,
  onConfirm,
  isLoading,
}: VerificationTableProps) {
  const [tests, setTests] = useState<TestItem[]>(initialTests);
  const [medicines, setMedicines] = useState<MedicineItem[]>(initialMedicines);
  const [radiology, setRadiology] =
    useState<RadiologyFinding[]>(initialRadiology);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Lab test updates
  const updateTestField = (
    index: number,
    field: keyof TestItem,
    val: any
  ) => {
    const updated = [...tests];
    const item = { ...updated[index], [field]: val };

    const evaluation = evaluateTestFlag(item);
    item.flag = evaluation.flag;

    if (evaluation.refLow !== null && item.refLow === null) {
      item.refLow = evaluation.refLow;
    }

    if (evaluation.refHigh !== null && item.refHigh === null) {
      item.refHigh = evaluation.refHigh;
    }

    updated[index] = item;
    setTests(updated);
  };

  const addTestRow = () => {
    setTests([
      ...tests,
      {
        name: "",
        value: null,
        unit: "",
        refLow: null,
        refHigh: null,
        flag: "unknown",
        confidence: "low",
      },
    ]);
  };

  const removeTestRow = (index: number) => {
    setTests(tests.filter((_, i) => i !== index));
  };

  // Medicine updates
  const updateMedicineField = (
    index: number,
    field: keyof MedicineItem,
    val: any
  ) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: val };
    setMedicines(updated);
  };

  const updateMedicineTiming = (
    index: number,
    timingField: string,
    val: any
  ) => {
    const updated = [...medicines];
    const currentTiming = updated[index].timing;

    const timing = {
      morning: currentTiming?.morning ?? false,
      afternoon: currentTiming?.afternoon ?? false,
      night: currentTiming?.night ?? false,
      ...currentTiming,
      [timingField]: val,
    };

    updated[index] = { ...updated[index], timing };
    setMedicines(updated);
  };

  const addMedicineRow = () => {
    setMedicines([
      ...medicines,
      {
        name: "",
        genericName: "",
        dose: "",
        form: "other",
        timing: {
          morning: false,
          afternoon: false,
          night: false,
          scheduleText: "",
        },
        duration: "",
        purpose: "",
      },
    ]);
  };

  const removeMedicineRow = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  // Radiology updates
  const updateRadiologyField = (
    index: number,
    field: keyof RadiologyFinding,
    val: any
  ) => {
    const updated = [...radiology];
    updated[index] = { ...updated[index], [field]: val };
    setRadiology(updated);
  };

  const addRadiologyRow = () => {
    setRadiology([
      ...radiology,
      {
        bodyPart: "",
        studyType: "",
        observation: "",
        impression: "",
        isAbnormal: null,
        severity: "unknown",
      },
    ]);
  };

  const removeRadiologyRow = (index: number) => {
    setRadiology(radiology.filter((_, i) => i !== index));
  };

  const getChipClass = (flag?: string) => {
    switch (flag) {
      case "normal":
        return "chip chip-normal";
      case "low":
      case "high":
        return "chip chip-low";
      case "critical":
        return "chip chip-critical";
      default:
        return "chip chip-unknown";
    }
  };

  return (
    <div style={{ margin: "28px auto", maxWidth: "1150px" }}>
      {/* Verification banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldCheck size={22} style={{ color: "var(--brand-blue)" }} />

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h4 style={{ fontSize: "15px", fontWeight: 700 }}>
                Human Verification Audit (Clinical Safety Check)
              </h4>

              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {docType.replace("_", " ")}
              </span>
            </div>

            <p style={{ fontSize: "12.5px", marginTop: "2px" }}>
              AI read this from your document. Please verify, fix any spelling
              or digits, and confirm.
            </p>
          </div>
        </div>

        {previewUrl && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px" }}
            onClick={() => setShowPreviewModal(!showPreviewModal)}
          >
            <Eye size={14} />
            <span>
              {showPreviewModal
                ? "Hide Document Photo"
                : "View Uploaded Photo"}
            </span>
          </button>
        )}
      </div>

      {/* Uploaded document preview */}
      {showPreviewModal && previewUrl && (
        <div
          style={{
            marginBottom: "24px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}
          >
            Original Uploaded Document
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Original Document"
            style={{
              maxHeight: "380px",
              maxWidth: "100%",
              objectFit: "contain",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}
          />
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            background: "var(--status-warn-bg)",
            border: "1px solid var(--status-warn-border)",
            color: "var(--status-warn-text)",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
            }}
          >
            <AlertCircle size={15} />
            <span>Document Notes & Warnings:</span>
          </div>

          {warnings.map((w, idx) => (
            <div key={idx} style={{ marginLeft: "20px" }}>
              • {w}
            </div>
          ))}
        </div>
      )}

      {/* Section 1: Medicines */}
      {medicines.length > 0 && (
        <div className="table-container" style={{ marginBottom: "28px" }}>
          <div
            style={{
              padding: "14px 18px",
              background: "var(--bg-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Pill size={16} style={{ color: "var(--brand-blue)" }} />
              <span style={{ fontWeight: 700, fontSize: "14px" }}>
                Prescribed Medicines & Tablets ({medicines.length})
              </span>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "4px 10px" }}
              onClick={addMedicineRow}
            >
              <Plus size={13} />
              <span>Add Medicine</span>
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Medicine Name</th>
                  <th style={{ width: "16%" }}>Dosage / Form</th>
                  <th style={{ width: "20%" }}>Daily Schedule</th>
                  <th style={{ width: "20%" }}>When to Take</th>
                  <th style={{ width: "16%" }}>Duration</th>
                  <th style={{ width: "4%" }}></th>
                </tr>
              </thead>

              <tbody>
                {medicines.map((med, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        className="table-input"
                        value={med.name || ""}
                        placeholder="Medicine name"
                        onChange={(e) =>
                          updateMedicineField(idx, "name", e.target.value)
                        }
                      />

                      {med.genericName && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-light)",
                            marginTop: "2px",
                          }}
                        >
                          {med.genericName}
                        </div>
                      )}
                    </td>

                    <td>
                      <input
                        className="table-input"
                        value={med.dose || ""}
                        placeholder="Dose as written"
                        onChange={(e) =>
                          updateMedicineField(idx, "dose", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        className="table-input"
                        value={med.timing?.scheduleText || ""}
                        placeholder="Only if written in prescription"
                        onChange={(e) =>
                          updateMedicineTiming(
                            idx,
                            "scheduleText",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <select
                        className="table-input"
                        value={med.timing?.mealTiming || ""}
                        onChange={(e) =>
                          updateMedicineTiming(
                            idx,
                            "mealTiming",
                            e.target.value || undefined
                          )
                        }
                      >
                        <option value="">Not specified</option>
                        <option value="empty_stomach">
                          Khali Pet (Before Food)
                        </option>
                        <option value="after_food">
                          Khane ke baad (After Food)
                        </option>
                        <option value="with_food">
                          Khane ke sath (With Meal)
                        </option>
                        <option value="at_bedtime">
                          Sote waqt (Bedtime / HS)
                        </option>
                        <option value="as_needed">
                          Zaroorat par (SOS)
                        </option>
                      </select>
                    </td>

                    <td>
                      <input
                        className="table-input"
                        value={med.duration || ""}
                        placeholder="Only if written"
                        onChange={(e) =>
                          updateMedicineField(idx, "duration", e.target.value)
                        }
                      />
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => removeMedicineRow(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-light)",
                          cursor: "pointer",
                        }}
                        aria-label="Remove medicine"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Lab tests */}
      {tests.length > 0 && (
        <div className="table-container" style={{ marginBottom: "28px" }}>
          <div
            style={{
              padding: "14px 18px",
              background: "var(--bg-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={16} style={{ color: "var(--brand-navy)" }} />
              <span style={{ fontWeight: 700, fontSize: "14px" }}>
                Lab Test Parameters ({tests.length})
              </span>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "4px 10px" }}
              onClick={addTestRow}
            >
              <Plus size={13} />
              <span>Add Test</span>
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>Test Name</th>
                  <th style={{ width: "16%" }}>Observed Value</th>
                  <th style={{ width: "14%" }}>Unit</th>
                  <th style={{ width: "14%" }}>Printed Low</th>
                  <th style={{ width: "14%" }}>Printed High</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "4%" }}></th>
                </tr>
              </thead>

              <tbody>
                {tests.map((test, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        className="table-input"
                        value={test.name || ""}
                        placeholder="Test name"
                        onChange={(e) =>
                          updateTestField(idx, "name", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        className="table-input mono"
                        value={test.value !== null ? test.value : ""}
                        placeholder="Not specified"
                        onChange={(e) =>
                          updateTestField(
                            idx,
                            "value",
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        className="table-input"
                        value={test.unit || ""}
                        placeholder="e.g. g/dL"
                        onChange={(e) =>
                          updateTestField(idx, "unit", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        className="table-input mono"
                        value={test.refLow !== null ? test.refLow : ""}
                        placeholder="-"
                        onChange={(e) =>
                          updateTestField(
                            idx,
                            "refLow",
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        className="table-input mono"
                        value={test.refHigh !== null ? test.refHigh : ""}
                        placeholder="-"
                        onChange={(e) =>
                          updateTestField(
                            idx,
                            "refHigh",
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td>
                      <span className={getChipClass(test.flag)}>
                        {test.flag || "unknown"}
                      </span>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => removeTestRow(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-light)",
                          cursor: "pointer",
                        }}
                        aria-label="Remove test"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Radiology */}
      {radiology.length > 0 && (
        <div className="table-container" style={{ marginBottom: "28px" }}>
          <div
            style={{
              padding: "14px 18px",
              background: "var(--bg-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Scan size={16} style={{ color: "var(--brand-blue)" }} />
              <span style={{ fontWeight: 700, fontSize: "14px" }}>
                Radiology & Imaging Findings ({radiology.length})
              </span>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "4px 10px" }}
              onClick={addRadiologyRow}
            >
              <Plus size={13} />
              <span>Add Finding</span>
            </button>
          </div>

          <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
            {radiology.map((rad, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-page)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <input
                    className="table-input"
                    style={{ width: "45%", fontWeight: 700 }}
                    value={rad.bodyPart || ""}
                    placeholder="Body part / Region"
                    onChange={(e) =>
                      updateRadiologyField(idx, "bodyPart", e.target.value)
                    }
                  />

                  <button
                    type="button"
                    onClick={() => removeRadiologyRow(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-light)",
                      cursor: "pointer",
                    }}
                    aria-label="Remove finding"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Study Type:
                  </label>

                  <input
                    className="table-input"
                    value={rad.studyType || ""}
                    placeholder="X-Ray / MRI / CT / Ultrasound"
                    onChange={(e) =>
                      updateRadiologyField(idx, "studyType", e.target.value)
                    }
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Radiologist Observation:
                  </label>

                  <input
                    className="table-input"
                    value={rad.observation || ""}
                    placeholder="Only the observation written in the report"
                    onChange={(e) =>
                      updateRadiologyField(idx, "observation", e.target.value)
                    }
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Impression / Conclusion:
                  </label>

                  <input
                    className="table-input"
                    value={rad.impression || ""}
                    placeholder="Only the report's conclusion"
                    onChange={(e) =>
                      updateRadiologyField(idx, "impression", e.target.value)
                    }
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      Is Abnormal?
                    </label>

                    <select
                      className="table-input"
                      value={
                        rad.isAbnormal === true
                          ? "true"
                          : rad.isAbnormal === false
                            ? "false"
                            : ""
                      }
                      onChange={(e) =>
                        updateRadiologyField(
                          idx,
                          "isAbnormal",
                          e.target.value === ""
                            ? null
                            : e.target.value === "true"
                        )
                      }
                    >
                      <option value="">Unknown / Not specified</option>
                      <option value="true">Abnormal</option>
                      <option value="false">Normal</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      Severity
                    </label>

                    <select
                      className="table-input"
                      value={rad.severity || "unknown"}
                      onChange={(e) =>
                        updateRadiologyField(
                          idx,
                          "severity",
                          e.target.value
                        )
                      }
                    >
                      <option value="unknown">Unknown</option>
                      <option value="normal">Normal</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "16px",
          marginTop: "20px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Please verify all extracted details against the original document
          before continuing.
        </span>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onConfirm(tests, medicines, radiology)}
          disabled={
            isLoading ||
            (tests.length === 0 &&
              medicines.length === 0 &&
              radiology.length === 0)
          }
          style={{ padding: "12px 24px", fontSize: "14px" }}
        >
          {isLoading ? (
            <>
              <div
                className="spinner"
                style={{ borderLeftColor: "#ffffff" }}
              />
              <span>Analyzing with Gemini Flash...</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>Confirm & Decode Report</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
