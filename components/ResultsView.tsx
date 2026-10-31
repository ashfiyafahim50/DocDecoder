
"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  HelpCircle,
  Activity,
  FileCheck,
  Pill,
  Clock,
  HeartHandshake,
  ShieldAlert,
} from "lucide-react";
import { ExplainResponse } from "@/lib/schema";

interface ResultsViewProps {
  explanation: ExplainResponse;
  language: string;
  onReset: () => void;
}

export function ResultsView({
  explanation,
  language,
  onReset,
}: ResultsViewProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedQuestionIdx, setCopiedQuestionIdx] = useState<number | null>(null);
  const [allQuestionsCopied, setAllQuestionsCopied] = useState(false);

  const notSpecified = "Not specified in prescription";

  const getDisplayValue = (
    value: string | null | undefined,
    fallback = "Not specified"
  ) => {
    if (!value || !value.trim()) return fallback;

    if (
      value.toLowerCase() === "null" ||
      value.toLowerCase() === "undefined"
    ) {
      return fallback;
    }

    return value;
  };

  const toggleSpeech = () => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const textParts: string[] = [];

    if (explanation.summary) {
      textParts.push(explanation.summary);
    }

    if (explanation.risksAndAlerts?.length) {
      explanation.risksAndAlerts.forEach((alert) => {
        textParts.push(
          `Dhyan dein: ${alert.title}. ${alert.riskDetail}. ${alert.immediateAction}`
        );
      });
    }

    if (explanation.medicationRoutine?.length) {
      explanation.medicationRoutine.forEach((med) => {
        const medicineParts = [
          getDisplayValue(med.name, "Medicine name not specified"),
        ];

        if (med.dose) medicineParts.push(`Dose: ${med.dose}`);
        if (med.purpose && med.purpose !== notSpecified) {
          medicineParts.push(`Purpose: ${med.purpose}`);
        }

        if (med.whenToTake && med.whenToTake !== notSpecified) {
          medicineParts.push(`Timing: ${med.whenToTake}`);
        }

        if (med.mealTiming && med.mealTiming !== notSpecified) {
          medicineParts.push(`Meal relation: ${med.mealTiming}`);
        }

        if (med.howToTake && med.howToTake !== notSpecified) {
          medicineParts.push(`Instructions: ${med.howToTake}`);
        }

        if (med.duration) {
          medicineParts.push(`Duration: ${med.duration}`);
        }

        textParts.push(medicineParts.join(". "));
      });
    }

    if (textParts.length === 0) return;

    const utterance = new SpeechSynthesisUtterance(
      textParts.join(". ")
    );

    if (language === "hindi" || language === "hinglish") {
      utterance.lang = "hi-IN";
    } else {
      utterance.lang = "en-US";
    }

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  const copyQuestion = async (q: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(q);
      setCopiedQuestionIdx(idx);
      setTimeout(() => setCopiedQuestionIdx(null), 2000);
    } catch (error) {
      console.error("Unable to copy question:", error);
    }
  };

  const copyAllQuestions = async () => {
    try {
      const text = explanation.doctorQuestions
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n");

      await navigator.clipboard.writeText(text);

      setAllQuestionsCopied(true);
      setTimeout(() => setAllQuestionsCopied(false), 2000);
    } catch (error) {
      console.error("Unable to copy questions:", error);
    }
  };

  const getChipClass = (flag?: string | null) => {
    const f = flag?.toLowerCase().trim() || "";

    if (f === "normal" || f === "clear") {
      return "chip chip-normal";
    }

    if (
      f === "critical" ||
      f === "urgent" ||
      f.includes("fracture")
    ) {
      return "chip chip-critical";
    }

    if (
      f === "high" ||
      f === "low" ||
      f === "mild" ||
      f === "moderate" ||
      f === "abnormal"
    ) {
      return "chip chip-low";
    }

    return "chip chip-unknown";
  };

  return (
    <div style={{ maxWidth: "1050px", margin: "28px auto" }}>

      {/* 1. Risks and Alerts */}
      {explanation.risksAndAlerts?.length > 0 && (
        <div
          style={{
            marginBottom: "28px",
            display: "grid",
            gap: "12px",
          }}
        >
          {explanation.risksAndAlerts.map((alert, i) => (
            <div
              key={i}
              className="urgent-banner"
              style={{
                background:
                  alert.severity === "urgent"
                    ? "var(--status-danger-bg)"
                    : "var(--status-warn-bg)",
                borderColor:
                  alert.severity === "urgent"
                    ? "var(--status-danger-border)"
                    : "var(--status-warn-border)",
                color:
                  alert.severity === "urgent"
                    ? "var(--status-danger-text)"
                    : "var(--status-warn-text)",
              }}
            >
              {alert.severity === "urgent" ? (
                <ShieldAlert
                  size={26}
                  style={{ flexShrink: 0, marginTop: "2px" }}
                />
              ) : (
                <AlertTriangle
                  size={24}
                  style={{ flexShrink: 0, marginTop: "2px" }}
                />
              )}

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <h4 style={{ fontSize: "15.5px", fontWeight: 800 }}>
                    {alert.title}
                  </h4>

                  <span
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: 800,
                      background: "rgba(0,0,0,0.06)",
                    }}
                  >
                    {alert.severity}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "13.5px",
                    lineHeight: "1.5",
                    marginBottom: "6px",
                  }}
                >
                  {alert.riskDetail}
                </p>

                {alert.immediateAction && (
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 700,
                      padding: "6px 10px",
                      background: "rgba(255,255,255,0.6)",
                      borderRadius: "4px",
                      display: "inline-block",
                    }}
                  >
                    Next Step: {alert.immediateAction}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Report Summary */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "24px",
          marginBottom: "28px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileCheck
              size={20}
              style={{ color: "var(--brand-blue)" }}
            />

            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>
              Plain Language Report Summary
            </h3>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={toggleSpeech}
            style={{ fontSize: "12.5px", padding: "6px 12px" }}
          >
            {isPlayingAudio ? (
              <VolumeX size={15} />
            ) : (
              <Volume2 size={15} />
            )}

            <span>
              {isPlayingAudio ? "Stop Audio" : "Listen in Voice"}
            </span>
          </button>
        </div>

        <p
          className="editorial"
          style={{
            fontSize: "16.5px",
            lineHeight: "1.65",
            color: "var(--text-main)",
          }}
        >
          {explanation.summary || "No summary is available."}
        </p>

        {explanation.lifestyleAndCareNotes && (
          <div
            style={{
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: "13px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <HeartHandshake
              size={18}
              style={{
                color: "var(--brand-blue)",
                flexShrink: 0,
              }}
            />

            <div>
              <strong>Daily Care & Wellness:</strong>{" "}
              {explanation.lifestyleAndCareNotes}
            </div>
          </div>
        )}
      </div>

      {/* 3. Medication Details */}
      {explanation.medicationRoutine?.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <Pill
              size={20}
              style={{ color: "var(--brand-blue)" }}
            />

            <h4 style={{ fontSize: "17px", fontWeight: 800 }}>
              Prescribed Medicines ({explanation.medicationRoutine.length})
            </h4>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            {explanation.medicationRoutine.map((med, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Medicine name */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <h5
                        style={{
                          fontSize: "17px",
                          fontWeight: 800,
                          color: "var(--text-main)",
                        }}
                      >
                        {getDisplayValue(
                          med.name,
                          "Medicine name not specified"
                        )}
                      </h5>

                      {med.dose && (
                        <span
                          className="mono"
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--text-muted)",
                          }}
                        >
                          ({med.dose})
                        </span>
                      )}
                    </div>

                    {med.genericName && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-light)",
                          marginTop: "2px",
                        }}
                      >
                        Generic Name: {med.genericName}
                      </div>
                    )}
                  </div>

                  {med.duration && (
                    <span
                      style={{
                        padding: "4px 10px",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--brand-blue)",
                      }}
                    >
                      Duration: {med.duration}
                    </span>
                  )}
                </div>

                {/* Purpose */}
                <div
                  style={{
                    fontSize: "13.5px",
                    color: "var(--text-main)",
                    marginBottom: "14px",
                  }}
                >
                  <strong>Purpose:</strong>{" "}
                  {getDisplayValue(med.purpose, notSpecified)}
                </div>

                {/* Timing and instructions */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "12px",
                    background: "var(--bg-subtle)",
                    padding: "14px",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginBottom: "4px",
                      }}
                    >
                      <Clock size={12} />
                      Daily Timing
                    </div>

                    <div
                      style={{
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: "var(--brand-navy)",
                      }}
                    >
                      {getDisplayValue(med.whenToTake, notSpecified)}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        marginTop: "2px",
                      }}
                    >
                      Meal relation:{" "}
                      {getDisplayValue(med.mealTiming, notSpecified)}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        marginBottom: "4px",
                      }}
                    >
                      How to Take
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--text-main)",
                      }}
                    >
                      {getDisplayValue(med.howToTake, notSpecified)}
                    </div>
                  </div>
                </div>

                {/* Precautions */}
                {med.keyPrecautions && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--status-warn-text)",
                      background: "var(--status-warn-bg)",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      border: "1px solid var(--status-warn-border)",
                    }}
                  >
                    <strong>Precautions:</strong>{" "}
                    {med.keyPrecautions}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Test and Imaging Findings */}
      {explanation.findings?.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <Activity
              size={18}
              style={{ color: "var(--brand-navy)" }}
            />

            <h4 style={{ fontSize: "17px", fontWeight: 800 }}>
              Specific Findings & Values Explained (
              {explanation.findings.length})
            </h4>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {explanation.findings.map((f, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "15px" }}>
                      {getDisplayValue(
                        f.parameterOrArea,
                        "Finding not specified"
                      )}
                    </span>

                    <span className={getChipClass(f.flagOrStatus)}>
                      {getDisplayValue(f.flagOrStatus, "Unknown")}
                    </span>
                  </div>

                  {f.valueText && (
                    <span
                      className="mono"
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {f.valueText}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: "13.5px",
                    color: "var(--text-main)",
                    marginTop: "4px",
                  }}
                >
                  {getDisplayValue(
                    f.simpleExplanation,
                    "No explanation available."
                  )}
                </p>

                {f.clinicalSignificance && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-light)",
                      marginTop: "2px",
                    }}
                  >
                    • {f.clinicalSignificance}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Doctor Questions */}
      {explanation.doctorQuestions?.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <HelpCircle
                size={18}
                style={{ color: "var(--brand-blue)" }}
              />

              <h4 style={{ fontSize: "16px", fontWeight: 700 }}>
                Questions to Ask Your Doctor
              </h4>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={copyAllQuestions}
              style={{ fontSize: "12px", padding: "5px 10px" }}
            >
              {allQuestionsCopied ? (
                <Check size={13} />
              ) : (
                <Copy size={13} />
              )}

              <span>
                {allQuestionsCopied ? "Copied All!" : "Copy Checklist"}
              </span>
            </button>
          </div>

          <div>
            {explanation.doctorQuestions.map((q, idx) => (
              <div key={idx} className="question-card">
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--brand-blue)",
                      marginTop: "1px",
                    }}
                  >
                    Q{idx + 1}.
                  </span>

                  <span
                    style={{
                      fontSize: "13.5px",
                      color: "var(--text-main)",
                    }}
                  >
                    {q}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => copyQuestion(q, idx)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-light)",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                  title="Copy question"
                >
                  {copiedQuestionIdx === idx ? (
                    <Check size={14} style={{ color: "#10b981" }} />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Disclaimer */}
      <div
        style={{
          background: "var(--bg-subtle)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "16px",
          fontSize: "12px",
          color: "var(--text-muted)",
          marginBottom: "28px",
          lineHeight: "1.6",
        }}
      >
        <strong>Clinical Disclaimer:</strong>{" "}
        {explanation.disclaimer ||
          "Doc Decoder provides educational explanations only. It does not replace advice from a qualified healthcare professional. Always follow your treating physician's advice."}
      </div>

      {/* 7. Reset */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "40px",
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              "speechSynthesis" in window
            ) {
              window.speechSynthesis.cancel();
            }

            onReset();
          }}
          style={{ padding: "10px 20px" }}
        >
          <RotateCcw size={15} />
          <span>Decode Another Report or Prescription</span>
        </button>
      </div>
    </div>
  );
}
