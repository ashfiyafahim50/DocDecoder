"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { DemoBar } from "@/components/DemoBar";
import { UploadZone } from "@/components/UploadZone";
import { VerificationTable } from "@/components/VerificationTable";
import { ResultsView } from "@/components/ResultsView";
import { DemoSample } from "@/lib/demo-data";
import { TestItem, MedicineItem, RadiologyFinding, ExplainResponse, DocType } from "@/lib/schema";
import {
  AlertCircle,
  FileText,
  Pill,
  Activity,
  Scan,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  UploadCloud,
  FileCheck2,
  Lock,
  Stethoscope,
  HelpCircle,
  Clock,
  RotateCcw,
  RefreshCw,
  HeartPulse,
} from "lucide-react";

type FlowStep = "1_UPLOAD" | "2_VERIFY" | "3_RESULTS";

export default function Home() {
  const [currentStep, setCurrentStep] = useState<FlowStep>("1_UPLOAD");
  const [language, setLanguage] = useState("hinglish");
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);

  // Document state
  const [docType, setDocType] = useState<DocType>("lab_report");
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [tests, setTests] = useState<TestItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [radiologyFindings, setRadiologyFindings] = useState<RadiologyFinding[]>([]);
  const [keyObservations, setKeyObservations] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Explanation output
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);

  // Loading & error
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Handle user upload of an image (Lab, Rx, X-Ray, etc.)
   */
  const handleImageProcessed = async (
    base64: string,
    preview: string,
    _stats: { originalKb: number; compressedKb: number }
  ) => {
    setActiveSampleId(null);
    setPreviewUrl(preview);
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingMessage("Reading medical document with Gemini Flash Vision...");

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: "image/jpeg",
          targetLanguage: language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to extract report data");
      }

      setDocType(data.docType || "lab_report");
      setDocumentTitle(data.documentTitle || "");
      setTests(data.tests || []);
      setMedicines(data.medicines || []);
      setRadiologyFindings(data.radiologyFindings || []);
      setKeyObservations(data.keyObservations || []);
      setWarnings(data.warnings || []);
      setCurrentStep("2_VERIFY");
    } catch (err: any) {
      console.error("Extraction error:", err);
      setErrorMessage(
        err.message || "Could not read report. Please ensure the document is clear and readable."
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  /**
   * 1-Click Golden Demo Sample selection
   */
  const handleSelectSample = (sample: DemoSample) => {
    setActiveSampleId(sample.id);
    setDocType(sample.docType);
    setDocumentTitle(sample.title);
    setTests(sample.tests);
    setMedicines(sample.medicines);
    setRadiologyFindings(sample.radiologyFindings || []);
    setKeyObservations([]);
    setWarnings([]);
    setErrorMessage(null);

    const cached = sample.cachedExplanation[language] || sample.cachedExplanation["hinglish"];
    if (cached) {
      setExplanation(cached);
    } else {
      setExplanation(null);
    }

    setCurrentStep("2_VERIFY");
  };

  const handleClearSample = () => {
    setActiveSampleId(null);
    setTests([]);
    setMedicines([]);
    setRadiologyFindings([]);
    setExplanation(null);
    setCurrentStep("1_UPLOAD");
  };

  /**
   * Step 2 -> Step 3: Run Pass 2 (Universal Explanation)
   */
  const handleConfirmVerification = async (
    verifiedTests: TestItem[],
    verifiedMedicines: MedicineItem[],
    verifiedRadiology: RadiologyFinding[]
  ) => {
    setTests(verifiedTests);
    setMedicines(verifiedMedicines);
    setRadiologyFindings(verifiedRadiology);
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingMessage("Synthesizing plain explanation, medication timings & risks...");

    // Fast-path for preset samples if cached
    if (activeSampleId) {
      const sample = (await import("@/lib/demo-data")).DEMO_SAMPLES.find(
        (s) => s.id === activeSampleId
      );
      if (sample) {
        const cached =
          sample.cachedExplanation[language] || sample.cachedExplanation["hinglish"];
        if (cached) {
          setTimeout(() => {
            setExplanation(cached);
            setIsLoading(false);
            setCurrentStep("3_RESULTS");
          }, 500);
          return;
        }
      }
    }

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          language,
          documentTitle,
          tests: verifiedTests,
          medicines: verifiedMedicines,
          radiologyFindings: verifiedRadiology,
          keyObservations,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate explanation");
      }

      setExplanation(data);
      setCurrentStep("3_RESULTS");
    } catch (err: any) {
      console.error("Explanation error:", err);
      setErrorMessage(
        err.message || "Failed to decode findings. Check server connection or API key."
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const resetAll = () => {
    setCurrentStep("1_UPLOAD");
    setTests([]);
    setMedicines([]);
    setRadiologyFindings([]);
    setKeyObservations([]);
    setWarnings([]);
    setPreviewUrl(null);
    setExplanation(null);
    setActiveSampleId(null);
    setErrorMessage(null);
  };

  const hasDataToVerify =
    tests.length > 0 || medicines.length > 0 || radiologyFindings.length > 0;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-page)" }}>
      {/* Primary Clinical Navigation Bar */}
      <Header language={language} onLanguageChange={setLanguage} />

      {/* Instant Demo Presets Bar */}
      <DemoBar
        activeSampleId={activeSampleId}
        onSelectSample={handleSelectSample}
        onClearSample={handleClearSample}
      />

      {/* Modern Stepper Progress Bar */}
      <div
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "12px 0",
        }}
      >
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
            {/* Step 1 */}
            <button
              onClick={() => setCurrentStep("1_UPLOAD")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "9999px",
                border: currentStep === "1_UPLOAD" ? "1.5px solid var(--brand-blue)" : "1px solid var(--border-subtle)",
                background: currentStep === "1_UPLOAD" ? "var(--brand-light)" : "transparent",
                color: currentStep === "1_UPLOAD" ? "var(--brand-blue)" : "var(--text-muted)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: currentStep === "1_UPLOAD" ? "var(--brand-blue)" : "var(--bg-subtle)",
                  color: currentStep === "1_UPLOAD" ? "#ffffff" : "var(--text-muted)",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                1
              </span>
              <span>1. Upload Document</span>
            </button>

            <span style={{ color: "var(--text-light)", fontSize: "14px" }}>›</span>

            {/* Step 2 */}
            <button
              onClick={() => hasDataToVerify && setCurrentStep("2_VERIFY")}
              disabled={!hasDataToVerify}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "9999px",
                border: currentStep === "2_VERIFY" ? "1.5px solid var(--brand-blue)" : "1px solid var(--border-subtle)",
                background: currentStep === "2_VERIFY" ? "var(--brand-light)" : "transparent",
                color: currentStep === "2_VERIFY" ? "var(--brand-blue)" : !hasDataToVerify ? "var(--text-light)" : "var(--text-muted)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: hasDataToVerify ? "pointer" : "not-allowed",
                opacity: hasDataToVerify ? 1 : 0.6,
                transition: "all 0.15s ease",
              }}
            >
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: currentStep === "2_VERIFY" ? "var(--brand-blue)" : "var(--bg-subtle)",
                  color: currentStep === "2_VERIFY" ? "#ffffff" : "var(--text-muted)",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                2
              </span>
              <span>2. Review & Verify</span>
            </button>

            <span style={{ color: "var(--text-light)", fontSize: "14px" }}>›</span>

            {/* Step 3 */}
            <button
              onClick={() => explanation && setCurrentStep("3_RESULTS")}
              disabled={!explanation}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "9999px",
                border: currentStep === "3_RESULTS" ? "1.5px solid var(--brand-blue)" : "1px solid var(--border-subtle)",
                background: currentStep === "3_RESULTS" ? "var(--brand-light)" : "transparent",
                color: currentStep === "3_RESULTS" ? "var(--brand-blue)" : !explanation ? "var(--text-light)" : "var(--text-muted)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: explanation ? "pointer" : "not-allowed",
                opacity: explanation ? 1 : 0.6,
                transition: "all 0.15s ease",
              }}
            >
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: currentStep === "3_RESULTS" ? "var(--brand-blue)" : "var(--bg-subtle)",
                  color: currentStep === "3_RESULTS" ? "#ffffff" : "var(--text-muted)",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                3
              </span>
              <span>3. Plain-Language Explanation</span>
            </button>
          </div>

          {currentStep !== "1_UPLOAD" && (
            <button
              onClick={resetAll}
              className="btn btn-secondary"
              style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <RotateCcw size={13} />
              <span>Start Over</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1, padding: "36px 24px" }}>
        {/* Loading Progress Notification */}
        {isLoading && (
          <div
            style={{
              background: "linear-gradient(135deg, var(--bg-card) 0%, var(--brand-light) 100%)",
              border: "1px solid var(--brand-blue)",
              borderRadius: "var(--radius-md)",
              padding: "20px 24px",
              marginBottom: "28px",
              display: "flex",
              alignItems: "center",
              gap: "18px",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div className="spinner" style={{ width: "24px", height: "24px", borderWidth: "2.5px" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{loadingMessage}</span>
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Gemini Vision AI reasoning • Applying deterministic safety checks & reference ranges
              </div>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            style={{
              background: "var(--status-danger-bg)",
              border: "1px solid var(--status-danger-border)",
              color: "var(--status-danger-text)",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              marginBottom: "28px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: "14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, lineHeight: 1.5 }}>
              <strong>Notice: </strong>
              {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--status-danger-text)",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "16px",
                padding: "4px 8px",
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Step 1: Upload */}
        {currentStep === "1_UPLOAD" && (
          <div>
            {/* Hero Header */}
            <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 32px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 14px",
                  borderRadius: "9999px",
                  background: "var(--brand-light)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--brand-blue)",
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "16px",
                }}
              >
                <Sparkles size={14} />
                <span>AI Clinical Report & Prescription Decoder</span>
              </div>

              <h1
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  lineHeight: 1.25,
                  letterSpacing: "-0.03em",
                  marginBottom: "12px",
                  color: "var(--text-main)",
                }}
              >
                Make Any Medical Document{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, var(--brand-blue) 0%, #06b6d4 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Clear & Understandable
                </span>
              </h1>

              <p
                style={{
                  fontSize: "16px",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                  maxWidth: "660px",
                  margin: "0 auto 20px",
                }}
              >
                Upload any <strong>Doctor Prescription</strong>, <strong>Lab Report</strong>, or{" "}
                <strong>X-Ray / Scan</strong>. Doc Decoder explains medication schedules, flags dangerous
                values, and prepares doctor questions in your language.
              </p>

              {/* Trust Badges */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "20px",
                  flexWrap: "wrap",
                  fontSize: "12.5px",
                  color: "var(--text-muted)",
                  padding: "8px 0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck size={16} style={{ color: "#10b981" }} />
                  <span>100% Stateless & Private</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ZapIcon />
                  <span>Multimodal Gemini Vision</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <HeartPulse size={16} style={{ color: "#ef4444" }} />
                  <span>Deterministic Safety Flags</span>
                </div>
              </div>
            </div>

            {/* Upload Zone Card */}
            <div style={{ maxWidth: "840px", margin: "0 auto" }}>
              <UploadZone onImageProcessed={handleImageProcessed} isLoading={isLoading} />
            </div>

            {/* 4 Feature Highlights Grid */}
            <div
              style={{
                maxWidth: "880px",
                margin: "40px auto 0",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "18px",
              }}
            >
              {/* Feature 1 */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  boxShadow: "var(--shadow-sm)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(59, 130, 246, 0.1)",
                    color: "var(--brand-blue)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                  }}
                >
                  <Pill size={18} />
                </div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
                  Medicine Timings
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Decodes exact timings: morning, afternoon, night, before/after meals, and cautions.
                </div>
              </div>

              {/* Feature 2 */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                  }}
                >
                  <Activity size={18} />
                </div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
                  Lab Danger Flags
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Compares values against reference ranges and highlights out-of-range critical risks.
                </div>
              </div>

              {/* Feature 3 */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(139, 92, 246, 0.1)",
                    color: "#8b5cf6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                  }}
                >
                  <Scan size={18} />
                </div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
                  Scans & Imaging
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Translates X-Ray, CT scan, and MRI medical jargon into simple, plain human language.
                </div>
              </div>

              {/* Feature 4 */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                  }}
                >
                  <HelpCircle size={18} />
                </div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
                  Doctor Checklist
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Generates ready-to-ask questions in Hinglish, Hindi, or English for your next doctor visit.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Verification Table */}
        {currentStep === "2_VERIFY" && (
          <VerificationTable
            docType={docType}
            tests={tests}
            medicines={medicines}
            radiologyFindings={radiologyFindings}
            warnings={warnings}
            previewUrl={previewUrl}
            onConfirm={handleConfirmVerification}
            isLoading={isLoading}
          />
        )}

        {/* Step 3: Decoded Results */}
        {currentStep === "3_RESULTS" && explanation && (
          <ResultsView
            explanation={explanation}
            language={language}
            onReset={resetAll}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
          padding: "24px 0",
          fontSize: "12.5px",
          color: "var(--text-muted)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Stethoscope size={16} style={{ color: "var(--brand-blue)" }} />
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Doc Decoder</span>
            <span>• Human-in-the-Loop Clinical Translator</span>
          </div>
          <div style={{ display: "flex", gap: "20px", fontSize: "12px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Lock size={13} style={{ color: "#10b981" }} />
              Zero Data Storage
            </span>
            <span>•</span>
            <span>Multimodal Vision</span>
            <span>•</span>
            <span>Educational Use Only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ZapIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
