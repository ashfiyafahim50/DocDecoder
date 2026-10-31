"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { DemoBar } from "@/components/DemoBar";
import { UploadZone } from "@/components/UploadZone";
import { VerificationTable } from "@/components/VerificationTable";
import { ResultsView } from "@/components/ResultsView";
import { DemoSample } from "@/lib/demo-data";
import { TestItem, MedicineItem, RadiologyFinding, ExplainResponse, DocType } from "@/lib/schema";
import { AlertCircle } from "lucide-react";

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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Primary Clinical Navigation Bar */}
      <Header language={language} onLanguageChange={setLanguage} />

      {/* Instant Demo Presets Bar */}
      <DemoBar
        activeSampleId={activeSampleId}
        onSelectSample={handleSelectSample}
        onClearSample={handleClearSample}
      />

      {/* Stepper Progress Bar */}
      <div className="stepper-nav">
        <div className="container" style={{ display: "flex", alignItems: "center" }}>
          <button
            onClick={() => setCurrentStep("1_UPLOAD")}
            className={`step-item ${currentStep === "1_UPLOAD" ? "active" : "completed"}`}
          >
            <span className="step-num">1</span>
            <span>Document Ingestion</span>
          </button>

          <div className="step-divider" />

          <button
            onClick={() => hasDataToVerify && setCurrentStep("2_VERIFY")}
            disabled={!hasDataToVerify}
            className={`step-item ${
              currentStep === "2_VERIFY"
                ? "active"
                : currentStep === "3_RESULTS"
                ? "completed"
                : ""
            }`}
          >
            <span className="step-num">2</span>
            <span>Human Verification</span>
          </button>

          <div className="step-divider" />

          <button
            disabled={!explanation}
            className={`step-item ${currentStep === "3_RESULTS" ? "active" : ""}`}
          >
            <span className="step-num">3</span>
            <span>Decoded Explanation</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1, padding: "32px 24px" }}>
        {/* Loading Progress Notification */}
        {isLoading && (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "20px 24px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="spinner" />
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>
                {loadingMessage}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Multimodal AI reasoning in memory • Clinical safety guardrails active
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
              borderRadius: "var(--radius-sm)",
              padding: "14px 18px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "13.5px",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--status-danger-text)",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Step 1: Upload */}
        {currentStep === "1_UPLOAD" && (
          <div>
            <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 10px" }}>
              <h2 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>
                Make Any Doctor Report Understandable.
              </h2>
              <p style={{ fontSize: "15px", color: "var(--text-muted)" }}>
                Upload a <strong>Doctor Prescription</strong>, <strong>Blood/Lab Report</strong>, or{" "}
                <strong>X-Ray / Scan</strong>. Doc Decoder explains what is risky, how and when to
                take every medicine, and questions to ask your doctor.
              </p>
            </div>

            <UploadZone onImageProcessed={handleImageProcessed} isLoading={isLoading} />

            <div
              style={{
                maxWidth: "760px",
                margin: "32px auto 0",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--brand-blue)", textTransform: "uppercase" }}>
                  Prescriptions
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, marginTop: "2px" }}>
                  Every Tablet Explained
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Tells you exactly <strong>How</strong> (with water, empty stomach) and{" "}
                  <strong>When</strong> (morning/night, before/after meals) to take each medicine.
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--brand-blue)", textTransform: "uppercase" }}>
                  Lab & X-Ray Reports
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, marginTop: "2px" }}>
                  Clear Risks & Red Flags
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Flags danger values or scan abnormalities immediately so you know what is risky
                  and what requires urgent doctor care.
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--brand-blue)", textTransform: "uppercase" }}>
                  Doctor Checklist
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, marginTop: "2px" }}>
                  Questions in Your Language
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Generates ready-to-ask questions in Hinglish, Hindi, or English to empower your
                  doctor consultation.
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
          padding: "20px 0",
          fontSize: "12px",
          color: "var(--text-light)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>Doc Decoder • Universal Clinical Report & Prescription Translator</div>
          <div style={{ display: "flex", gap: "16px" }}>
            <span>Stateless Monolith</span>
            <span>Zero Data Storage</span>
            <span>Powered by Gemini Multimodal Vision</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
